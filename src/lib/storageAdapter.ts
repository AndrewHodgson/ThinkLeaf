import type { Table } from "dexie";
import { db, type AssetRecord } from "@/lib/db";
import type { Folder, Page, Profile, Project, WorkspaceData } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Session asset cache
// ---------------------------------------------------------------------------

// Tracks which asset ids have been written to IDB this session — avoids
// re-serializing large data URLs on every debounced autosave tick.
const savedAssetIds = new Set<string>();

// ---------------------------------------------------------------------------
// Sync helper types
// ---------------------------------------------------------------------------

type SyncableTables = {
  profiles: Profile;
  projects: Project;
  folders: Folder;
  pages: Page;
  assets: AssetRecord;
};

type SyncedRecordRef = string | { id: string; updatedAt?: string };

// Key prefix for per-table pull watermarks stored in IDB settings.
const LAST_PULLED_AT_PREFIX = "sync.lastPulledAt.";

// ---------------------------------------------------------------------------
// Core read/write
// ---------------------------------------------------------------------------

export async function saveAsset(asset: AssetRecord): Promise<void> {
  await db.assets.put(asset);
  savedAssetIds.add(asset.id);
}

export async function loadAllFromDB(): Promise<WorkspaceData | null> {
  const [profiles, projects, folders, rawPages, assets, activeProfileIdRow, recentPageIdsRow] =
    await Promise.all([
      db.profiles.toArray(),
      db.projects.toArray(),
      db.folders.toArray(),
      db.pages.toArray(),
      db.assets.toArray(),
      db.settings.get("activeProfileId"),
      db.settings.get("recentPageIds"),
    ]);

  if (!profiles.length && !projects.length && !rawPages.length) {
    return null;
  }

  // Pre-populate session cache so unchanged assets aren't re-written.
  for (const asset of assets) {
    savedAssetIds.add(asset.id);
  }

  const assetById = new Map<string, string>(assets.map((a) => [a.id, a.data]));

  // Restore imageDataUrl from assets table so React state can render images.
  const pages = rawPages.map((page) => ({
    ...page,
    canvasObjects: page.canvasObjects.map((obj) => {
      if (obj.assetId && !obj.imageDataUrl) {
        const data = assetById.get(obj.assetId);
        if (data) return { ...obj, imageDataUrl: data };
      }
      return obj;
    }),
  }));

  return {
    profiles,
    activeProfileId: (activeProfileIdRow?.value as string) ?? profiles[0]?.id ?? "",
    projects,
    folders,
    pages,
    recentPageIds: (recentPageIdsRow?.value as string[]) ?? [],
  };
}

/**
 * Persist the entire workspace to IDB using upsert (bulkPut).
 *
 * Upsert preserves syncedAt on records the sync engine has already marked —
 * React state carries the syncedAt value from load time, and the sync engine
 * updates IDB directly via markRecordsSynced.  If the sync engine later also
 * updates React state, syncedAt will round-trip correctly; until then the
 * write is idempotent (same value overwrites same value for unsync'd records).
 *
 * Returns a mapping of { canvasObjectId → assetId } for any canvas objects
 * that had imageDataUrl but no assetId, so the caller can stamp assetId back
 * onto React state and skip re-creating those asset records next tick.
 */
export async function saveAllToDB(data: WorkspaceData): Promise<Record<string, string>> {
  const now = new Date().toISOString();
  const newAssetMappings: Record<string, string> = {};
  const newAssets: AssetRecord[] = [];

  // First pass: collect new asset records and build pages stripped of imageDataUrl.
  const strippedPages = data.pages.map((page) => ({
    ...page,
    canvasObjects: page.canvasObjects.map((obj) => {
      if (!obj.imageDataUrl) return obj;

      let { assetId } = obj;

      if (!assetId) {
        // Deterministic id for objects coming from Phase 1A or import (idempotent on retry).
        assetId = `asset-${obj.id}`;
        newAssetMappings[obj.id] = assetId;
      }

      if (!savedAssetIds.has(assetId)) {
        newAssets.push({
          id: assetId,
          mimeType: "image/jpeg",
          data: obj.imageDataUrl,
          version: 1,
          deletedAt: null,
          syncedAt: null,
          createdAt: now,
          updatedAt: now,
        });
        savedAssetIds.add(assetId);
      }

      // Strip imageDataUrl from the record stored in IDB pages table.
      const { imageDataUrl: _stripped, ...rest } = obj;
      return { ...rest, assetId };
    }),
  }));

  await db.transaction("rw", [db.profiles, db.projects, db.folders, db.pages, db.settings, db.assets], async () => {
    // bulkPut (upsert) — soft-deleted records stay in IDB, syncedAt is preserved.
    if (data.profiles.length) await db.profiles.bulkPut(data.profiles);
    if (data.projects.length) await db.projects.bulkPut(data.projects);
    if (data.folders.length) await db.folders.bulkPut(data.folders);
    if (strippedPages.length) await db.pages.bulkPut(strippedPages);

    await db.settings.put({ key: "activeProfileId", value: data.activeProfileId });
    await db.settings.put({ key: "recentPageIds", value: data.recentPageIds });

    // bulkPut (not bulkAdd) so a retry after a partial failure just overwrites.
    if (newAssets.length) await db.assets.bulkPut(newAssets);
  });

  return newAssetMappings;
}

/**
 * Wipe all workspace tables and the session asset cache.
 *
 * Used by explicit reset/clear flows (corrupted-data recovery, beta workspace
 * reset).  The caller should await this before updating React state so the
 * subsequent autosave writes into an empty IDB rather than merging with stale
 * records.
 */
export async function clearAllFromDB(): Promise<void> {
  await db.transaction("rw", [db.profiles, db.projects, db.folders, db.pages, db.assets], async () => {
    await db.profiles.clear();
    await db.projects.clear();
    await db.folders.clear();
    await db.pages.clear();
    await db.assets.clear();
  });
  // Reset the session cache so assets get re-written after the clear.
  savedAssetIds.clear();
}

// ---------------------------------------------------------------------------
// Sync helpers (used by Phase 3D sync engine — no network calls here)
// ---------------------------------------------------------------------------

/**
 * Returns records from `tableName` that have not yet been pushed to the cloud:
 * either never synced (syncedAt === null) or updated since last sync.
 */
export async function getDirtyRecords<K extends keyof SyncableTables>(
  tableName: K,
): Promise<SyncableTables[K][]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = db[tableName] as Table<any>;
  return table
    .filter((r: { syncedAt: string | null; updatedAt: string }) => r.syncedAt === null || r.updatedAt > r.syncedAt)
    .toArray();
}

/**
 * Stamps syncedAt on the given record IDs in IDB after a successful cloud push.
 * Does NOT update React state — the sync engine is responsible for that if needed.
 */
export async function markRecordsSynced<K extends keyof SyncableTables>(
  tableName: K,
  records: SyncedRecordRef[],
  syncedAt: string,
): Promise<void> {
  if (!records.length) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = db[tableName] as Table<any>;
  const refs = records.map((record) => (typeof record === "string" ? { id: record } : record));
  const expectedUpdatedAtById = new Map(
    refs
      .filter((record): record is { id: string; updatedAt: string } => typeof record.updatedAt === "string")
      .map((record) => [record.id, record.updatedAt]),
  );

  await table.where("id").anyOf(refs.map((record) => record.id)).modify((record) => {
    const expectedUpdatedAt = expectedUpdatedAtById.get(record.id);
    if (expectedUpdatedAt !== undefined && record.updatedAt !== expectedUpdatedAt) {
      return;
    }
    record.syncedAt = syncedAt;
  });
}

/**
 * Returns the ISO timestamp of the last successful pull from the cloud for
 * `tableName`, or null if this table has never been pulled.
 */
export async function getLastPulledAt(tableName: keyof SyncableTables): Promise<string | null> {
  const row = await db.settings.get(`${LAST_PULLED_AT_PREFIX}${tableName}`);
  return typeof row?.value === "string" ? row.value : null;
}

/**
 * Stores the pull watermark for `tableName` after a successful cloud pull.
 */
export async function setLastPulledAt(tableName: keyof SyncableTables, value: string): Promise<void> {
  await db.settings.put({ key: `${LAST_PULLED_AT_PREFIX}${tableName}`, value });
}

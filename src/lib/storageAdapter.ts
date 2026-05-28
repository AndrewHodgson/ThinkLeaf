import { db, type AssetRecord } from "@/lib/db";
import type { WorkspaceData } from "@/types/workspace";

// Tracks which asset ids have been written to IDB this session — avoids
// re-serializing large data URLs on every debounced autosave tick.
const savedAssetIds = new Set<string>();

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
 * Persist the entire workspace to IDB.
 *
 * Returns a mapping of { canvasObjectId → assetId } for any canvas objects
 * that had imageDataUrl but no assetId — so the caller can stamp assetId back
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
    await db.profiles.clear();
    await db.projects.clear();
    await db.folders.clear();
    await db.pages.clear();

    if (data.profiles.length) await db.profiles.bulkAdd(data.profiles);
    if (data.projects.length) await db.projects.bulkAdd(data.projects);
    if (data.folders.length) await db.folders.bulkAdd(data.folders);
    if (strippedPages.length) await db.pages.bulkAdd(strippedPages);

    await db.settings.put({ key: "activeProfileId", value: data.activeProfileId });
    await db.settings.put({ key: "recentPageIds", value: data.recentPageIds });

    // bulkPut (not bulkAdd) so a retry after a partial failure just overwrites.
    if (newAssets.length) await db.assets.bulkPut(newAssets);
  });

  return newAssetMappings;
}

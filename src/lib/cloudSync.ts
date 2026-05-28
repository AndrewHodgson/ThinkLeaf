import { db, type AssetRecord } from "@/lib/db";
import { clearAllFromDB, markRecordsSynced, setLastPulledAt } from "@/lib/storageAdapter";
import { supabase } from "@/lib/supabase";
import type { Folder, Page, Profile, Project } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadResult = {
  uploaded: number;
  assetsUploaded: number;
  error: string | null;
};

export type LocalDataSummary = {
  hasData: boolean;
  profiles: number;
  projects: number;
  pages: number;
};

const EPOCH = "1970-01-01T00:00:00.000Z";

type SyncRecord = { id: string; updatedAt: string; syncedAt: string | null };

function maxIso(...values: Array<string | null | undefined>): string {
  let maxValue = EPOCH;
  let maxTime = Date.parse(EPOCH);
  for (const value of values) {
    if (!value) continue;
    const time = Date.parse(value);
    if (Number.isFinite(time) && time >= maxTime) {
      maxTime = time;
      maxValue = value;
    }
  }
  return maxValue;
}

function withPulledSyncedAt<T extends SyncRecord>(records: T[], syncedAt: string): T[] {
  return records.map((record) => ({
    ...record,
    syncedAt: maxIso(record.updatedAt, syncedAt),
  }));
}

async function setWatermarkToMaxUpdatedAt(tableName: "profiles" | "projects" | "folders" | "pages" | "assets", records: Array<{ updatedAt: string }>) {
  if (!records.length) return;
  await setLastPulledAt(tableName, maxIso(...records.map((record) => record.updatedAt)));
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/**
 * True if the signed-in user has any non-deleted records in the cloud profiles
 * table.  Soft-deleted tombstones are excluded so a reset workspace doesn't
 * look like it "has data" and trigger a spurious reconciliation prompt.
 */
export async function checkCloudHasData(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

/** Counts non-deleted local records to decide whether a migration prompt is useful. */
export async function checkLocalHasData(): Promise<LocalDataSummary> {
  const [profileCount, projectCount, pageCount] = await Promise.all([
    db.profiles.filter((r) => !r.deletedAt).count(),
    db.projects.filter((r) => !r.deletedAt).count(),
    db.pages.filter((r) => !r.deletedAt).count(),
  ]);
  return {
    hasData: pageCount > 0,
    profiles: profileCount,
    projects: projectCount,
    pages: pageCount,
  };
}

// ---------------------------------------------------------------------------
// Reset helper — soft-delete all cloud records so new devices don't resurface them
// ---------------------------------------------------------------------------

/**
 * Marks every non-deleted workspace record in Supabase as soft-deleted.
 * Called before Reset Beta Workspace (when signed in) so that other devices
 * pulling from cloud don't see the old workspace after the local reset.
 *
 * Uses UPDATE (not upsert) so only existing cloud rows are touched.
 * Sets deleted_at = updated_at = synced_at = now so that any device that
 * subsequently pulls the tombstones sees them as already-synced (not dirty).
 */
export async function softDeleteAllCloudRecords(userId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase not configured" };

  const now = new Date().toISOString();
  const tombstone = { deleted_at: now, updated_at: now, synced_at: now };

  const [e1, e2, e3, e4] = await Promise.all([
    supabase.from("profiles").update(tombstone).eq("user_id", userId).is("deleted_at", null)
      .then((r) => r.error),
    supabase.from("projects").update(tombstone).eq("user_id", userId).is("deleted_at", null)
      .then((r) => r.error),
    supabase.from("folders").update(tombstone).eq("user_id", userId).is("deleted_at", null)
      .then((r) => r.error),
    supabase.from("pages").update(tombstone).eq("user_id", userId).is("deleted_at", null)
      .then((r) => r.error),
  ]);

  const firstError = e1 ?? e2 ?? e3 ?? e4;
  if (firstError) {
    console.warn("[ThinkLeaf] softDeleteAllCloudRecords failed:", firstError.message);
    return { error: firstError.message };
  }

  console.log("[ThinkLeaf] Cloud workspace soft-deleted before reset (user:", userId, ")");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Bulk-uploads all non-deleted local workspace records and asset blobs to Supabase,
 * then stamps syncedAt in IDB.
 *
 * Reads directly from IDB (last autosaved state) — canvasObjects are already
 * stripped of imageDataUrl by saveAllToDB, so canvas data is safe to send as JSON.
 *
 * Individual asset failures are logged but do not abort the overall upload; the
 * rest of the workspace still lands in the cloud.
 *
 * Note: markRecordsSynced only updates IDB. The next autosave will overwrite
 * syncedAt back to null (from React state) until Phase 3D syncs it properly.
 * checkCloudHasData is the authoritative signal that migration already happened.
 */
export async function uploadWorkspaceToCloud(userId: string): Promise<UploadResult> {
  if (!supabase) return { uploaded: 0, assetsUploaded: 0, error: "Supabase not configured" };

  const now = new Date().toISOString();

  const [profiles, projects, folders, pages, assets] = await Promise.all([
    db.profiles.filter((r) => !r.deletedAt).toArray(),
    db.projects.filter((r) => !r.deletedAt).toArray(),
    db.folders.filter((r) => !r.deletedAt).toArray(),
    db.pages.filter((r) => !r.deletedAt).toArray(),
    db.assets.filter((r) => !r.deletedAt).toArray(),
  ]);

  // Upload tables in dependency order (profiles first, pages last).
  if (profiles.length) {
    const { error } = await supabase.from("profiles").upsert(profiles.map((r) => toCloudProfile(r, userId)));
    if (error) return { uploaded: 0, assetsUploaded: 0, error: error.message };
  }
  if (projects.length) {
    const { error } = await supabase.from("projects").upsert(projects.map((r) => toCloudProject(r, userId)));
    if (error) return { uploaded: 0, assetsUploaded: 0, error: error.message };
  }
  if (folders.length) {
    const { error } = await supabase.from("folders").upsert(folders.map((r) => toCloudFolder(r, userId)));
    if (error) return { uploaded: 0, assetsUploaded: 0, error: error.message };
  }
  if (pages.length) {
    const { error } = await supabase.from("pages").upsert(pages.map((r) => toCloudPage(r, userId)));
    if (error) return { uploaded: 0, assetsUploaded: 0, error: error.message };
  }

  // Upload asset blobs to Storage + upsert metadata rows.
  let assetsUploaded = 0;
  const uploadedAssets: AssetRecord[] = [];
  for (const asset of assets) {
    const { error } = await uploadAssetToCloud(userId, asset);
    if (error) {
      console.warn(`[ThinkLeaf] Asset ${asset.id} upload skipped:`, error);
    } else {
      assetsUploaded++;
      uploadedAssets.push(asset);
    }
  }

  // Stamp syncedAt in IDB so getDirtyRecords won't re-queue these immediately.
  await Promise.all([
    markRecordsSynced("profiles", profiles.map((r) => ({ id: r.id, updatedAt: r.updatedAt })), now),
    markRecordsSynced("projects", projects.map((r) => ({ id: r.id, updatedAt: r.updatedAt })), now),
    markRecordsSynced("folders", folders.map((r) => ({ id: r.id, updatedAt: r.updatedAt })), now),
    markRecordsSynced("pages", pages.map((r) => ({ id: r.id, updatedAt: r.updatedAt })), now),
    markRecordsSynced("assets", uploadedAssets.map((r) => ({ id: r.id, updatedAt: r.updatedAt })), now),
  ]);

  return {
    uploaded: profiles.length + projects.length + folders.length + pages.length,
    assetsUploaded,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Asset blob upload
// ---------------------------------------------------------------------------

async function uploadAssetToCloud(userId: string, asset: AssetRecord): Promise<{ error: string | null }> {
  if (!supabase) return { error: "not configured" };

  const comma = asset.data.indexOf(",");
  if (comma === -1) return { error: "invalid data URL" };

  let bytes: Uint8Array;
  try {
    const binary = atob(asset.data.slice(comma + 1));
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  } catch {
    return { error: "failed to decode asset" };
  }

  const blob = new Blob([bytes], { type: asset.mimeType });

  const { error: storageError } = await supabase.storage
    .from("assets")
    .upload(`${userId}/${asset.id}`, blob, { upsert: true, contentType: asset.mimeType });

  if (storageError) return { error: storageError.message };

  const { error: metaError } = await supabase.from("assets").upsert({
    id: asset.id,
    user_id: userId,
    mime_type: asset.mimeType,
    version: asset.version,
    deleted_at: asset.deletedAt,
    synced_at: asset.syncedAt,
    created_at: asset.createdAt,
    updated_at: asset.updatedAt,
  });

  return { error: metaError?.message ?? null };
}

// ---------------------------------------------------------------------------
// Record mappers (local camelCase → cloud snake_case)
// ---------------------------------------------------------------------------

function toCloudProfile(r: Profile, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    name: r.name,
    version: r.version,
    deleted_at: r.deletedAt,
    synced_at: r.syncedAt,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function toCloudProject(r: Project, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    profile_id: r.profileId,
    name: r.name,
    color: r.color ?? null,
    version: r.version,
    deleted_at: r.deletedAt,
    synced_at: r.syncedAt,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function toCloudFolder(r: Folder, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    profile_id: r.profileId,
    project_id: r.projectId,
    parent_folder_id: r.parentFolderId ?? null,
    name: r.name,
    color: r.color ?? null,
    version: r.version,
    deleted_at: r.deletedAt,
    synced_at: r.syncedAt,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function toCloudPage(r: Page, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    profile_id: r.profileId,
    project_id: r.projectId,
    folder_id: r.folderId ?? null,
    title: r.title,
    body: r.body,
    note_date: r.noteDate,
    canvas_view_state: r.canvasViewState,
    canvas_objects: r.canvasObjects,
    tags: r.tags,
    is_favorite: r.isFavorite,
    version: r.version,
    deleted_at: r.deletedAt,
    synced_at: r.syncedAt,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Linked userId helpers  (persistent account binding stored in IDB settings)
// ---------------------------------------------------------------------------

export async function getLinkedUserId(): Promise<string | null> {
  const row = await db.settings.get("sync.linkedUserId");
  return typeof row?.value === "string" ? row.value : null;
}

export async function setLinkedUserId(userId: string): Promise<void> {
  await db.settings.put({ key: "sync.linkedUserId", value: userId });
}

// ---------------------------------------------------------------------------
// Full cloud download
// ---------------------------------------------------------------------------

export type DownloadResult = {
  records: { profiles: Profile[]; projects: Project[]; folders: Folder[]; pages: Page[] };
  assets: Array<{ id: string; data: string }>;
  error: string | null;
};

/**
 * Downloads ALL records and assets for userId from Supabase, writes them to IDB
 * (bulkPut — cloud rows win over local by primary key), advances pull watermarks,
 * and returns the data so React state can be updated without a DB round-trip.
 */
export async function downloadFullWorkspaceFromCloud(userId: string): Promise<DownloadResult> {
  if (!supabase) {
    return { records: { profiles: [], projects: [], folders: [], pages: [] }, assets: [], error: "Supabase not configured" };
  }

  const empty = { profiles: [] as Profile[], projects: [] as Project[], folders: [] as Folder[], pages: [] as Page[] };

  const [
    { data: rawProfiles, error: e1 },
    { data: rawProjects, error: e2 },
    { data: rawFolders, error: e3 },
    { data: rawPages, error: e4 },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId),
    supabase.from("projects").select("*").eq("user_id", userId),
    supabase.from("folders").select("*").eq("user_id", userId),
    supabase.from("pages").select("*").eq("user_id", userId),
  ]);

  const firstError = e1 ?? e2 ?? e3 ?? e4;
  if (firstError) return { records: empty, assets: [], error: firstError.message };

  const downloadedAt = new Date().toISOString();
  const profiles = withPulledSyncedAt((rawProfiles ?? []).map(fromCloudProfile), downloadedAt);
  const projects = withPulledSyncedAt((rawProjects ?? []).map(fromCloudProject), downloadedAt);
  const folders = withPulledSyncedAt((rawFolders ?? []).map(fromCloudFolder), downloadedAt);
  const pages = withPulledSyncedAt((rawPages ?? []).map(fromCloudPage), downloadedAt);

  // Write to IDB — cloud records win (bulkPut overwrites by primary key).
  await Promise.all([
    db.profiles.bulkPut(profiles),
    db.projects.bulkPut(projects),
    db.folders.bulkPut(folders),
    db.pages.bulkPut(pages),
  ]);

  // Advance pull watermarks only to the newest updatedAt actually downloaded.
  await Promise.all([
    setWatermarkToMaxUpdatedAt("profiles", profiles),
    setWatermarkToMaxUpdatedAt("projects", projects),
    setWatermarkToMaxUpdatedAt("folders", folders),
    setWatermarkToMaxUpdatedAt("pages", pages),
  ]);

  // Download asset blobs; skip any already cached in IDB.
  const { data: assetMeta, error: assetMetaError } = await supabase
    .from("assets")
    .select("id, mime_type, version, deleted_at, created_at, updated_at")
    .eq("user_id", userId);

  if (assetMetaError) {
    console.warn("[ThinkLeaf] Asset metadata fetch failed during hydration:", assetMetaError.message);
  }

  const assets: Array<{ id: string; data: string }> = [];
  for (const meta of (assetMeta ?? [])) {
    const cached = await db.assets.get(meta.id as string);
    if (cached?.data) {
      assets.push({ id: meta.id as string, data: cached.data });
      continue;
    }

    const { data: blob, error: blobError } = await supabase.storage
      .from("assets")
      .download(`${userId}/${meta.id as string}`);

    if (blobError || !blob) {
      console.warn(`[ThinkLeaf] Asset ${meta.id as string} download failed:`, blobError?.message);
      continue;
    }

    const dataUrl = await blobToDataUrl(blob);
    await db.assets.put({
      id: meta.id as string,
      mimeType: meta.mime_type as string,
      data: dataUrl,
      version: (meta.version as number) ?? 1,
      deletedAt: (meta.deleted_at as string | null) ?? null,
      syncedAt: maxIso((meta.updated_at as string) ?? downloadedAt, downloadedAt),
      createdAt: (meta.created_at as string) ?? downloadedAt,
      updatedAt: (meta.updated_at as string) ?? downloadedAt,
    });
    assets.push({ id: meta.id as string, data: dataUrl });
  }

  await setWatermarkToMaxUpdatedAt(
    "assets",
    (assetMeta ?? []).map((meta) => ({ updatedAt: (meta.updated_at as string) ?? downloadedAt })),
  );

  return { records: { profiles, projects, folders, pages }, assets, error: null };
}

/**
 * Clears all local workspace records and asset blobs from IDB (safe — settings
 * table is untouched, so linkedUserId / pull watermarks survive), then downloads
 * the full cloud workspace for userId.
 *
 * Use this instead of downloadFullWorkspaceFromCloud when the device already has
 * local data and the user explicitly chose "Use cloud workspace."  Clearing first
 * ensures local-only records cannot survive the replacement or sync back up later.
 */
export async function replaceLocalWithCloudWorkspace(userId: string): Promise<DownloadResult> {
  // clearAllFromDB wipes workspace tables + resets the savedAssetIds session cache.
  // Settings table is NOT included, so pull watermarks and linkedUserId are preserved.
  await clearAllFromDB();
  console.log("[ThinkLeaf] Local workspace cleared in preparation for cloud replacement");
  return downloadFullWorkspaceFromCloud(userId);
}

// ---------------------------------------------------------------------------
// Cloud → local mappers  (snake_case → camelCase)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromCloudProfile(r: any): Profile {
  return { id: r.id, name: r.name, version: r.version, deletedAt: r.deleted_at ?? null, syncedAt: r.synced_at ?? null, createdAt: r.created_at, updatedAt: r.updated_at };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromCloudProject(r: any): Project {
  return { id: r.id, profileId: r.profile_id, name: r.name, color: r.color ?? undefined, version: r.version, deletedAt: r.deleted_at ?? null, syncedAt: r.synced_at ?? null, createdAt: r.created_at, updatedAt: r.updated_at };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromCloudFolder(r: any): Folder {
  return { id: r.id, profileId: r.profile_id, projectId: r.project_id, parentFolderId: r.parent_folder_id ?? undefined, name: r.name, color: r.color ?? undefined, version: r.version, deletedAt: r.deleted_at ?? null, syncedAt: r.synced_at ?? null, createdAt: r.created_at, updatedAt: r.updated_at };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromCloudPage(r: any): Page {
  return { id: r.id, profileId: r.profile_id, projectId: r.project_id, folderId: r.folder_id ?? undefined, title: r.title ?? "", body: r.body ?? "", noteDate: r.note_date ?? "", canvasViewState: r.canvas_view_state ?? { panX: 0, panY: 0, zoom: 1 }, canvasObjects: Array.isArray(r.canvas_objects) ? r.canvas_objects : [], tags: Array.isArray(r.tags) ? r.tags : [], isFavorite: r.is_favorite ?? false, version: r.version, deletedAt: r.deleted_at ?? null, syncedAt: r.synced_at ?? null, createdAt: r.created_at, updatedAt: r.updated_at };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

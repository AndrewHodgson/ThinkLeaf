import { db, type AssetRecord } from "@/lib/db";
import { getDirtyRecords, getLastPulledAt, markRecordsSynced, setLastPulledAt } from "@/lib/storageAdapter";
import { supabase } from "@/lib/supabase";
import type { Folder, Page, Profile, Project } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type PushResult = {
  /** Records that were successfully pushed, keyed by table. Includes updatedAt so
   *  the caller can conditionally update React state syncedAt only for records
   *  that haven't been modified since the push. */
  syncedRecords: {
    profiles: Array<{ id: string; updatedAt: string }>;
    projects: Array<{ id: string; updatedAt: string }>;
    folders: Array<{ id: string; updatedAt: string }>;
    pages: Array<{ id: string; updatedAt: string }>;
  };
  syncedAt: string;
  error: string | null;
};

export type PullResult = {
  records: {
    profiles: Profile[];
    projects: Project[];
    folders: Folder[];
    pages: Page[];
  };
  /** Newly downloaded asset blobs — caller injects imageDataUrl into React state. */
  assets: Array<{ id: string; data: string }>;
  error: string | null;
};

const EPOCH = "1970-01-01T00:00:00.000Z";
type SyncTable = "profiles" | "projects" | "folders" | "pages" | "assets";
type SyncRecord = { id: string; updatedAt: string; syncedAt: string | null };

function logSync(message: string, context?: Record<string, unknown>) {
  if (context) {
    console.log(`[ThinkLeaf] ${message}`, context);
  } else {
    console.log(`[ThinkLeaf] ${message}`);
  }
}

function withPulledSyncedAt<T extends SyncRecord>(records: T[], syncedAt: string): T[] {
  return records.map((record) => ({
    ...record,
    syncedAt: maxIso(record.updatedAt, syncedAt),
  }));
}

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

async function advanceWatermark(tableName: SyncTable, previous: string | null, records: Array<{ updatedAt: string }>) {
  if (!records.length) return previous;
  const next = maxIso(previous, ...records.map((record) => record.updatedAt));
  if (next !== (previous ?? EPOCH)) {
    await setLastPulledAt(tableName, next);
  }
  return next;
}

function collectPageAssetIds(pages: Page[]): Set<string> {
  const ids = new Set<string>();
  for (const page of pages) {
    for (const object of page.canvasObjects) {
      if (object.assetId) ids.add(object.assetId);
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

/**
 * Pushes all dirty local records (syncedAt === null || updatedAt > syncedAt) to
 * Supabase.  On success, stamps syncedAt in IDB.  Returns the pushed records
 * (with their updatedAt values) so the caller can conditionally update React
 * state syncedAt only for records that haven't changed since the push started.
 */
export async function pushDirtyRecords(userId: string): Promise<PushResult> {
  const empty = { profiles: [], projects: [], folders: [], pages: [] };
  if (!supabase) return { syncedRecords: empty, syncedAt: "", error: "Supabase not configured" };

  const now = new Date().toISOString();

  const [profiles, projects, folders, pages, assets] = await Promise.all([
    getDirtyRecords("profiles"),
    getDirtyRecords("projects"),
    getDirtyRecords("folders"),
    getDirtyRecords("pages"),
    getDirtyRecords("assets"),
  ]);

  logSync("Sync push started", {
    dirty: {
      profiles: profiles.length,
      projects: projects.length,
      folders: folders.length,
      pages: pages.length,
      assets: assets.length,
    },
  });

  // Log tombstones separately so delete propagation is auditable.
  const deletedCounts = {
    profiles: profiles.filter((r) => r.deletedAt).length,
    projects: projects.filter((r) => r.deletedAt).length,
    folders: folders.filter((r) => r.deletedAt).length,
    pages: pages.filter((r) => r.deletedAt).length,
  };
  const totalDeleted = deletedCounts.profiles + deletedCounts.projects + deletedCounts.folders + deletedCounts.pages;
  if (totalDeleted > 0) {
    console.log(
      "[ThinkLeaf] Push includes tombstones — profiles:", deletedCounts.profiles,
      "projects:", deletedCounts.projects,
      "folders:", deletedCounts.folders,
      "pages:", deletedCounts.pages,
    );
  }

  if (profiles.length) {
    const { error } = await supabase.from("profiles").upsert(profiles.map((r) => toCloudProfile(r, userId)));
    if (error) {
      console.warn("[ThinkLeaf] Sync push failed", { table: "profiles", error: error.message });
      return { syncedRecords: empty, syncedAt: now, error: error.message };
    }
  }
  if (projects.length) {
    const { error } = await supabase.from("projects").upsert(projects.map((r) => toCloudProject(r, userId)));
    if (error) {
      console.warn("[ThinkLeaf] Sync push failed", { table: "projects", error: error.message });
      return { syncedRecords: empty, syncedAt: now, error: error.message };
    }
  }
  if (folders.length) {
    const { error } = await supabase.from("folders").upsert(folders.map((r) => toCloudFolder(r, userId)));
    if (error) {
      console.warn("[ThinkLeaf] Sync push failed", { table: "folders", error: error.message });
      return { syncedRecords: empty, syncedAt: now, error: error.message };
    }
  }
  if (pages.length) {
    const { error } = await supabase.from("pages").upsert(pages.map((r) => toCloudPage(r, userId)));
    if (error) {
      console.warn("[ThinkLeaf] Sync push failed", { table: "pages", error: error.message });
      return { syncedRecords: empty, syncedAt: now, error: error.message };
    }
  }

  // Push asset blobs; failures are logged but don't abort the overall push.
  const syncedAssetIds: string[] = [];
  for (const asset of assets) {
    const { error } = await pushAsset(userId, asset);
    if (error) {
      console.warn(`[ThinkLeaf] Asset push skipped for ${asset.id}:`, error);
    } else {
      syncedAssetIds.push(asset.id);
    }
  }

  // Stamp IDB syncedAt directly (belt-and-suspenders; autosave will also carry
  // the updated syncedAt from React state after onRecordsSynced runs).
  await Promise.all([
    markRecordsSynced("profiles", profiles.map((r) => ({ id: r.id, updatedAt: r.updatedAt })), now),
    markRecordsSynced("projects", projects.map((r) => ({ id: r.id, updatedAt: r.updatedAt })), now),
    markRecordsSynced("folders", folders.map((r) => ({ id: r.id, updatedAt: r.updatedAt })), now),
    markRecordsSynced("pages", pages.map((r) => ({ id: r.id, updatedAt: r.updatedAt })), now),
    markRecordsSynced("assets", assets.filter((r) => syncedAssetIds.includes(r.id)).map((r) => ({ id: r.id, updatedAt: r.updatedAt })), now),
  ]);

  logSync("Sync push completed", {
    pushed: {
      profiles: profiles.length,
      projects: projects.length,
      folders: folders.length,
      pages: pages.length,
      assets: syncedAssetIds.length,
    },
  });

  return {
    syncedRecords: {
      profiles: profiles.map((r) => ({ id: r.id, updatedAt: r.updatedAt })),
      projects: projects.map((r) => ({ id: r.id, updatedAt: r.updatedAt })),
      folders: folders.map((r) => ({ id: r.id, updatedAt: r.updatedAt })),
      pages: pages.map((r) => ({ id: r.id, updatedAt: r.updatedAt })),
    },
    syncedAt: now,
    error: null,
  };
}

async function pushAsset(userId: string, asset: AssetRecord): Promise<{ error: string | null }> {
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

  const { error: storageError } = await supabase.storage
    .from("assets")
    .upload(`${userId}/${asset.id}`, new Blob([bytes], { type: asset.mimeType }), {
      upsert: true,
      contentType: asset.mimeType,
    });

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
// Pull
// ---------------------------------------------------------------------------

/**
 * Fetches all records updated since lastPulledAt from Supabase.  Returns
 * records to the caller for React state merge, and writes new asset blobs to
 * IDB directly (since assets bypass React state).  Updates lastPulledAt
 * watermarks in IDB settings on success.
 */
export async function pullRemoteChanges(userId: string): Promise<PullResult> {
  const empty = { profiles: [], projects: [], folders: [], pages: [] };
  if (!supabase) return { records: empty, assets: [], error: "Supabase not configured" };

  const pullStartedAt = new Date().toISOString();

  const [profilesWm, projectsWm, foldersWm, pagesWm, assetsWm] = await Promise.all([
    getLastPulledAt("profiles"),
    getLastPulledAt("projects"),
    getLastPulledAt("folders"),
    getLastPulledAt("pages"),
    getLastPulledAt("assets"),
  ]);

  logSync("Sync pull started", {
    lastPulledAt: {
      profiles: profilesWm,
      projects: projectsWm,
      folders: foldersWm,
      pages: pagesWm,
      assets: assetsWm,
    },
  });

  const [profilesRes, projectsRes, foldersRes, pagesRes, assetsMetaRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).gt("updated_at", profilesWm ?? EPOCH),
    supabase.from("projects").select("*").eq("user_id", userId).gt("updated_at", projectsWm ?? EPOCH),
    supabase.from("folders").select("*").eq("user_id", userId).gt("updated_at", foldersWm ?? EPOCH),
    supabase.from("pages").select("*").eq("user_id", userId).gt("updated_at", pagesWm ?? EPOCH),
    supabase.from("assets").select("*").eq("user_id", userId).gt("updated_at", assetsWm ?? EPOCH),
  ]);

  const firstError =
    profilesRes.error ?? projectsRes.error ?? foldersRes.error ?? pagesRes.error ?? assetsMetaRes.error;
  if (firstError) {
    console.warn("[ThinkLeaf] Sync pull failed", { error: firstError.message });
    return { records: empty, assets: [], error: firstError.message };
  }

  // Map cloud records to local types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles = withPulledSyncedAt(((profilesRes.data ?? []) as any[]).map(fromCloudProfile), pullStartedAt);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects = withPulledSyncedAt(((projectsRes.data ?? []) as any[]).map(fromCloudProject), pullStartedAt);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const folders = withPulledSyncedAt(((foldersRes.data ?? []) as any[]).map(fromCloudFolder), pullStartedAt);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pages = withPulledSyncedAt(((pagesRes.data ?? []) as any[]).map(fromCloudPage), pullStartedAt);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assetsMeta = (assetsMetaRes.data ?? []) as any[];

  // Download new asset blobs from Storage and write directly to IDB.
  const pulledAssets: Array<{ id: string; data: string }> = [];
  for (const meta of assetsMeta) {
    const id = meta.id as string;
    const mimeType = meta.mime_type as string;

    // Skip if already cached locally — asset content is immutable once uploaded.
    const existing = await db.assets.get(id);
    if (existing?.data) {
      pulledAssets.push({ id, data: existing.data });
      continue;
    }

    const { data: blob, error: downloadError } = await supabase.storage
      .from("assets")
      .download(`${userId}/${id}`);

    if (downloadError || !blob) {
      console.warn(`[ThinkLeaf] Asset download failed for ${id}:`, downloadError?.message);
      continue;
    }

    const dataUrl = await blobToDataUrl(blob);

    await db.assets.put({
      id,
      mimeType,
      data: dataUrl,
      version: (meta.version as number) ?? 1,
      deletedAt: (meta.deleted_at as string | null) ?? null,
      syncedAt: maxIso((meta.updated_at as string) ?? pullStartedAt, pullStartedAt),
      createdAt: (meta.created_at as string) ?? pullStartedAt,
      updatedAt: (meta.updated_at as string) ?? pullStartedAt,
    });

    pulledAssets.push({ id, data: dataUrl });
  }

  const returnedAssetIds = new Set(pulledAssets.map((asset) => asset.id));
  for (const id of collectPageAssetIds(pages)) {
    if (returnedAssetIds.has(id)) continue;
    const cached = await db.assets.get(id);
    if (cached?.data) {
      pulledAssets.push({ id, data: cached.data });
      returnedAssetIds.add(id);
    }
  }

  // Log pulled tombstones so delete propagation is auditable.
  const pulledDeletedCounts = {
    profiles: profiles.filter((r) => r.deletedAt).length,
    projects: projects.filter((r) => r.deletedAt).length,
    folders: folders.filter((r) => r.deletedAt).length,
    pages: pages.filter((r) => r.deletedAt).length,
  };
  const totalPulledDeleted =
    pulledDeletedCounts.profiles + pulledDeletedCounts.projects +
    pulledDeletedCounts.folders + pulledDeletedCounts.pages;
  if (totalPulledDeleted > 0) {
    console.log(
      "[ThinkLeaf] Pull includes tombstones — profiles:", pulledDeletedCounts.profiles,
      "projects:", pulledDeletedCounts.projects,
      "folders:", pulledDeletedCounts.folders,
      "pages:", pulledDeletedCounts.pages,
    );
  }

  // Advance each table only to the newest updatedAt actually received from it.
  const [nextProfilesWm, nextProjectsWm, nextFoldersWm, nextPagesWm, nextAssetsWm] = await Promise.all([
    advanceWatermark("profiles", profilesWm, profiles),
    advanceWatermark("projects", projectsWm, projects),
    advanceWatermark("folders", foldersWm, folders),
    advanceWatermark("pages", pagesWm, pages),
    advanceWatermark("assets", assetsWm, assetsMeta.map((meta) => ({ updatedAt: (meta.updated_at as string) ?? pullStartedAt }))),
  ]);

  logSync("Sync pull completed", {
    pulled: {
      profiles: profiles.length,
      projects: projects.length,
      folders: folders.length,
      pages: pages.length,
      assets: pulledAssets.length,
    },
    lastPulledAt: {
      before: { profiles: profilesWm, projects: projectsWm, folders: foldersWm, pages: pagesWm, assets: assetsWm },
      after: { profiles: nextProfilesWm, projects: nextProjectsWm, folders: nextFoldersWm, pages: nextPagesWm, assets: nextAssetsWm },
    },
  });

  return {
    records: { profiles, projects, folders, pages },
    assets: pulledAssets,
    error: null,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// Cloud → local mappers  (snake_case → camelCase)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromCloudProfile(r: any): Profile {
  return {
    id: r.id,
    name: r.name,
    version: r.version,
    deletedAt: r.deleted_at ?? null,
    syncedAt: r.synced_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromCloudProject(r: any): Project {
  return {
    id: r.id,
    profileId: r.profile_id,
    name: r.name,
    color: r.color ?? undefined,
    version: r.version,
    deletedAt: r.deleted_at ?? null,
    syncedAt: r.synced_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromCloudFolder(r: any): Folder {
  return {
    id: r.id,
    profileId: r.profile_id,
    projectId: r.project_id,
    parentFolderId: r.parent_folder_id ?? undefined,
    name: r.name,
    color: r.color ?? undefined,
    version: r.version,
    deletedAt: r.deleted_at ?? null,
    syncedAt: r.synced_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromCloudPage(r: any): Page {
  return {
    id: r.id,
    profileId: r.profile_id,
    projectId: r.project_id,
    folderId: r.folder_id ?? undefined,
    title: r.title ?? "",
    body: r.body ?? "",
    noteDate: r.note_date ?? "",
    canvasViewState: r.canvas_view_state ?? { panX: 0, panY: 0, zoom: 1 },
    canvasObjects: Array.isArray(r.canvas_objects) ? r.canvas_objects : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    isFavorite: r.is_favorite ?? false,
    version: r.version,
    deletedAt: r.deleted_at ?? null,
    syncedAt: r.synced_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Local → cloud mappers  (camelCase → snake_case)
// ---------------------------------------------------------------------------

function toCloudProfile(r: Profile, userId: string) {
  return { id: r.id, user_id: userId, name: r.name, version: r.version, deleted_at: r.deletedAt, synced_at: r.syncedAt, created_at: r.createdAt, updated_at: r.updatedAt };
}

function toCloudProject(r: Project, userId: string) {
  return { id: r.id, user_id: userId, profile_id: r.profileId, name: r.name, color: r.color ?? null, version: r.version, deleted_at: r.deletedAt, synced_at: r.syncedAt, created_at: r.createdAt, updated_at: r.updatedAt };
}

function toCloudFolder(r: Folder, userId: string) {
  return { id: r.id, user_id: userId, profile_id: r.profileId, project_id: r.projectId, parent_folder_id: r.parentFolderId ?? null, name: r.name, color: r.color ?? null, version: r.version, deleted_at: r.deletedAt, synced_at: r.syncedAt, created_at: r.createdAt, updated_at: r.updatedAt };
}

function toCloudPage(r: Page, userId: string) {
  return { id: r.id, user_id: userId, profile_id: r.profileId, project_id: r.projectId, folder_id: r.folderId ?? null, title: r.title, body: r.body, note_date: r.noteDate, canvas_view_state: r.canvasViewState, canvas_objects: r.canvasObjects, tags: r.tags, is_favorite: r.isFavorite, version: r.version, deleted_at: r.deletedAt, synced_at: r.syncedAt, created_at: r.createdAt, updated_at: r.updatedAt };
}

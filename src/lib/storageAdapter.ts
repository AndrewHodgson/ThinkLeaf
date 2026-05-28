import { db } from "@/lib/db";
import type { WorkspaceData } from "@/types/workspace";

export async function loadAllFromDB(): Promise<WorkspaceData | null> {
  const [profiles, projects, folders, pages, activeProfileIdRow, recentPageIdsRow] = await Promise.all([
    db.profiles.toArray(),
    db.projects.toArray(),
    db.folders.toArray(),
    db.pages.toArray(),
    db.settings.get("activeProfileId"),
    db.settings.get("recentPageIds"),
  ]);

  // Empty database — not yet initialized.
  if (!profiles.length && !projects.length && !pages.length) {
    return null;
  }

  return {
    profiles,
    activeProfileId: (activeProfileIdRow?.value as string) ?? profiles[0]?.id ?? "",
    projects,
    folders,
    pages,
    recentPageIds: (recentPageIdsRow?.value as string[]) ?? [],
  };
}

export async function saveAllToDB(data: WorkspaceData): Promise<void> {
  await db.transaction("rw", [db.profiles, db.projects, db.folders, db.pages, db.settings], async () => {
    await db.profiles.clear();
    await db.projects.clear();
    await db.folders.clear();
    await db.pages.clear();

    if (data.profiles.length) await db.profiles.bulkAdd(data.profiles);
    if (data.projects.length) await db.projects.bulkAdd(data.projects);
    if (data.folders.length) await db.folders.bulkAdd(data.folders);
    if (data.pages.length) await db.pages.bulkAdd(data.pages);

    await db.settings.put({ key: "activeProfileId", value: data.activeProfileId });
    await db.settings.put({ key: "recentPageIds", value: data.recentPageIds });
  });
}

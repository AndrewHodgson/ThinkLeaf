import Dexie, { type Table } from "dexie";
import type { Folder, Page, Profile, Project } from "@/types/workspace";

export type SettingsRecord = {
  key: string;
  value: unknown;
};

export type AssetRecord = {
  id: string;
  mimeType: string;
  data: string;
  version: number;
  deletedAt: string | null;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

class ThinkLeafDB extends Dexie {
  profiles!: Table<Profile>;
  projects!: Table<Project>;
  folders!: Table<Folder>;
  pages!: Table<Page>;
  settings!: Table<SettingsRecord>;
  assets!: Table<AssetRecord>;

  constructor() {
    super("thinkleaf");
    this.version(1).stores({
      profiles: "id",
      projects: "id, profileId",
      folders: "id, profileId, projectId",
      pages: "id, profileId, projectId, folderId",
      settings: "key",
    });
    this.version(2).stores({
      profiles: "id",
      projects: "id, profileId",
      folders: "id, profileId, projectId",
      pages: "id, profileId, projectId, folderId",
      settings: "key",
      assets: "id",
    });
    this.version(3)
      .stores({
        profiles: "id",
        projects: "id, profileId",
        folders: "id, profileId, projectId",
        pages: "id, profileId, projectId, folderId",
        settings: "key",
        assets: "id",
      })
      .upgrade(async (tx) => {
        const defaults = { version: 1, deletedAt: null, syncedAt: null };
        const tables = ["profiles", "projects", "folders", "pages", "assets"] as const;
        for (const table of tables) {
          await tx
            .table(table)
            .toCollection()
            .modify((record) => {
              if (record.version === undefined) {
                Object.assign(record, defaults);
              }
            });
        }
      });
  }
}

export const db = new ThinkLeafDB();

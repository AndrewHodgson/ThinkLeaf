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
  }
}

export const db = new ThinkLeafDB();

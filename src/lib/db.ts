import Dexie, { type Table } from "dexie";
import type { Folder, Page, Profile, Project } from "@/types/workspace";

export type SettingsRecord = {
  key: string;
  value: unknown;
};

class ThinkLeafDB extends Dexie {
  profiles!: Table<Profile>;
  projects!: Table<Project>;
  folders!: Table<Folder>;
  pages!: Table<Page>;
  settings!: Table<SettingsRecord>;

  constructor() {
    super("thinkleaf");
    this.version(1).stores({
      profiles: "id",
      projects: "id, profileId",
      folders: "id, profileId, projectId",
      pages: "id, profileId, projectId, folderId",
      settings: "key",
    });
  }
}

export const db = new ThinkLeafDB();

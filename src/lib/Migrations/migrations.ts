import { readdir } from "node:fs/promises";
import { MIGRATION_TYPE } from "./constants.js";
import type { Migration } from "./types.js";
import { resolve } from "node:path";

type ManagerState = "initialized" | "initializing" | "not-initialized";

class MigrationManager {
  static MigrationType = MIGRATION_TYPE;
  static loadMigrations = async () => {
    console.log(
      await readdir(resolve("."), {
        withFileTypes: true,
      })
    );
  };

  _migrations: Migration.Migration[] = [];
  _runningMigrations: Migration.Migration[] = [];
  _queuedMigrations: Migration.Migration[] = [];
  _managerState: ManagerState;

  constructor() {
    this._managerState = "not-initialized";
  }
}

export default new MigrationManager();

import { readdir } from "node:fs/promises";
import { MIGRATION_TYPE } from "./constants.js";
import type { Migration } from "./types.js";
import { dirname, resolve } from "node:path";

type ManagerState = "initialized" | "initializing" | "not-initialized";

class MigrationInstance implements Migration.Migration {
  _definition: Migration.MigrationDefinition;

  get identifier() {
    return this._definition.identifier;
  }
  get needs() {
    return this._definition.needs;
  }
  get type() {
    return this._definition.type;
  }
  get state() {
    return this._definition.getState();
  }
  get apply() {
    return this._definition.apply;
  }
  _needs: Migration.MigrationDefinition["needs"];
  constructor(params: { definition: Migration.MigrationDefinition }) {
    this._definition = params.definition;
  }
}

class MigrationManager {
  static _instance: MigrationManager;
  static MigrationType = MIGRATION_TYPE;
  static loadMigrations = async () => {
    const files = await readdir(dirname(new URL(import.meta.url).pathname), {
      withFileTypes: true,
    });
    for (const file of files) {
      if (!file.isDirectory()) {
        continue;
      }
      const { default: migrationDefinition } = (await import(
        resolve(
          dirname(new URL(import.meta.url).pathname),
          file.name,
          `${file.name}.ts`
        )
      )) satisfies { default: Migration.MigrationDefinition };

      if (!migrationDefinition.identifier) {
        throw new Error("Migration identifier is not defined");
      }
      if (this._instance._migrations.has(migrationDefinition.identifier)) {
        throw new Error(
          `Migration ${migrationDefinition.identifier} is already registered`
        );
      }

      this._instance._migrations.set(
        migrationDefinition.identifier,
        migrationDefinition
      );
    }
  };
  // static areMigrationsNeedsMet(migration: Migration.Migration): boolean {
  //   return false;
  // }

  private _migrations: Map<string, Migration.Migration> = new Map();
  // private _runningMigrations: Set<string> = new Set();
  // private _queuedMigrations: Migration.Migration[] = [];
  private _managerState: ManagerState;

  static get instance(): MigrationManager {
    if (!MigrationManager._instance) {
      throw new Error("MigrationManager is not initialized");
    }
    return MigrationManager._instance;
  }

  static async init() {
    if (MigrationManager._instance) {
      throw new Error("MigrationManager is already initialized");
    }

    MigrationManager._instance = new MigrationManager();
    await MigrationManager.loadMigrations();
  }

  constructor() {
    if (MigrationManager._instance) {
      throw new Error("MigrationManager is already initialized");
    }

    this._managerState = "not-initialized";
  }

  set managerState(state: ManagerState) {
    this._managerState = state;
  }
}

export async function initMigrations() {
  await MigrationManager.init();
}

// export default new MigrationManager();

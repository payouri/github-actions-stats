import type { MIGRATION_TYPE } from "./constants.js";

export namespace Migration {
  export type MigrationType =
    (typeof MIGRATION_TYPE)[keyof typeof MIGRATION_TYPE];
  export type MigrationState = "pending" | "applied" | "running";
  export interface Migration {
    type: Migration.MigrationType;
    state: Migration.MigrationState | Promise<Migration.MigrationState>;
  }
}

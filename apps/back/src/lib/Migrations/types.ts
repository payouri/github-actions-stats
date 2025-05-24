import type { MethodResult } from "../../types/MethodResult.js";
import type { MIGRATION_TYPE } from "./constants.js";

export namespace Migration {
  export type MigrationType =
    (typeof MIGRATION_TYPE)[keyof typeof MIGRATION_TYPE];
  export type MigrationState = "pending" | "applied" | "running";

  export interface MigrationDefinition {
    identifier: string;
    needs: string[] | undefined;
    type: Migration.MigrationType;
    getState: () =>
      | Migration.MigrationState
      | Promise<Migration.MigrationState>;
    apply: (options: {
      abortSignal?: AbortSignal;
    }) => Promise<MethodResult<void, "failed_to_apply_migration">>;
  }
  export interface Migration
    extends Omit<Migration.MigrationDefinition, "getState"> {
    state: Migration.MigrationState | Promise<Migration.MigrationState>;
  }
}

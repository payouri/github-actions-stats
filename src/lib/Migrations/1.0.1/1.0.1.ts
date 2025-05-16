import { DB } from "../../../entities/db.js";
import { formatMs } from "../../../helpers/format/formatMs.js";
import logger from "../../Logger/logger.js";
import type { Migration } from "../types.js";

let registeredState: Migration.MigrationState | undefined;

const Migration101: Migration.MigrationDefinition = {
  identifier: "1.0.1",
  type: "auto",
  needs: undefined,
  async getState() {
    if (registeredState) return registeredState;

    const { workflowCount, workflowRunCount } =
      await DB.queries.countDocumentsOnVersion({ version: "1.0.0" });

    registeredState =
      workflowCount === 0 && workflowRunCount === 0 ? "applied" : "pending";

    return registeredState;
  },
  async apply({ abortSignal: _ }) {
    const start = performance.now();
    try {
      return {
        hasFailed: false,
      };
    } catch (error) {
      return {
        hasFailed: true,
        error: {
          code: "failed_to_apply_migration",
          message: "Failed to apply migration",
          error: error instanceof Error ? error : new Error(String(error)),
          data: undefined,
        },
      };
    } finally {
      const end = performance.now();
      logger.debug(
        `Migration ${this.identifier} has been applied in ${formatMs(
          end - start
        )}`
      );
    }
  },
} as const;

export default Migration101;

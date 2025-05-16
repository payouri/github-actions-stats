import { z } from "zod";
import { MONGO_CONFIG } from "../../../config/mongo.js";
import logger from "../../../lib/Logger/logger.js";
import { createMongoStorage } from "../../../storage/mongo/index.js";
import type { MongoStorage } from "../../../storage/mongo/types.js";
import { aggregatedStatSchema } from "../schemas/aggregatedStat.schema.js";
import { workflowStatSchema } from "../schemas/workflowStat.schema.js";
import { formatMs } from "../../../helpers/format/formatMs.js";

const STORED_WORKFLOW_VERSION = "1.0.1" as const;
const STORED_WORKFLOW_RUN_VERSION = "1.0.1" as const;

const storedAggregatedStatSchema = aggregatedStatSchema.merge(
  z.object({
    workflowKey: z.string(),
  })
);
const storedWorkflowStatSchema = workflowStatSchema.merge(
  z.object({
    workflowKey: z.string(),
  })
);

export const aggregatedWorkflowStatsMongoStorage = createMongoStorage({
  collectionName: "aggregated-runs-stats",
  dbURI: MONGO_CONFIG.dbURI,
  dbName: MONGO_CONFIG.databaseName,
  indexes: MONGO_CONFIG.indexes.workflows,
  schema: {
    schema: storedAggregatedStatSchema,
    version: STORED_WORKFLOW_VERSION,
  },
  logger,
});

export const workflowRunStatsMongoStorage = createMongoStorage({
  collectionName: "workflow-runs-stats",
  dbURI: MONGO_CONFIG.dbURI,
  dbName: MONGO_CONFIG.databaseName,
  schema: {
    schema: storedWorkflowStatSchema,
    version: STORED_WORKFLOW_RUN_VERSION,
  },
  indexes: MONGO_CONFIG.indexes.workflowStats,
  logger,
});

export type AggregatedWorkflowStatsMongoStorage = MongoStorage<
  typeof storedAggregatedStatSchema
>;
export type WorkflowRunStatsMongoStorage = MongoStorage<
  typeof storedWorkflowStatSchema
>;

export const initWorkflowStatsMongoStorage = async () => {
  logger.debug("Initializing Workflows Stats MongoDB storage");
  const start = performance.now();
  await Promise.all([
    aggregatedWorkflowStatsMongoStorage.init(),
    workflowRunStatsMongoStorage.init(),
  ]);
  logger.debug(
    `Workflows Stats MongoDB storage has been initialized in ${formatMs(
      performance.now() - start
    )}`
  );
};

export const closeWorkflowStatsMongoStorage = async () => {
  logger.debug("Closing Workflows Stats MongoDB storage");
  const start = performance.now();
  await Promise.all([
    aggregatedWorkflowStatsMongoStorage.close(),
    workflowRunStatsMongoStorage.close(),
  ]);
  logger.debug(
    `Workflows Stats MongoDB storage has been closed in ${formatMs(
      performance.now() - start
    )}`
  );
};

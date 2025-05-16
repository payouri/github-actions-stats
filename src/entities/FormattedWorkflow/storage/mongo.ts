import { z } from "zod";
import { MONGO_CONFIG } from "../../../config/mongo.js";
import { formatMs } from "../../../helpers/format/formatMs.js";
import logger from "../../../lib/Logger/logger.js";
import { createMongoStorage } from "../../../storage/mongo/index.js";
import type { MongoStorage } from "../../../storage/mongo/types.js";
import { formattedWorkflowRunSchema } from "../schemas/schema.js";

const STORED_WORKFLOW_VERSION = "1.0.0" as const;
export const storedWorkflow = z.object({
  workflowId: z.number(),
  workflowName: z.string(),
  workflowParams: z.object({
    owner: z.string(),
    repo: z.string(),
    branchName: z.string().optional(),
    workflowStatus: z.string().optional(),
    triggerEvent: z.string().optional(),
  }),
  totalWorkflowRuns: z.number(),
  lastRunAt: z.union([z.string(), z.date()]).transform((val) => {
    if (val instanceof Date) return val;

    return new Date(val);
  }),
  oldestRunAt: z.union([z.string(), z.date()]).transform((val) => {
    if (val instanceof Date) return val;

    return new Date(val);
  }),
  lastUpdatedAt: z.union([z.string(), z.date()]).transform((val) => {
    if (val instanceof Date) return val;

    return new Date(val);
  }),
});

const STORED_WORKFLOW_RUN_VERSION = "1.0.0" as const;
export const storedWorkflowRun = formattedWorkflowRunSchema.merge(
  z.object({
    workflowId: z.number(),
    workflowName: z.string(),
    repositoryName: z.string(),
    repositoryOwner: z.string(),
    branchName: z.string().optional(),
  })
);

export const workflowStorage = createMongoStorage({
  collectionName: "workflow-data",
  dbURI: MONGO_CONFIG.dbURI,
  dbName: MONGO_CONFIG.databaseName,
  indexes: MONGO_CONFIG.indexes.workflows,
  schema: { schema: storedWorkflow, version: STORED_WORKFLOW_VERSION },
  logger,
});

export const workflowRunsStorage = createMongoStorage({
  collectionName: "workflow-runs",
  dbURI: MONGO_CONFIG.dbURI,
  dbName: MONGO_CONFIG.databaseName,
  schema: { schema: storedWorkflowRun, version: STORED_WORKFLOW_RUN_VERSION },
  indexes: MONGO_CONFIG.indexes.workflowRuns,
  logger,
});

export type WorkflowMongoStorage = MongoStorage<typeof storedWorkflow>;
export type WorkflowRunsMongoStorage = MongoStorage<typeof storedWorkflowRun>;

export const initFormattedWorkflowStorage = async () => {
  logger.debug("Initializing Workflows MongoDB storage");
  const start = performance.now();
  await Promise.all([workflowStorage.init(), workflowRunsStorage.init()]);
  logger.debug(
    `Workflows MongoDB storage has been initialized in ${formatMs(
      performance.now() - start
    )}`
  );
};

export const closeFormattedWorkflowStorage = async () => {
  logger.debug("Closing Workflows MongoDB storage");
  const start = performance.now();
  await Promise.all([workflowStorage.close(), workflowRunsStorage.close()]);
  logger.debug(
    `Workflows MongoDB storage has been closed in ${formatMs(
      performance.now() - start
    )}`
  );
};

import { z } from "zod";
import { MONGO_CONFIG } from "../../config/mongo.js";
import logger from "../../lib/Logger/logger.js";
import { createMongoStorage } from "../../storage/mongo/index.js";
import { formattedWorkflowRunSchema } from "./schemas/schema.js";
import type { MongoStorage } from "../../storage/mongo/types.js";

const STORED_WORKFLOW_VERSION = "1.0.0" as const;
const storedWorkflow = z.object({
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
const storedWorkflowRun = formattedWorkflowRunSchema.merge(
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

export type WorkflowStorage = MongoStorage<typeof storedWorkflow>;
export type WorkflowRunsStorage = MongoStorage<typeof storedWorkflowRun>;

export const initFormattedWorkflowStorage = async () => {
  logger.debug("Initializing Workflows MongoDB storage");
  await Promise.all([workflowStorage.init(), workflowRunsStorage.init()]);
};

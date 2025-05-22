import { z } from "zod";
import { MONGO_CONFIG } from "../../../config/mongo.js";
import logger from "../../../lib/Logger/logger.js";
import { createMongoStorage } from "../../../storage/mongo/index.js";
import type { MongoStorage } from "../../../storage/mongo/types.js";
import { formattedWorkflowRunSchema } from "../schemas/schema.js";

const WORKFLOW_COLLECTION_NAME = "workflow-data" as const;
const WORKFLOW_RUN_COLLECTION_NAME = "workflow-runs" as const;

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
    workflowKey: z.string(),
    branchName: z.string().optional(),
  })
);

export const workflowMongoStorage = createMongoStorage({
  collectionName: WORKFLOW_COLLECTION_NAME,
  dbURI: MONGO_CONFIG.dbURI,
  dbName: MONGO_CONFIG.databaseName,
  indexes: MONGO_CONFIG.indexes.workflows,
  schema: { schema: storedWorkflow, version: STORED_WORKFLOW_VERSION },
  logger,
});

export const workflowRunsMongoStorage = createMongoStorage({
  collectionName: WORKFLOW_RUN_COLLECTION_NAME,
  dbURI: MONGO_CONFIG.dbURI,
  dbName: MONGO_CONFIG.databaseName,
  schema: { schema: storedWorkflowRun, version: STORED_WORKFLOW_RUN_VERSION },
  indexes: MONGO_CONFIG.indexes.workflowRuns,
  logger,
});

export type WorkflowMongoStorage = MongoStorage<typeof storedWorkflow>;
export type WorkflowRunsMongoStorage = MongoStorage<typeof storedWorkflowRun>;

export const initFormattedWorkflowStorage = async () => {
  await Promise.all([
    workflowMongoStorage.init(),
    workflowRunsMongoStorage.init(),
  ]);
};

export const closeFormattedWorkflowStorage = async () => {
  await Promise.all([
    workflowMongoStorage.close(),
    workflowRunsMongoStorage.close(),
  ]);
};

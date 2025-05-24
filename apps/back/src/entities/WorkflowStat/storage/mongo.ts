import { z } from "zod";
import { MONGO_CONFIG } from "../../../config/mongo.js";
import logger from "../../../lib/Logger/logger.js";
import { createMongoStorage } from "../../../storage/mongo/index.js";
import type { MongoStorage } from "../../../storage/mongo/types.js";
import {
	aggregatedStatSchema,
	workflowStatSchema,
} from "@github-actions-stats/workflow-entity";

export const WORKFLOW_STAT_COLLECTION_NAME = "workflow-stats" as const;
export const AGGREGATED_STAT_COLLECTION_NAME =
	"aggregated-workflow-stats" as const;
export const STORED_WORKFLOW_VERSION = "1.0.1" as const;
export const STORED_WORKFLOW_RUN_VERSION = "1.0.1" as const;

const storedAggregatedStatSchema = aggregatedStatSchema.merge(
	z.object({
		workflowKey: z.string(),
	}),
);
const storedWorkflowStatSchema = workflowStatSchema.merge(
	z.object({
		workflowKey: z.string(),
	}),
);

export const aggregatedWorkflowStatsMongoStorage = createMongoStorage({
	collectionName: AGGREGATED_STAT_COLLECTION_NAME,
	indexes: MONGO_CONFIG.indexes.workflows,
	schema: {
		schema: storedAggregatedStatSchema,
		version: STORED_WORKFLOW_VERSION,
	},
	logger,
});

export const workflowRunStatsMongoStorage = createMongoStorage({
	collectionName: WORKFLOW_STAT_COLLECTION_NAME,
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
	await Promise.all([
		aggregatedWorkflowStatsMongoStorage.init(),
		workflowRunStatsMongoStorage.init(),
	]);
};

export const closeWorkflowStatsMongoStorage = async () => {
	await Promise.all([
		aggregatedWorkflowStatsMongoStorage.close(),
		workflowRunStatsMongoStorage.close(),
	]);
};

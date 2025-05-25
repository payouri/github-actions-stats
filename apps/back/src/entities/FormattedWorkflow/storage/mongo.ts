import {
	storedWorkflow,
	storedWorkflowRun,
} from "@github-actions-stats/workflow-entity";
import { MONGO_CONFIG } from "../../../config/mongo.js";
import { createMongoStorage } from "../../../storage/mongo.js";
import type { MongoStorage } from "@github-actions-stats/storage";
const WORKFLOW_COLLECTION_NAME = "workflow-data" as const;
const WORKFLOW_RUN_COLLECTION_NAME = "workflow-runs" as const;

const STORED_WORKFLOW_VERSION = "1.0.0" as const;
const STORED_WORKFLOW_RUN_VERSION = "1.0.0" as const;

export const workflowMongoStorage = createMongoStorage({
	collectionName: WORKFLOW_COLLECTION_NAME,
	indexes: MONGO_CONFIG.indexes.workflows,
	schema: { schema: storedWorkflow, version: STORED_WORKFLOW_VERSION },
});

export const workflowRunsMongoStorage = createMongoStorage({
	collectionName: WORKFLOW_RUN_COLLECTION_NAME,
	schema: { schema: storedWorkflowRun, version: STORED_WORKFLOW_RUN_VERSION },
	indexes: MONGO_CONFIG.indexes.workflowRuns,
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

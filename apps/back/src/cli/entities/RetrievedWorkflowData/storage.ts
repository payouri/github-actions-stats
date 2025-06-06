import { workflowRunId } from "@github-actions-stats/common-entity";
import { createFSStorage, type FSStorage } from "@github-actions-stats/storage";
import {
	formattedWorkflowRunSchema,
	retrievedWorkflowSchema,
} from "@github-actions-stats/workflow-entity";
import { join } from "node:path";
import { z } from "zod";
import { config } from "../../../config/config.js";
import {
	generateWorkflowKey,
	generateWorkflowRunKey,
} from "../../../helpers/generateWorkflowKey.js";
import logger from "../../../lib/Logger/logger.js";

const storedWorkflow = retrievedWorkflowSchema
	.omit({
		workflowWeekRunsMap: true,
	})
	.merge(z.object({ workflowsList: z.array(workflowRunId) }));

const storedWorkflowRun = formattedWorkflowRunSchema.merge(
	z.object({
		workflowId: z.number(),
		workflowName: z.string(),
		repositoryName: z.string(),
		repositoryOwner: z.string(),
		branchName: z.string().optional(),
	}),
);

export const workflowStorage = createFSStorage({
	directory: join(config.FS.directory, "workflows"),
	format: "json",
	schema: storedWorkflow,
	logger,
});

export const workflowRunsStorage = createFSStorage({
	directory: join(config.FS.directory, "workflow-runs"),
	format: "json",
	schema: storedWorkflowRun,
	logger,
});

export type WorkflowStorage = FSStorage<typeof storedWorkflow>;
export type WorkflowRunsStorage = FSStorage<typeof storedWorkflowRun>;

export const initFormattedWorkflowStorage = async () => {
	await Promise.all([workflowStorage.init(), workflowRunsStorage.init()]);
};

export const getWorkflowStoragePath = (params: {
	workflowName: string;
	repositoryName: string;
	repositoryOwner: string;
	branchName?: string;
}) => {
	const { workflowName, repositoryName, repositoryOwner, branchName } = params;

	return workflowStorage.getFilePath(
		generateWorkflowKey({
			workflowName,
			workflowParams: {
				owner: repositoryOwner,
				repo: repositoryName,
				branchName,
			},
		}),
	);
};

export const getWorkflowRunsStoragePath = (params: {
	workflowName: string;
	repositoryName: string;
	repositoryOwner: string;
	branchName?: string;
	runId: number;
}) => {
	const { workflowName, repositoryName, repositoryOwner, branchName, runId } =
		params;

	return workflowRunsStorage.getFilePath(
		generateWorkflowRunKey({
			workflowName,
			repositoryName,
			repositoryOwner,
			branchName,
			runId,
		}),
	);
};

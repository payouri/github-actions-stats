import type {
	EntityWithKey,
	MongoStorage,
} from "@github-actions-stats/storage";
import type {
	storedWorkflow,
	StoredWorkflowWithKey,
	StoredWorkflowDocument,
	storedWorkflowRun,
	StoredWorkflowRun,
} from "@github-actions-stats/workflow-entity";
import { z } from "zod";
import type { AsyncProcedureResponse, TRPCBuilder } from "../types.js";

export const getWorkflowsProcedureInputSchema = z.object({
	start: z.number(),
	count: z.number(),
});
export const getWorkflowRunsProcedureInputSchema = z.object({
	workflowKey: z.string(),
	start: z.number(),
	count: z.number(),
});

export type StoredWorkflowMongoStorage = MongoStorage<typeof storedWorkflow>;
export type StoredWorkflowRunsMongoStorage = MongoStorage<
	typeof storedWorkflowRun
>;
export type GetWorkflowsProcedureInput = z.infer<
	typeof getWorkflowsProcedureInputSchema
>;
export type GetWorkflowsProcedureResponse = AsyncProcedureResponse<
	StoredWorkflowDocument[],
	{
		code: "failed_to_get_workflows";
		message: string;
	}
>;

function buildGetWorkflowsProcedure(dependencies: {
	storedWorkflowMongoStorage: StoredWorkflowMongoStorage;
}): (params: {
	input: GetWorkflowsProcedureInput;
}) => GetWorkflowsProcedureResponse {
	const { storedWorkflowMongoStorage } = dependencies;

	return async ({ input }): GetWorkflowsProcedureResponse => {
		const { start, count } = input;
		const result = await storedWorkflowMongoStorage.query(
			{},
			{
				start,
				limit: count,
			},
		);

		return {
			hasFailed: false,
			data: result,
		} as const;
	};
}

export type GetWorkflowRunsProcedureInput = z.infer<
	typeof getWorkflowRunsProcedureInputSchema
>;
export type GetWorkflowRunsProcedureResponse = AsyncProcedureResponse<
	EntityWithKey<StoredWorkflowRun>[],
	{
		code: "failed_to_get_workflows";
		message: string;
	}
>;
function buildGetWorkflowRunsProcedure(dependencies: {
	storedWorkflowRunMongoStorage: StoredWorkflowRunsMongoStorage;
}): (params: {
	input: GetWorkflowRunsProcedureInput;
}) => GetWorkflowRunsProcedureResponse {
	const { storedWorkflowRunMongoStorage } = dependencies;

	return async ({ input }): GetWorkflowRunsProcedureResponse => {
		const { start, count, workflowKey } = input;
		const result = await storedWorkflowRunMongoStorage.query(
			{
				workflowKey,
			},
			{
				start,
				limit: count,
			},
		);

		return {
			hasFailed: false,
			data: result,
		} as const;
	};
}

export function buildWorkflowsProcedures(dependencies: {
	trpcInstance: ReturnType<TRPCBuilder["create"]>;
	storedWorkflowMongoStorage: StoredWorkflowMongoStorage;
	storedWorkflowRunMongoStorage: StoredWorkflowRunsMongoStorage;
}) {
	const {
		trpcInstance,
		storedWorkflowMongoStorage,
		storedWorkflowRunMongoStorage,
	} = dependencies;
	const getWorkflowsProcedure = buildGetWorkflowsProcedure({
		storedWorkflowMongoStorage,
	});
	const getWorkflowRunsProcedure = buildGetWorkflowRunsProcedure({
		storedWorkflowRunMongoStorage,
	});

	return {
		getWorkflows: trpcInstance.procedure
			.input(getWorkflowsProcedureInputSchema)
			.query(getWorkflowsProcedure),
		getWorkflowRuns: trpcInstance.procedure
			.input(getWorkflowRunsProcedureInputSchema)
			.query(getWorkflowRunsProcedure),
	};
}

import { z } from "zod";
import type {
	storedWorkflow,
	StoredWorkflow,
} from "@github-actions-stats/workflow-entity";
import type {
	LeanDocumentWithKey,
	MongoStorage,
} from "@github-actions-stats/storage";
import type { AsyncProcedureResponse, TRPCBuilder } from "../types.js";

type StoredWorkflowMongoStorage = MongoStorage<typeof storedWorkflow>;
const getWorkflowsProcedureInputSchema = z.object({
	start: z.number(),
	count: z.number(),
});

export type GetWorkflowsProcedureInput = z.infer<
	typeof getWorkflowsProcedureInputSchema
>;
export type GetWorkflowsProcedureResponse = AsyncProcedureResponse<
	LeanDocumentWithKey<StoredWorkflow>[],
	{
		code: "failed_to_get_workflows";
		message: string;
	}
>;

function buildGetWorkflowsProcedureProcedure(dependencies: {
	storedWorkflowMongoStorage: StoredWorkflowMongoStorage;
}): (params: {
	input: GetWorkflowsProcedureInput;
}) => GetWorkflowsProcedureResponse {
	const { storedWorkflowMongoStorage } = dependencies;

	return async ({ input }) => {
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

export function buildWorkflowsProcedures(dependencies: {
	trpcInstance: ReturnType<TRPCBuilder["create"]>;
	storedWorkflowMongoStorage: StoredWorkflowMongoStorage;
}) {
	const { trpcInstance, storedWorkflowMongoStorage } = dependencies;
	const getWorkflowsProcedure = buildGetWorkflowsProcedureProcedure({
		storedWorkflowMongoStorage,
	});

	return {
		getWorkflows: trpcInstance.procedure
			.input(getWorkflowsProcedureInputSchema)
			.query(getWorkflowsProcedure),
	};
}

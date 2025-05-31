import type { TRPCBuilder } from "./types.js";
import {
	buildWorkflowsProcedures,
	type GetWorkflowsProcedureInput,
	type GetWorkflowsProcedureResponse,
} from "./procedures/workflow.procedures.js";
import type { MongoStorage } from "@github-actions-stats/storage";
import type {
	aggregatedStatSchema,
	storedWorkflow,
	storedWorkflowRun,
	workflowStatSchema,
} from "@github-actions-stats/workflow-entity";
import SuperJSON from "superjson";

export type { GetWorkflowsProcedureInput, GetWorkflowsProcedureResponse };

export const buildWorkflowRouter = <
	Context extends object,
	Meta extends object,
	Builder extends TRPCBuilder<Context, Meta>,
>(dependencies: {
	trpc: Builder;
	storedWorkflowMongoStorage: MongoStorage<typeof storedWorkflow>;
	storedWorkflowRunMongoStorage: MongoStorage<typeof storedWorkflowRun>;
	workflowStatsMongoStorage: MongoStorage<typeof workflowStatSchema>;
	aggregatedWorkflowStatsMongoStorage: MongoStorage<
		typeof aggregatedStatSchema
	>;
}) => {
	const {
		trpc,
		storedWorkflowMongoStorage,
		storedWorkflowRunMongoStorage,
		workflowStatsMongoStorage,
		aggregatedWorkflowStatsMongoStorage,
	} = dependencies;
	const trpcInstance = trpc.create({
		transformer: SuperJSON,
	});
	const router = trpcInstance.router;
	const procedures = buildWorkflowsProcedures({
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		trpcInstance: trpcInstance as any,
		storedWorkflowMongoStorage,
		storedWorkflowRunMongoStorage,
		aggregatedWorkflowStatsMongoStorage,
		workflowStatsMongoStorage,
	});

	return {
		procedures,
		router: router(procedures),
		trpcInstance,
	};
};

export type WorkflowRouter = ReturnType<typeof buildWorkflowRouter>["router"];

import type { TRPCBuilder } from "./types.js";
import {
	buildWorkflowsProcedures,
	type GetWorkflowsProcedureInput,
	type GetWorkflowsProcedureResponse,
} from "./procedures/workflow.procedures.js";
import type { MongoStorage } from "@github-actions-stats/storage";
import type {
	storedWorkflow,
	storedWorkflowRun,
} from "@github-actions-stats/workflow-entity";

export type { GetWorkflowsProcedureInput, GetWorkflowsProcedureResponse };

export const buildWorkflowRouter = <Builder extends TRPCBuilder>(dependencies: {
	trpc: Builder;
	storedWorkflowMongoStorage: MongoStorage<typeof storedWorkflow>;
	storedWorkflowRunMongoStorage: MongoStorage<typeof storedWorkflowRun>;
}) => {
	const { trpc, storedWorkflowMongoStorage, storedWorkflowRunMongoStorage } =
		dependencies;
	const trpcInstance = trpc.create({});
	const router = trpcInstance.router;
	const procedures = buildWorkflowsProcedures({
		trpcInstance,
		storedWorkflowMongoStorage,
		storedWorkflowRunMongoStorage,
	});

	return {
		procedures,
		router: router(procedures),
		trpcInstance,
	};
};

export type WorkflowRouter = ReturnType<typeof buildWorkflowRouter>["router"];

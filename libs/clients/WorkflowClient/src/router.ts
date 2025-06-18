import type { TRPCBuilder } from "./types.js";
import {
	buildWorkflowsProcedures,
	type GetWorkflowsProcedureInput,
	type GetWorkflowsProcedureResponse,
} from "./procedures/workflow/workflow.procedures.js";
import type { MongoStorage } from "@github-actions-stats/storage";
import type {
	aggregatedStatSchema,
	AggregatedWorkflowStat,
	AggregatePeriod,
	storedWorkflow,
	storedWorkflowRun,
	workflowStatSchema,
} from "@github-actions-stats/workflow-entity";
import SuperJSON from "superjson";
import type { Octokit } from "octokit";
import type { pendingJobSchema } from "@github-actions-stats/pending-job-entity";
import type { MethodResult } from "@github-actions-stats/types-utils";
import { buildGitHubProcedures } from "./procedures/github/github.procedures.js";

export type { GetWorkflowsProcedureInput, GetWorkflowsProcedureResponse };

export type WorkflowClientDependencies<
	Context extends object,
	Meta extends object,
	Builder extends TRPCBuilder<Context, Meta>,
> = {
	trpc: Builder;
	storedWorkflowMongoStorage: MongoStorage<typeof storedWorkflow>;
	storedWorkflowRunMongoStorage: MongoStorage<typeof storedWorkflowRun>;
	workflowStatsMongoStorage: MongoStorage<typeof workflowStatSchema>;
	aggregatedWorkflowStatsMongoStorage: MongoStorage<
		typeof aggregatedStatSchema
	>;
	pendingJobsMongoStorage: MongoStorage<typeof pendingJobSchema>;
	getAggregatedWorkflowStats: (
		params: {
			workflowKey: string;
			period: AggregatePeriod;
			from: Date;
		},
		options?: {
			abortSignal?: AbortSignal;
		},
	) => Promise<
		MethodResult<
			AggregatedWorkflowStat[],
			"failed_to_save_aggregated_workflow_stat" | "abort_signal_aborted"
		>
	>;
	githubClient: Octokit["rest"];
	abortSignal: AbortSignal | undefined;
};

export const buildWorkflowRouter = <
	Context extends object,
	Meta extends object,
	Builder extends TRPCBuilder<Context, Meta>,
>(
	dependencies: WorkflowClientDependencies<Context, Meta, Builder>,
) => {
	const {
		trpc,
		storedWorkflowMongoStorage,
		storedWorkflowRunMongoStorage,
		workflowStatsMongoStorage,
		aggregatedWorkflowStatsMongoStorage,
		pendingJobsMongoStorage,
		getAggregatedWorkflowStats,
		githubClient,
		abortSignal,
	} = dependencies;
	const trpcInstance = trpc.create({
		transformer: SuperJSON,
	});
	const router = trpcInstance.router;
	const workflowProcedures = buildWorkflowsProcedures({
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		trpcInstance: trpcInstance as any,
		storedWorkflowMongoStorage,
		storedWorkflowRunMongoStorage,
		aggregatedWorkflowStatsMongoStorage,
		workflowStatsMongoStorage,
		githubClient,
		pendingJobsMongoStorage,
		getAggregatedWorkflowStats,
		abortSignal,
	});
	const githubProcedures = buildGitHubProcedures({
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		trpcInstance: trpcInstance as any,
		githubClient,
	});

	return {
		procedures: {
			...workflowProcedures,
			...githubProcedures,
		},
		router: router({
			...workflowProcedures,
			...githubProcedures,
		}),
		trpcInstance,
	};
};

export type WorkflowRouter = ReturnType<typeof buildWorkflowRouter>["router"];

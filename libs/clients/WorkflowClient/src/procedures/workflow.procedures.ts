import type {
	EntityWithKey,
	MongoStorage,
} from "@github-actions-stats/storage";
import { RequestError as OctokitRequestError } from "@octokit/request-error";
import {
	type AggregatedWorkflowStat,
	type StoredWorkflowDocument,
	type StoredWorkflowRun,
	type StoredWorkflowWithKey,
	aggregatePeriodSchema,
	type aggregatedStatSchema,
	createEmptyWorkflowData,
	generateWorkflowKey,
	type storedWorkflow,
	type storedWorkflowRun,
	type workflowStatSchema,
} from "@github-actions-stats/workflow-entity";
import dayjs from "dayjs";
import type { Octokit } from "octokit";
import { z } from "zod";
import type { AsyncProcedureResponse, TRPCBuilder } from "../types.js";
import { buildAggregateStatsOnPeriodAndSave } from "./helpers/aggregateStatsOnPeriod.js";

export const getWorkflowsProcedureInputSchema = z.object({
	start: z.number(),
	count: z.number(),
});
export const getWorkflowRunsProcedureInputSchema = z.object({
	workflowKey: z.string(),
	start: z.number(),
	count: z.number(),
});
export const getAggregatedWorkflowStatsProcedureInputSchema = z.object({
	workflowKey: z.string(),
	period: aggregatePeriodSchema,
	from: z.union([z.date(), z.string()]).transform((v): Date => {
		if (typeof v === "string") {
			const d = dayjs(v);
			if (d.isValid()) {
				return d.toDate();
			}
			throw new Error("Invalid date");
		}
		return v;
	}),
});
export const upsertWorkflowProcedureInputSchema = z.object({
	workflowId: z.coerce.number(),
	githubOwner: z.string(),
	githubRepository: z.string(),
});

type StoredWorkflowMongoStorage = MongoStorage<typeof storedWorkflow>;
type StoredWorkflowRunsMongoStorage = MongoStorage<typeof storedWorkflowRun>;
type WorkflowRunStatsMongoStorage = MongoStorage<typeof workflowStatSchema>;
type AggregatedWorkflowStatsMongoStorage = MongoStorage<
	typeof aggregatedStatSchema
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

type GetAggregatedWorkflowStatsProcedureInput = z.infer<
	typeof getAggregatedWorkflowStatsProcedureInputSchema
>;
type GetAggregatedWorkflowStatsProcedureResponse = AsyncProcedureResponse<
	AggregatedWorkflowStat[],
	{
		code: "failed_to_get_aggregated_workflow_stats";
		message: string;
	}
>;
function buildGetAggregatedWorkflowStatsProcedure(dependencies: {
	aggregatedWorkflowStatsMongoStorage: AggregatedWorkflowStatsMongoStorage;
	workflowRunStatsMongoStorage: WorkflowRunStatsMongoStorage;
}) {
	const { aggregatedWorkflowStatsMongoStorage, workflowRunStatsMongoStorage } =
		dependencies;
	const aggregateStatsOnPeriod = buildAggregateStatsOnPeriodAndSave({
		aggregatedWorkflowStatsMongoStorage,
		workflowRunStatsMongoStorage,
	});

	return async function getAggregatedWorkflowStatsProcedure(params: {
		input: GetAggregatedWorkflowStatsProcedureInput;
	}): GetAggregatedWorkflowStatsProcedureResponse {
		const {
			input: { workflowKey, period, from },
		} = params;

		const result = await aggregateStatsOnPeriod({
			workflowKey,
			period,
			from,
		});

		if (result.hasFailed) {
			return {
				hasFailed: true,
				code: "failed_to_get_aggregated_workflow_stats",
				message: result.error?.message,
			};
		}

		return {
			hasFailed: false,
			data: result.data,
		};
	};
}

export type UpsertWorkflowProcedureInput = z.infer<
	typeof upsertWorkflowProcedureInputSchema
>;
export type UpsertWorkflowProcedureResponse = AsyncProcedureResponse<
	StoredWorkflowWithKey,
	| {
			code: "failed_to_get_github_workflow";
			message: string;
	  }
	| {
			code: "failed_workflow_upsert";
			message: string;
	  }
>;

function buildUpsertWorkflowProcedure /* <Context extends object, Meta extends object, Instance > */(dependencies: {
	workflowMongoStorage: StoredWorkflowMongoStorage;
	githubClient: Octokit["rest"];
}) {
	const { workflowMongoStorage, githubClient } = dependencies;
	return async function createWorkflowProcedure(workflowDataParams: {
		input: UpsertWorkflowProcedureInput;
	}): UpsertWorkflowProcedureResponse {
		const { input: workflowData } = workflowDataParams;

		try {
			const getWorkflowResponse = await githubClient.actions.getWorkflow({
				owner: workflowData.githubOwner,
				repo: workflowData.githubRepository,
				workflow_id: workflowData.workflowId,
			});
			if (!getWorkflowResponse.data) {
				return {
					hasFailed: true,
					code: "failed_to_get_github_workflow",
					message: "failed_to_get_github_workflow",
				};
			}

			const key = generateWorkflowKey({
				workflowName: getWorkflowResponse.data.name,
				workflowParams: {
					owner: workflowData.githubOwner,
					repo: workflowData.githubRepository,
				},
			});
			const emptyWorkflowData = createEmptyWorkflowData({
				workflowId: workflowData.workflowId,
				workflowName: getWorkflowResponse.data.name,
				workflowOwner: workflowData.githubOwner,
				workflowRepository: workflowData.githubRepository,
			});

			const upsertResult = await workflowMongoStorage.set(
				key,
				emptyWorkflowData,
			);

			if (upsertResult.hasFailed) {
				return {
					hasFailed: true,
					code: "failed_workflow_upsert",
					message: "failed_workflow_upsert",
				};
			}

			return {
				hasFailed: false,
				data: {
					...emptyWorkflowData,
					key,
				},
			};
		} catch (error) {
			if (error instanceof OctokitRequestError) {
				return {
					hasFailed: true,
					code: "failed_to_get_github_workflow",
					message: error.message,
				};
			}
			throw new Error("Create workflow failed", {
				cause: error,
			});
		}
	};
}

export function buildWorkflowsProcedures<
	Context extends object,
	Meta extends object,
	Instance extends ReturnType<TRPCBuilder<Context, Meta>["create"]>,
>(dependencies: {
	trpcInstance: Instance;
	storedWorkflowMongoStorage: StoredWorkflowMongoStorage;
	storedWorkflowRunMongoStorage: StoredWorkflowRunsMongoStorage;
	workflowStatsMongoStorage: WorkflowRunStatsMongoStorage;
	aggregatedWorkflowStatsMongoStorage: AggregatedWorkflowStatsMongoStorage;
	githubClient: Octokit["rest"];
}) {
	const {
		trpcInstance,
		storedWorkflowMongoStorage,
		storedWorkflowRunMongoStorage,
		workflowStatsMongoStorage,
		aggregatedWorkflowStatsMongoStorage,
		githubClient,
	} = dependencies;
	const getWorkflowsProcedure = buildGetWorkflowsProcedure({
		storedWorkflowMongoStorage,
	});
	const getWorkflowRunsProcedure = buildGetWorkflowRunsProcedure({
		storedWorkflowRunMongoStorage,
	});
	const getAggregatedWorkflowStatsProcedure =
		buildGetAggregatedWorkflowStatsProcedure({
			aggregatedWorkflowStatsMongoStorage,
			workflowRunStatsMongoStorage: workflowStatsMongoStorage,
		});
	const upsertWorkflowProcedure = buildUpsertWorkflowProcedure({
		githubClient,
		workflowMongoStorage: storedWorkflowMongoStorage,
	});

	return {
		getWorkflows: trpcInstance.procedure
			.input(getWorkflowsProcedureInputSchema)
			.query(getWorkflowsProcedure),
		getWorkflowRuns: trpcInstance.procedure
			.input(getWorkflowRunsProcedureInputSchema)
			.query(getWorkflowRunsProcedure),
		getAggregatedWorkflowStats: trpcInstance.procedure
			.input(getAggregatedWorkflowStatsProcedureInputSchema)
			.query(getAggregatedWorkflowStatsProcedure),
		upsertWorkflow: trpcInstance.procedure
			.input(upsertWorkflowProcedureInputSchema)
			.query(upsertWorkflowProcedure),
	};
}

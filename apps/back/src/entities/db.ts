import type { RunCompletionStatus } from "@github-actions-stats/common-entity";
import type { MongoSortOptions } from "@github-actions-stats/storage";
import type { FormattedWorkflowRun } from "@github-actions-stats/workflow-entity";
import { ObjectId } from "mongodb";
import {
	generateWorkflowRunKey,
	getWorkflowParamsFromKey,
} from "../helpers/generateWorkflowKey.js";
import type { WorkflowQueueJobData } from "../queues/types.js";
import { buildLoadWorkflowData } from "./FormattedWorkflow/storage/methods/loadWorkflowData.js";
import { buildSaveWorkflowData } from "./FormattedWorkflow/storage/methods/saveWorkflowData.js";
import {
	workflowMongoStorage,
	workflowRunsMongoStorage,
} from "./FormattedWorkflow/storage/mongo.js";
import type { StoredFormattedWorkflowRunDocument } from "./FormattedWorkflow/types.js";
import type { DEFAULT_PENDING_JOB_GROUP } from "./PendingJob/constants.js";
import { pendingJobsMongoStorage } from "./PendingJob/storage/mongo.js";
import type { PendingJob } from "./PendingJob/types.js";
import { buildAggregateStatsOnPeriodAndSave } from "./WorkflowStat/methods/aggregateStatsOnPeriod.js";
import { buildUpsertWorkflowRunStat } from "./WorkflowStat/methods/createWorkflowStat.js";
import {
	aggregatedWorkflowStatsMongoStorage,
	workflowRunStatsMongoStorage,
} from "./WorkflowStat/storage/mongo.js";

const loadWorkflowData = buildLoadWorkflowData({
	workflowRunsStorage: workflowRunsMongoStorage,
	workflowStorage: workflowMongoStorage,
});
const saveWorkflowData = buildSaveWorkflowData({
	workflowRunsStorage: workflowRunsMongoStorage,
	workflowStorage: workflowMongoStorage,
});
const upsertWorkflowRunStat = buildUpsertWorkflowRunStat({
	workflowRunStatsStorage: workflowRunStatsMongoStorage,
});
const aggregateAndSaveStats = buildAggregateStatsOnPeriodAndSave({
	aggregatedWorkflowStatsMongoStorage,
	workflowRunStatsMongoStorage,
});

function getMongoSort(
	params:
		| {
				type: "startedAt";
				order: "asc" | "desc";
		  }
		| {
				type: "completedAt";
				order: "asc" | "desc";
		  },
): MongoSortOptions<StoredFormattedWorkflowRunDocument> {
	if (params.type === "startedAt") {
		return {
			startedAt: params.order === "asc" ? 1 : -1,
		};
	}
	return {
		completedAt: params.order === "asc" ? 1 : -1,
	};
}

export const DB = {
	queries: {
		async getNextQueueJob(params: {
			user: typeof DEFAULT_PENDING_JOB_GROUP | `user_${string}`;
		}) {
			const [job] = await pendingJobsMongoStorage.query(
				{
					group: params.user,
				},
				{
					sort: {
						createdAt: 1,
					},
					limit: 1,
				},
			);
			if (!job) return null;

			return job;
		},
		getRuns(
			params: {
				status?: RunCompletionStatus;
			} & (
				| {
						runKeys: string[];
				  }
				| {
						workflowKey: string;
				  }
			),
			options?: {
				start?: number;
				count?: number;
				sort?:
					| {
							type: "startedAt";
							order: "asc" | "desc";
					  }
					| {
							type: "completedAt";
							order: "asc" | "desc";
					  };
			},
		) {
			const { status } = params;
			const {
				count = 10,
				sort = { type: "completedAt", order: "desc" },
				start = 0,
			} = options ?? {};
			return workflowRunsMongoStorage.query(
				{
					...("workflowKey" in params
						? getWorkflowParamsFromKey(params.workflowKey)
						: {
								key: { $in: params.runKeys },
							}),
					status,
				},
				{
					sort: getMongoSort(sort),
					limit: count,
					start,
				},
			);
		},
		async countDocumentsOnVersion(params: { version: string }) {
			const [workflowCount, workflowRunCount] = await Promise.all([
				workflowMongoStorage.count({
					version: params.version,
				}),
				workflowRunsMongoStorage.count({
					version: params.version,
				}),
			]);

			return {
				workflowCount,
				workflowRunCount,
			};
		},
		getRunData(
			params:
				| { runId: number; workflowKey: string }
				| {
						runKey: string;
				  },
		) {
			return workflowRunsMongoStorage.get(
				"runKey" in params
					? params.runKey
					: generateWorkflowRunKey({
							runId: params.runId,
							workflowKey: params.workflowKey,
						}),
			);
		},
		getWorkflowData(params: { workflowKey: string }) {
			return workflowMongoStorage.get(params.workflowKey);
		},
		async isExistingWorkflow(params: {
			workflowKey: string;
		}): Promise<boolean> {
			return (
				(
					await workflowMongoStorage.query(
						{
							key: params.workflowKey,
						},
						{
							limit: 1,
							projection: { key: 1, _id: 0 },
						},
					)
				).length > 0
			);
		},
		fetchWorkflowDataWithOldestRun(params: { workflowKey: string }) {
			return loadWorkflowData(
				{
					workflowKey: params.workflowKey,
				},
				{
					onlyOldestRun: true,
				},
			);
		},
		fetchWorkflowDataWithNewestRun(params: { workflowKey: string }) {
			return loadWorkflowData(
				{
					workflowKey: params.workflowKey,
				},
				{
					maxRunsToLoad: 1,
				},
			);
		},
	},
	mutations: {
		async addWorkflowRun(params: {
			workflowKey: string;
			workflowRun: FormattedWorkflowRun & {
				workflowId: number;
				workflowName: string;
				repositoryName: string;
				repositoryOwner: string;
				workflowKey: string;
				branchName?: string;
			};
		}) {
			const clientSession = await workflowRunsMongoStorage.startTransaction();
			try {
				const setResult = await workflowRunsMongoStorage.set(
					generateWorkflowRunKey({
						workflowKey: params.workflowKey,
						runId: params.workflowRun.runId,
					}),
					params.workflowRun,
					{
						session: clientSession,
					},
				);
				if (setResult.hasFailed) {
					await clientSession?.abortTransaction();
					return setResult;
				}
				if (setResult.data.wasExistingKey) {
					return {
						hasFailed: false,
					} as const;
				}
				await workflowMongoStorage.updateWithMongoSyntax(
					{
						key: params.workflowKey,
					},
					{
						$inc: {
							totalWorkflowRuns: 1,
						},
					},
				);
				await clientSession?.commitTransaction();
				return {
					hasFailed: false,
				} as const;
			} catch (error) {
				await clientSession?.abortTransaction();
				throw error;
			}
		},
		deletePendingJob(params: { jobId: string }) {
			return pendingJobsMongoStorage.delete(params.jobId);
		},
		aggregateAndSaveStats,
		saveWorkflowData,
		upsertWorkflowRunStat,
		createPendingJob(
			params: Omit<PendingJob, "data"> &
				WorkflowQueueJobData & {
					jobKey?: string;
				},
		) {
			const { jobKey, ...jobData } = params;
			return pendingJobsMongoStorage.set(
				jobKey || new ObjectId().toString(),
				jobData,
			);
		},
	},
} as const;

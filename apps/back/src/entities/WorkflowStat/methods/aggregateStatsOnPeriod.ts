import type {
	AggregatePeriod,
	AggregatedWorkflowStat,
	WorkflowRunStat,
} from "@github-actions-stats/workflow-entity";
import { join } from "node:path";
import { AbortError } from "../../../errors/AbortError.js";
import { getDateIntervals } from "../helpers/getDateIntervals.js";
import { getPeriodBoundaries } from "../helpers/getPeriodBoundaries.js";
import type {
	AggregatedWorkflowStatsMongoStorage,
	WorkflowRunStatsMongoStorage,
} from "../storage/mongo.js";
import type { MethodResult } from "@github-actions-stats/types-utils";
import dayjs from "dayjs";

const limit = 100;

export function buildAggregateStatsOnPeriodAndSave(dependencies: {
	aggregatedWorkflowStatsMongoStorage: AggregatedWorkflowStatsMongoStorage;
	workflowRunStatsMongoStorage: WorkflowRunStatsMongoStorage;
}) {
	const { aggregatedWorkflowStatsMongoStorage, workflowRunStatsMongoStorage } =
		dependencies;

	return async function aggregateStatsOnPeriod(
		params: {
			workflowKey: string;
			period: AggregatePeriod;
			from: Date;
		},
		options?: {
			abortSignal?: AbortSignal;
		},
	): Promise<
		MethodResult<
			AggregatedWorkflowStat[],
			"failed_to_save_aggregated_workflow_stat" | "abort_signal_aborted"
		>
	> {
		const { workflowKey, from: fromDate, period } = params;
		const { to, from, intervalMs } = getPeriodBoundaries(period, fromDate);
		const { abortSignal } = options ?? {};

		const batches = getDateIntervals({
			from,
			to,
			intervalMs,
		});

		const allAggregatedStats: AggregatedWorkflowStat[] = [];

		for (const batch of batches) {
			if (abortSignal?.aborted) {
				return {
					hasFailed: true,
					error: {
						code: "abort_signal_aborted",
						message: "Aborted",
						error: new AbortError({
							message: "Batch iteration aborted",
							signal: abortSignal,
							abortReason:
								typeof abortSignal.reason === "string"
									? abortSignal.reason
									: JSON.stringify(abortSignal.reason),
						}),
						data: undefined,
					},
				};
			}
			const { from: batchFrom, to: batchTo } = batch;
			const [aggregated, runsCount] = await Promise.all([
				aggregatedWorkflowStatsMongoStorage
					.get(
						join(
							workflowKey,
							period,
							batchFrom.toISOString(),
							batchTo.toISOString(),
						),
					)
					.then((queryResult) => {
						if (!queryResult)
							return {
								period,
								aggregatedJobsStats: {},
								maxRunDurationMs: 0,
								minRunDurationMs: Number.MAX_SAFE_INTEGER,
								meanRunDurationMs: 0,
								minCompletedRunDurationMs: Number.MAX_SAFE_INTEGER,
								periodEnd: batchTo,
								periodStart: batchFrom,
								totalDurationMsByJobName: {},
								totalDurationMsByStepsName: {},
								totalDurationMsByStatus: {},
								workflowId: -1,
								workflowName: "",
								runsCount: 0,
								runsDetails: [],
								runsIds: [],
								runsDurationMs: 0,
								statusCount: {},
								workflowKey,
							};
						return queryResult;
					}),
				workflowRunStatsMongoStorage.count({
					workflowKey,
					startedAt: {
						$gte: batchFrom,
						$lte: batchTo,
					},
				}),
			]);
			if (runsCount === aggregated.runsCount) {
				allAggregatedStats.push(aggregated);
				continue;
			}

			let current: WorkflowRunStat[] | null = null;
			let total = 0;
			while (current === null || current.length > 0) {
				if (abortSignal?.aborted) {
					return {
						hasFailed: true,
						error: {
							code: "abort_signal_aborted",
							message: "Aborted",
							error: new AbortError({
								message: "Batch aggregation aborted",
								signal: abortSignal,
								abortReason:
									typeof abortSignal.reason === "string"
										? abortSignal.reason
										: JSON.stringify(abortSignal.reason),
							}),
							data: undefined,
						},
					};
				}

				current = await workflowRunStatsMongoStorage.query(
					{
						workflowKey,
						startedAt: {
							$gte: batchFrom,
							$lte: batchTo,
						},
					},
					{
						limit,
						start: current?.length || 0,
						sort: {
							startedAt: 1,
						},
					},
				);
				total += current.length;
				if (!current?.length) continue;

				for (const run of current) {
					const {
						runId,
						durationMs,
						completionState,
						jobDurationMap,
						stepsDurationMs,
						jobs,
						workflowId,
						workflowName,
						workflowKey,
						completedAt,
						startedAt,
					} = run;
					if (aggregated.workflowId < 0) {
						aggregated.workflowId = workflowId;
						aggregated.workflowName = workflowName;
						aggregated.workflowKey = workflowKey;
					}
					if (durationMs > aggregated.maxRunDurationMs) {
						aggregated.maxRunDurationMs = durationMs;
					}
					if (durationMs < aggregated.minRunDurationMs) {
						aggregated.minRunDurationMs = durationMs;
					}
					if (
						completionState === "success" &&
						durationMs < aggregated.minCompletedRunDurationMs
					) {
						aggregated.minCompletedRunDurationMs = durationMs;
					}
					aggregated.meanRunDurationMs += durationMs;
					aggregated.runsDurationMs += durationMs;
					aggregated.totalDurationMsByStatus[completionState] =
						(aggregated.totalDurationMsByStatus[completionState] ?? 0) +
						durationMs;
					aggregated.statusCount[completionState] =
						(aggregated.statusCount[completionState] ?? 0) + 1;
					aggregated.runsIds.push(runId);

					aggregated.runsDetails.push({
						durationMs,
						runId,
						status: completionState,
						runEnd: completedAt,
						runStart: startedAt,
						jobs: jobs.map((job) => ({
							name: job.name,
							jobId: job.jobId,
							status: job.status,
							jobStart: job.jobStart,
							jobEnd: job.jobEnd,
							durationMs: job.durationMs,
						})),
					});

					for (const job of jobs) {
						const jobName = job.name;
						if (!aggregated.totalDurationMsByJobName[jobName]) {
							aggregated.totalDurationMsByJobName[jobName] = 0;
						}
						if (typeof jobDurationMap[job.jobId] === "number") {
							aggregated.totalDurationMsByJobName[jobName] +=
								jobDurationMap[job.jobId];
						}
						if (!aggregated.aggregatedJobsStats[jobName]) {
							aggregated.aggregatedJobsStats[jobName] = {
								name: jobName,
								aggregatedSteps: {},
								durationMs: 0,
								count: 0,
								byConclusion: {},
								byStatus: {},
							};
						}
						aggregated.aggregatedJobsStats[jobName].count += 1;
						aggregated.aggregatedJobsStats[jobName].durationMs +=
							job.durationMs;
						if (
							!aggregated.aggregatedJobsStats[jobName].byConclusion[
								job.conclusion
							]
						) {
							aggregated.aggregatedJobsStats[jobName].byConclusion[
								job.conclusion
							] = {
								count: 0,
								durationMs: 0,
							};
						}
						if (!aggregated.aggregatedJobsStats[jobName].byStatus[job.status]) {
							aggregated.aggregatedJobsStats[jobName].byStatus[job.status] = {
								count: 0,
								durationMs: 0,
							};
						}
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						aggregated.aggregatedJobsStats[jobName].byConclusion[
							job.conclusion
						]!.count += 1;
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						aggregated.aggregatedJobsStats[jobName].byConclusion[
							job.conclusion
						]!.durationMs += job.durationMs;
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						aggregated.aggregatedJobsStats[jobName].byStatus[
							job.status
						]!.count += 1;
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						aggregated.aggregatedJobsStats[jobName].byStatus[
							job.status
						]!.durationMs += job.durationMs;

						for (const step of job.steps) {
							const { name: stepName, durationMs: stepDuration } = step;
							const computedStepName = `${jobName}>${stepName}`;
							if (
								!aggregated.aggregatedJobsStats[jobName].aggregatedSteps[
									stepName
								]
							) {
								aggregated.aggregatedJobsStats[jobName].aggregatedSteps[
									stepName
								] = {
									count: 0,
									durationMs: 0,
								};
							}
							aggregated.totalDurationMsByStepsName[computedStepName] =
								(aggregated.totalDurationMsByStepsName?.[computedStepName] ??
									0) + stepDuration;
							aggregated.aggregatedJobsStats[jobName].aggregatedSteps[
								stepName
							].count += 1;
							aggregated.aggregatedJobsStats[jobName].aggregatedSteps[
								stepName
							].durationMs += stepDuration;
						}
					}
				}
			}
			aggregated.meanRunDurationMs /= total > 0 ? total : 1;
			aggregated.runsCount = total;

			if (total > 0) {
				const saveResult = await aggregatedWorkflowStatsMongoStorage.set(
					join(
						workflowKey,
						period,
						batchFrom.toISOString(),
						batchTo.toISOString(),
					),
					aggregated,
				);

				if (saveResult.hasFailed) {
					return {
						hasFailed: true,
						error: {
							code: "failed_to_save_aggregated_workflow_stat",
							message: "Failed to save aggregated workflow stat",
							error: saveResult.error.error,
							data: {
								parentError: saveResult.error,
								workflowKey,
								period,
							},
						},
					};
				}
			}

			allAggregatedStats.push(aggregated);
		}

		return {
			hasFailed: false,
			data: allAggregatedStats,
		};
	};
}

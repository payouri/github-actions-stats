import { join } from "node:path";
import type { z } from "zod";
import { getDateIntervals } from "../helpers/getDateIntervals.js";
import { getPeriodBoundaries } from "../helpers/getPeriodBoundaries.js";
import { aggregatePeriodSchema } from "../schemas/aggregatedStat.schema.js";
import type {
  AggregatedWorkflowStatsMongoStorage,
  WorkflowRunStatsMongoStorage,
} from "../storage/mongo.js";
import type { AggregatedWorkflowStat, WorkflowRunStat } from "../types.js";
import { AbortError } from "../../../errors/AbortError.js";

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
      period: z.infer<typeof aggregatePeriodSchema>;
      from: Date;
    },
    options?: {
      abortSignal?: AbortSignal;
    }
  ) {
    const { workflowKey, from: fromDate, period } = params;
    const { to, from, intervalMs } = getPeriodBoundaries(period, fromDate);
    const { abortSignal } = options ?? {};

    const batches = getDateIntervals({
      from,
      to,
      intervalMs,
    });

    for (const batch of batches) {
      if (abortSignal?.aborted) {
        return {
          hasFailed: true,
          error: {
            code: "aborted",
            message: "Aborted",
            error: new AbortError({
              message: "Aggregation aborted",
              signal: abortSignal,
              abortReason: JSON.stringify(abortSignal.reason),
            }),
            data: undefined,
          },
        };
      }
      const { from: batchFrom, to: batchTo } = batch;
      const aggregated: AggregatedWorkflowStat = {
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
        workflowKey: "",
      };

      let current: WorkflowRunStat[] | null = null;
      let total = 0;
      while (current !== null && current.length > 0) {
        if (abortSignal?.aborted) {
          return {
            hasFailed: true,
            error: {
              code: "aborted",
              message: "Aborted",
              error: new AbortError({
                message: "Batch aggregation aborted",
                signal: abortSignal,
                abortReason: JSON.stringify(abortSignal.reason),
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
            sort: {
              startedAt: 1,
            },
          }
        );
        total += current.length;
        if (!current?.length) continue;

        for (const run of current) {
          const {
            runId,
            durationMs,
            completionState,
            jobDurationMap,
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

          jobs.forEach((job) => {
            const jobName = job.name;
            aggregated.totalDurationMsByJobName[jobName] =
              (aggregated.totalDurationMsByJobName[jobName] ?? 0) +
              jobDurationMap[job.name];
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
            aggregated.aggregatedJobsStats[jobName].byConclusion[
              job.conclusion
            ]!.count += 1;
            aggregated.aggregatedJobsStats[jobName].byConclusion[
              job.conclusion
            ]!.durationMs += job.durationMs;
            aggregated.aggregatedJobsStats[jobName].byStatus[
              job.status
            ]!.count += 1;
            aggregated.aggregatedJobsStats[jobName].byStatus[
              job.status
            ]!.durationMs += job.durationMs;

            for (const step of job.steps) {
              const { name: stepName, durationMs: stepDuration, status } = step;
              const computedStepName = `${jobName}>${stepName}`;
              aggregated.totalDurationMsByStepsName[computedStepName] =
                (aggregated.totalDurationMsByStepsName[computedStepName] ?? 0) +
                stepDuration;
              if (
                !aggregated.aggregatedJobsStats[computedStepName]
                  .aggregatedSteps[stepName]
              ) {
                aggregated.aggregatedJobsStats[
                  computedStepName
                ].aggregatedSteps[stepName] = {
                  count: 0,
                  durationMs: 0,
                };
              }
              aggregated.aggregatedJobsStats[computedStepName].count += 1;
              aggregated.aggregatedJobsStats[computedStepName].durationMs +=
                stepDuration;
            }
          });
        }
      }
      aggregated.meanRunDurationMs /= total;
      aggregated.runsCount = total;

      const saveResult = await aggregatedWorkflowStatsMongoStorage.set(
        join(workflowKey, period),
        aggregated
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

    return {
      hasFailed: false,
    };
  };
}

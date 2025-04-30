import { z } from "zod";
import {
  runCompletionStatusSchema,
  runDataJobIdSchema,
  runStepStatus,
  workflowIdSchema,
  workflowRunId,
} from "../../shared.schema.js";

const durationMsField = z.number();
export const aggregatePeriodSchema = z.enum(["day", "week", "month"]);

export const baseStatsRecord = z.object({
  durationMs: durationMsField,
  count: z.number(),
});

export const defaultStatsRecord = baseStatsRecord.merge(
  z.object({
    byConclusion: z.record(runCompletionStatusSchema, baseStatsRecord),
    byStatus: z.record(runStepStatus, baseStatsRecord),
  })
);

export const aggregatedStatSchema = z.object({
  workflowKey: z.string(),
  workflowName: z.string(),
  workflowId: workflowIdSchema,
  periodStart: z.date(),
  periodEnd: z.date(),
  period: aggregatePeriodSchema,
  runsCount: z.number(),
  runsDurationMs: z.number(),
  maxRunDurationMs: z.number(),
  minRunDurationMs: z.number(),
  meanRunDurationMs: z.number(),
  minCompletedRunDurationMs: z.number(),
  runsIds: z.array(workflowRunId),
  totalDurationMsByStatus: z.record(runCompletionStatusSchema, z.number()),
  totalDurationMsByStepsName: z.record(z.string(), z.number()),
  totalDurationMsByJobName: z.record(z.string(), z.number()),
  aggregatedJobsStats: z.record(
    z.string(),
    defaultStatsRecord.merge(
      z.object({
        name: z.string(),
        durationMs: durationMsField,
        aggregatedSteps: z.record(z.string(), defaultStatsRecord),
      })
    )
  ),
  runsDetails: z.array(
    z.object({
      runId: runDataJobIdSchema,
      durationMs: durationMsField,
      status: runCompletionStatusSchema,
      runStart: z.date(),
      runEnd: z.date(),
      jobs: z.array(
        z.object({
          name: z.string(),
          jobId: runDataJobIdSchema,
          status: runCompletionStatusSchema,
          jobStart: z.date(),
          jobEnd: z.date(),
          durationMs: durationMsField,
        })
      ),
    })
  ),
});

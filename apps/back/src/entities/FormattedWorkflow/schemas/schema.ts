import { z } from "zod";
import { runJobDataSchema } from "./formattedJob.schema.js";
import { runDataJobIdSchema, workflowRunId } from "./shared.js";

export const githubJobDataSchema = z.object({
  job_id: runDataJobIdSchema,
  duration_ms: z.number(),
  data: runJobDataSchema.nullable().optional(),
});

export const runUsageDataSchema = z.object({
  billable: z.object({
    durationPerLabel: z.record(z.string(), z.number()),
    totalMs: z.number(),
    jobsCount: z.number(),
    jobRuns: z.array(githubJobDataSchema).optional(),
  }),
  run_duration_ms: z.number().optional(),
});

export const formattedWorkflowRunStatusSchema = z.enum([
  "completed",
  "action_required",
  "cancelled",
  "failure",
  "neutral",
  "skipped",
  "stale",
  "success",
  "timed_out",
  "in_progress",
  "queued",
  "requested",
  "waiting",
  "pending",
  "unknown",
]);

export const formattedWorkflowRunConclusionSchema = z.enum([
  "success",
  "failure",
  "neutral",
  "cancelled",
  "skipped",
  "timed_out",
]);

export const WORKFLOW_RUN_SCHEMA_VERSION = "1.0.0";
export const formattedWorkflowRunSchema = Object.assign(
  z.object({
    name: z.string(),
    status: formattedWorkflowRunStatusSchema,
    conclusion: formattedWorkflowRunConclusionSchema.nullable(),
    runAt: z.union([z.string(), z.date()]).transform((val) => {
      if (val instanceof Date) return val;

      return new Date(val);
    }),
    week_year: z.string(),
    runId: workflowRunId,
    workflowId: z.number(),
    startedAt: z.union([z.string(), z.date()]).transform((val) => {
      if (val instanceof Date) return val;

      return new Date(val);
    }),
    completedAt: z.union([z.string(), z.date()]).transform((val) => {
      if (val instanceof Date) return val;

      return new Date(val);
    }),
    usageData: runUsageDataSchema.nullable(),
  }),
  { version: WORKFLOW_RUN_SCHEMA_VERSION }
);

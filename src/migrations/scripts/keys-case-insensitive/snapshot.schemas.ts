import { z } from "zod";

export const runDataJobIdSchema = z.number();
export const workflowRunId = z.number();

export const runCompletionStatusSchema = z.enum([
  "success",
  "failure",
  "neutral",
  "cancelled",
  "skipped",
  "timed_out",
  "action_required",
]);
export const runStatus = z.enum([
  "queued",
  "in_progress",
  "completed",
  "waiting",
  "requested",
  "pending",
]);
export const stepStatus = z.enum(["queued", "in_progress", "completed"]);

export const runJobDataSchema = z.object({
  id: runDataJobIdSchema,
  run_id: workflowRunId,
  run_url: z.string(),
  run_attempt: z.number().optional(),
  node_id: z.string(),
  head_sha: z.string(),
  url: z.string(),
  html_url: z.string().nullable(),
  status: runStatus,
  conclusion: runCompletionStatusSchema.nullable(),
  created_at: z.union([z.string(), z.date()]).transform((val) => {
    if (val instanceof Date) return val;

    return new Date(val);
  }),
  started_at: z
    .union([z.string().nullable(), z.null(), z.date()])
    .transform((val) => {
      if (!val) return null;
      if (val instanceof Date) return val;

      return new Date(val);
    })
    .nullable()
    .optional(),
  completed_at: z
    .union([z.string().nullable(), z.null(), z.date()])
    .transform((val) => {
      if (!val) return null;
      if (val instanceof Date) return val;

      return new Date(val);
    })
    .nullable()
    .optional(),
  name: z.string(),
  steps: z
    .array(
      z.object({
        status: stepStatus,
        conclusion: z.string().nullable(),
        name: z.string(),
        number: z.number(),
        started_at: z
          .union([z.string().nullable(), z.null(), z.date()])
          .transform((val) => {
            if (!val) return null;
            if (val instanceof Date) return val;

            return new Date(val);
          })
          .nullable()
          .optional(),
        completed_at: z
          .union([z.string().nullable(), z.null(), z.date()])
          .transform((val) => {
            if (!val) return null;
            if (val instanceof Date) return val;

            return new Date(val);
          })
          .nullable()
          .optional(),
      })
    )
    .optional(),
  check_run_url: z.string(),
  labels: z.array(z.string()),
  runner_id: z.number().nullable(),
  runner_name: z.string().nullable(),
  runner_group_id: z.number().nullable(),
  runner_group_name: z.string().nullable(),
  workflow_name: z.string().nullable(),
  head_branch: z.string().nullable(),
});

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
    usageData: runUsageDataSchema.nullable(),
  }),
  { version: "1.0.0" }
);

export const retrievedWorkflowSchema = Object.assign(
  z.object({
    workflowId: z.number(),
    workflowName: z.string(),
    workflowParams: z.object({
      owner: z.string(),
      repo: z.string(),
      branchName: z.string().optional(),
      workflowStatus: z.string().optional(),
      triggerEvent: z.string().optional(),
    }),
    workflowWeekRunsMap: z.record(
      z.string(),
      z.array(formattedWorkflowRunSchema)
    ),
    totalWorkflowRuns: z.number(),
    lastRunAt: z.union([z.string(), z.date()]).transform((val) => {
      if (val instanceof Date) return val;

      return new Date(val);
    }),
    oldestRunAt: z.union([z.string(), z.date()]).transform((val) => {
      if (val instanceof Date) return val;

      return new Date(val);
    }),
    lastUpdatedAt: z.union([z.string(), z.date()]).transform((val) => {
      if (val instanceof Date) return val;

      return new Date(val);
    }),
  }),
  { version: "1.0.0" }
);

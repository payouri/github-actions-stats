import { z } from "zod";

export const runDataJobIdSchema = z.number();
export const workflowRunId = z.number();

export const runCompletionStatusSchema = z.union([
  z.literal("success"),
  z.literal("failure"),
  z.literal("neutral"),
  z.literal("cancelled"),
  z.literal("skipped"),
  z.literal("timed_out"),
  z.literal("action_required"),
]);

export const runJobDataSchema = z.object({
  id: runDataJobIdSchema,
  run_id: workflowRunId,
  run_url: z.string(),
  run_attempt: z.number().optional(),
  node_id: z.string(),
  head_sha: z.string(),
  url: z.string(),
  html_url: z.string().nullable(),
  status: z.union([
    z.literal("queued"),
    z.literal("in_progress"),
    z.literal("completed"),
    z.literal("waiting"),
    z.literal("requested"),
    z.literal("pending"),
  ]),
  conclusion: runCompletionStatusSchema.nullable(),
  created_at: z.string(),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  name: z.string(),
  steps: z
    .array(
      z.object({
        status: z.union([
          z.literal("queued"),
          z.literal("in_progress"),
          z.literal("completed"),
        ]),
        conclusion: z.string().nullable(),
        name: z.string(),
        number: z.number(),
        started_at: z.string().optional().nullable(),
        completed_at: z.string().optional().nullable(),
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
    UBUNTU: z
      .object({
        total_ms: z.number(),
        jobs: z.number(),
        job_runs: z.array(githubJobDataSchema).optional(),
      })
      .optional(),
    MACOS: z
      .object({
        total_ms: z.number(),
        jobs: z.number(),
        job_runs: z.array(githubJobDataSchema).optional(),
      })
      .optional(),
    WINDOWS: z
      .object({
        total_ms: z.number(),
        jobs: z.number(),
        job_runs: z.array(githubJobDataSchema).optional(),
      })
      .optional(),
  }),
  run_duration_ms: z.number().optional(),
});

export const formattedWorkflowRunSchema = z.object({
  name: z.string(),
  status: z.string(),
  runAt: z.string(),
  week_year: z.string(),
  runId: workflowRunId,
  workflowId: z.number(),
  usageData: runUsageDataSchema.nullable(),
});

import { z } from "zod";
import { runDataJobIdSchema, workflowRunId } from "./shared.js";

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

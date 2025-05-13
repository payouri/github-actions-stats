import { z } from "zod";

export const runDataJobIdSchema = z.number();
export const workflowRunId = z.number();
export const workflowIdSchema = z.number();

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

// export const runCompletionStatus

export const runStepStatus = z.enum(["queued", "in_progress", "completed"]);

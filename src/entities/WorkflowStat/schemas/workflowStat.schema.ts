import { z } from "zod";
import {
  runCompletionStatusSchema,
  runDataJobIdSchema,
  workflowIdSchema,
} from "../../shared.schema.js";

export const workflowStatSchema = z.object({
  workflowId: workflowIdSchema,
  workflowName: z.string(),
  workflowKey: z.string(),
  runId: runDataJobIdSchema,
  runKey: z.string(),
  completionState: runCompletionStatusSchema,
  startedAt: z.date(),
  completedAt: z.date(),
  durationMs: z.number(),
  stepsDurationMs: z.record(z.string(), z.number()),
  jobDurationMap: z.record(z.string(), z.record(z.string(), z.number())),
  steps: z.array(
    z.object({
      stepId: z.number(),
      durationMs: z.number(),
      status: runCompletionStatusSchema,
      name: z.string(),
      stepStart: z.date(),
      stepEnd: z.date(),
      jobs: z.array(
        z.object({
          name: z.string(),
          jobId: runDataJobIdSchema,
          status: runCompletionStatusSchema,
          jobStart: z.date(),
          jobEnd: z.date(),
          durationMs: z.number(),
        })
      ),
    })
  ),
});

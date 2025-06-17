import { z } from "zod";
import {
	runCompletionStatusSchema,
	runDataJobIdSchema,
	runStatus,
	runStepStatus,
	workflowIdSchema,
} from "@github-actions-stats/common-entity";

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
	jobDurationMap: z.record(z.string(), z.number()), // jobId => durationMs
	stepsDurationMs: z.record(z.string(), z.record(z.string(), z.number())),
	jobs: z.array(
		z.object({
			jobId: z.number(),
			durationMs: z.number(),
			status: runStatus.or(z.literal("unknown")),
			conclusion: runCompletionStatusSchema.or(z.literal("unknown")),
			name: z.string(),
			jobStart: z.date(),
			jobEnd: z.date(),
			steps: z.array(
				z.object({
					name: z.string(),
					jobId: runDataJobIdSchema,
					status: runStepStatus,
					jobStart: z.date(),
					jobEnd: z.date(),
					durationMs: z.number(),
				}),
			),
		}),
	),
});

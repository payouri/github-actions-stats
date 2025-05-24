import type { z } from "zod";
import type {
	runCompletionStatusSchema,
	runDataJobIdSchema,
	runStatus,
	runStepStatus,
	workflowIdSchema,
} from "./schemas.js";

export type WorkflowIdSchema = z.infer<typeof workflowIdSchema>;
export type RunDataJobIdSchema = z.infer<typeof runDataJobIdSchema>;
export type WorkflowRunId = z.infer<typeof workflowIdSchema>;
export type RunCompletionStatus = z.infer<typeof runCompletionStatusSchema>;
export type RunStatus = z.infer<typeof runStatus>;
export type RunStepStatus = z.infer<typeof runStepStatus>;

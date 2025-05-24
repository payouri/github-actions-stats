import { z } from "zod";

const workflowIdSchema = z.number();
const runDataJobIdSchema = z.number();
const workflowRunId = z.number();

const runCompletionStatusSchema = z.enum([
	"success",
	"failure",
	"neutral",
	"cancelled",
	"skipped",
	"timed_out",
	"action_required",
]);
const runStatus = z.enum([
	"queued",
	"in_progress",
	"completed",
	"waiting",
	"requested",
	"pending",
]);

const runStepStatus = z.enum(["queued", "in_progress", "completed"]);

export {
	workflowIdSchema,
	runDataJobIdSchema,
	workflowRunId,
	runCompletionStatusSchema,
	runStatus,
	runStepStatus,
};

import { z } from "zod";

export const storedWorkflow = z.object({
	workflowId: z.number(),
	workflowName: z.string(),
	workflowParams: z.object({
		owner: z.string(),
		repo: z.string(),
		branchName: z.string().optional(),
		workflowStatus: z.string().optional(),
		triggerEvent: z.string().optional(),
	}),
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
});

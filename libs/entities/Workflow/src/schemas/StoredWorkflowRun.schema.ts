import { z } from "zod";
import { formattedWorkflowRunSchema } from "./WorkflowData.schema.js";

export const storedWorkflowRun = formattedWorkflowRunSchema.merge(
	z.object({
		workflowId: z.number(),
		workflowName: z.string(),
		repositoryName: z.string(),
		repositoryOwner: z.string(),
		workflowKey: z.string(),
		branchName: z.string().optional(),
	}),
);

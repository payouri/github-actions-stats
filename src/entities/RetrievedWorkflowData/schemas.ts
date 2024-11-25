import { formattedWorkflowRunSchema } from "entities/FormattedWorkflow/schema.js";
import { z } from "zod";

export const retrievedWorkflowV0Schema = z.record(
  z.string(),
  z.array(formattedWorkflowRunSchema)
);

export const retrievedWorkflowV1Schema = z.object({
  workflowId: z.number(),
  workflowName: z.string(),
  workflowParams: z.object({
    owner: z.string(),
    repo: z.string(),
    branchName: z.string().optional(),
    workflowStatus: z.string().optional(),
    triggerEvent: z.string().optional(),
  }),
  workflowWeekRunsMap: retrievedWorkflowV0Schema,
  totalWorkflowRuns: z.number(),
  lastRunAt: z.string(),
  lastUpdatedAt: z.string(),
});

export const retrievedWorkflowSchema = z.union([
  retrievedWorkflowV1Schema,
  retrievedWorkflowV0Schema,
]);

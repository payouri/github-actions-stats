import { formattedWorkflowRunSchema } from "../../entities/FormattedWorkflow/schema.js";
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

export const retrievedWorkflowSchema = z.union([
  retrievedWorkflowV1Schema,
  retrievedWorkflowV0Schema,
]);

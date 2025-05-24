import { z } from "zod";
import { formattedWorkflowRunSchema } from "../../../entities/FormattedWorkflow/schemas/schema.js";

export const WORKFLOW_SCHEMA_VERSION = "1.0.0" as const;
export const retrievedWorkflowSchema = Object.assign(
  z.object({
    workflowId: z.number(),
    workflowName: z.string(),
    workflowParams: z.object({
      owner: z.string(),
      repo: z.string(),
      branchName: z.string().optional(),
      workflowStatus: z.string().optional(),
      triggerEvent: z.string().optional(),
    }),
    workflowWeekRunsMap: z.record(
      z.string(),
      z.array(formattedWorkflowRunSchema)
    ),
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
  }),
  { version: WORKFLOW_SCHEMA_VERSION }
);

import type { z } from "zod";
import type { workflowStatSchema } from "./schemas/workflowStat.schema.js";
import type { aggregatedStatSchema } from "./schemas/aggregatedStat.schema.js";

export type WorkflowRunStat = z.infer<typeof workflowStatSchema>;
export type AggregatedWorkflowStat = z.infer<typeof aggregatedStatSchema>;

import type { z } from "zod";
import type {
	aggregatePeriodSchema,
	aggregatedStatSchema,
} from "./schemas/AggregatedStat.schema.js";
import type { runJobDataSchema } from "./schemas/FormattedJob.schema.js";
import type { retrievedWorkflowSchema } from "./schemas/RetrievedWorkflow.schema.js";
import type {
	formattedWorkflowRunSchema,
	githubJobDataSchema,
	runUsageDataSchema,
} from "./schemas/WorkflowData.schema.js";
import type { workflowStatSchema } from "./schemas/WorkflowStat.schema.js";
import type { storedWorkflowRun } from "./schemas/StoredWorkflowRun.schema.js";
import type { storedWorkflow } from "./schemas/StoredWorkflow.schema.js";

export type RunJobData = z.infer<typeof runJobDataSchema>;
export type GithubJobData = z.infer<typeof githubJobDataSchema>;
export type RunUsageData = z.infer<typeof runUsageDataSchema>;
export type FormattedWorkflowRun = z.infer<typeof formattedWorkflowRunSchema>;
export type AggregatePeriod = z.infer<typeof aggregatePeriodSchema>;
export type WorkflowRunStat = z.infer<typeof workflowStatSchema>;
export type AggregatedWorkflowStat = z.infer<typeof aggregatedStatSchema>;
export type RetrievedWorkflow = z.infer<typeof retrievedWorkflowSchema>;
export type StoredWorkflow = z.infer<typeof storedWorkflow>;
export type StoredWorkflowRun = z.infer<typeof storedWorkflowRun>;

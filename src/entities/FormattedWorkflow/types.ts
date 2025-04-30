import type { z } from "zod";
import type { runCompletionStatusSchema } from "../shared.schema.js";
import type { runJobDataSchema } from "./schemas/formattedJob.schema.js";
import type {
  formattedWorkflowRunSchema,
  githubJobDataSchema,
  runUsageDataSchema,
} from "./schemas/schema.js";

export type RunCompletionStatus = z.infer<typeof runCompletionStatusSchema>;
export type RunJobData = z.infer<typeof runJobDataSchema>;
export type GithubJobData = z.infer<typeof githubJobDataSchema>;
export type RunUsageData = z.infer<typeof runUsageDataSchema>;
export type FormattedWorkflowRun = z.infer<typeof formattedWorkflowRunSchema>;

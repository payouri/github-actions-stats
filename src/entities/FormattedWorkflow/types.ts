import type { z } from "zod";
import type {
  formattedWorkflowRunSchema,
  runUsageDataSchema,
  githubJobDataSchema,
  runJobDataSchema,
  runCompletionStatusSchema,
} from "./schema.js";

export type RunCompletionStatus = z.infer<typeof runCompletionStatusSchema>;
export type RunJobData = z.infer<typeof runJobDataSchema>;
export type GithubJobData = z.infer<typeof githubJobDataSchema>;
export type RunUsageData = z.infer<typeof runUsageDataSchema>;
export type FormattedWorkflowRun = z.infer<typeof formattedWorkflowRunSchema>;

import type { z } from "zod";
import type { runCompletionStatusSchema } from "../shared.schema.js";
import type { runJobDataSchema } from "./schemas/formattedJob.schema.js";
import type {
  formattedWorkflowRunSchema,
  githubJobDataSchema,
  runUsageDataSchema,
} from "./schemas/schema.js";
import type { LeanDocumentWithKey } from "../../storage/mongo/types.js";
import type { storedWorkflowRun } from "./storage/mongo.js";

export type RunCompletionStatus = z.infer<typeof runCompletionStatusSchema>;
export type RunJobData = z.infer<typeof runJobDataSchema>;
export type GithubJobData = z.infer<typeof githubJobDataSchema>;
export type RunUsageData = z.infer<typeof runUsageDataSchema>;
export type FormattedWorkflowRun = z.infer<typeof formattedWorkflowRunSchema>;
export type StoredFormattedWorkflowRunDocument = LeanDocumentWithKey<
  z.infer<typeof storedWorkflowRun>
>;

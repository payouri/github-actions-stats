import type { z } from "zod";
import type { storedWorkflowRun } from "@github-actions-stats/workflow-entity";
import type { LeanDocumentWithKey } from "@github-actions-stats/storage";

export type StoredFormattedWorkflowRunDocument = LeanDocumentWithKey<
	z.infer<typeof storedWorkflowRun>
>;

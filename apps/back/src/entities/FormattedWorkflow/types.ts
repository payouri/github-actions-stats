import type { z } from "zod";
import type { LeanDocumentWithKey } from "../../storage/mongo/types.js";
import type { storedWorkflowRun } from "./storage/mongo.js";

export type StoredFormattedWorkflowRunDocument = LeanDocumentWithKey<
	z.infer<typeof storedWorkflowRun>
>;

import { isExistingPath } from "../../../../helpers/isExistingPath.js";
import { workflowStorage } from "../storage.js";
import type { RetrievedWorkflow } from "../types.js";
import { generateWorkflowKey } from "../../../../helpers/generateWorkflowKey.js";

export function isExistingWorkflowData(
  params: Pick<RetrievedWorkflow, "workflowName" | "workflowParams">
) {
  const workflowKey = generateWorkflowKey(params);

  return isExistingPath(workflowStorage.getFilePath(workflowKey));
}

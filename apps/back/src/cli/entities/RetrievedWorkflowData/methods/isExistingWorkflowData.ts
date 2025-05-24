import { isExistingPath } from "../../../../helpers/isExistingPath.js";
import { workflowStorage } from "../storage.js";
import { generateWorkflowKey } from "../../../../helpers/generateWorkflowKey.js";
import type { RetrievedWorkflow } from "@github-actions-stats/workflow-entity";

export function isExistingWorkflowData(
	params: Pick<RetrievedWorkflow, "workflowName" | "workflowParams">,
) {
	const workflowKey = generateWorkflowKey(params);

	return isExistingPath(workflowStorage.getFilePath(workflowKey));
}

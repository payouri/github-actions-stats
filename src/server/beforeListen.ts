import { initFormattedWorkflowStorage } from "../entities/FormattedWorkflow/storage.js";

export async function beforeListen() {
  await initFormattedWorkflowStorage();
}

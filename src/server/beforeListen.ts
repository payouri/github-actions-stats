import { initFormattedWorkflowStorage } from "../entities/FormattedWorkflow/storage.js";
import { processWorkflowJobQueue } from "./queue.js";

export async function beforeListen() {
  await initFormattedWorkflowStorage();
  await processWorkflowJobQueue.init();
}

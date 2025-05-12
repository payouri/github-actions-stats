import { initFormattedWorkflowStorage } from "../entities/FormattedWorkflow/storage/mongo.js";
import { processWorkflowJobQueue } from "./queue.js";

export async function beforeListen() {
  await initFormattedWorkflowStorage();
  await processWorkflowJobQueue.init();
}

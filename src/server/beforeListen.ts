import { initMongoStorages } from "../entities/initMongoStorages.js";
import { processWorkflowJobQueue } from "./queue.js";

export async function beforeListen() {
  await initMongoStorages();
  await processWorkflowJobQueue.init();
}

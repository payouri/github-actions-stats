import {
  initFormattedWorkflowStorage,
  workflowRunsStorage,
  workflowStorage,
} from "../entities/FormattedWorkflow/storage.js";
import logger from "../lib/Logger/logger.js";
import { createProcessWorkflowJobWorker } from "../queues/index.js";
import globalWorkerAbortController from "./globalWorkerAbortController.js";

const processWorkflowJobWorker = createProcessWorkflowJobWorker({
  abortSignal: globalWorkerAbortController.signal,
});

export const initWorkers = async () => {
  logger.debug("Initializing workers");
  await initFormattedWorkflowStorage();
  await processWorkflowJobWorker.init();
};

process.on("SIGTERM", async () => {
  logger.debug("SIGTERM received, closing workers");
  globalWorkerAbortController.abort("SIGTERM");

  await Promise.all([processWorkflowJobWorker.close()]);
  await Promise.all([workflowStorage.close(), workflowRunsStorage.close()]);

  process.exit(0);
});

initWorkers();

import {
  initFormattedWorkflowStorage,
  workflowRunsStorage,
  workflowStorage,
} from "../entities/FormattedWorkflow/storage/mongo.js";
import { formatMs } from "../helpers/format/formatMs.js";
import logger from "../lib/Logger/logger.js";
import { createProcessWorkflowJobWorker } from "../queues/index.js";
import globalWorkerAbortController from "./globalWorkerAbortController.js";

const processWorkflowJobWorker = createProcessWorkflowJobWorker({
  abortSignal: globalWorkerAbortController.signal,
});

const SIGNALS = ["SIGINT", "SIGTERM"];

function handleSignal(params: { abortController: AbortController }) {
  const { abortController } = params;

  SIGNALS.forEach((signal) => {
    process.on(signal, async () => {
      try {
        logger.warn(`${signal} signal received`);
        if (abortController.signal.aborted) return;
        const start = performance.now();
        logger.info(`Closing workers...`);

        abortController.abort(signal);

        await Promise.all([processWorkflowJobWorker.close()]);
        await Promise.all([
          workflowStorage.close(),
          workflowRunsStorage.close(),
        ]);
        logger.info(`Workers closed in ${formatMs(performance.now() - start)}`);

        process.exit(0);
      } catch (error) {
        logger.error("Error closing worker", error);
        process.exit(1);
      }
    });
    return;
  });
}

export const initWorkers = async () => {
  logger.info("Initializing workers...");
  const start = performance.now();
  await initFormattedWorkflowStorage();
  await processWorkflowJobWorker.init();
  logger.info(`Workers initialized in ${formatMs(performance.now() - start)}`);
};

handleSignal({ abortController: globalWorkerAbortController });
initWorkers();

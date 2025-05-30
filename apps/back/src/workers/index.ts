import { initTelemetry } from "../lib/Telemetry/initTelemetry.js";
initTelemetry();

import { closeMongoStorages } from "../entities/closeMongoStorages.js";
import { initMongoStorages } from "../entities/initMongoStorages.js";
import { formatMs } from "../helpers/format/formatMs.js";
import logger from "../lib/Logger/logger.js";
import { createProcessWorkflowJobWorker } from "../queues/index.js";
import globalWorkerAbortController from "./globalWorkerAbortController.js";
import {
  closeDefaultRedisClient,
  initDefaultRedisClient,
} from "../lib/RedisClient/redisClient.js";

const processWorkflowJobWorker = createProcessWorkflowJobWorker({
  abortSignal: globalWorkerAbortController.signal,
});

const SIGNALS = ["SIGINT", "SIGTERM"] as const;

function handleSignal(params: { abortController: AbortController }) {
  const { abortController } = params;

  SIGNALS.forEach((signal) => {
    process.on(signal, async () => {
      try {
        logger.warn(`${signal} signal received`);
        if (abortController.signal.aborted) return;
        const start = performance.now();
        logger.info(`Closing workers...`);

        if (!abortController.signal.aborted) {
          abortController.abort(signal);
        }

        await Promise.all([processWorkflowJobWorker.close()]);
        await Promise.all([closeMongoStorages(), closeDefaultRedisClient()]);
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
  await Promise.all([initMongoStorages(), initDefaultRedisClient()]);
  await processWorkflowJobWorker.init();
  // await initMigrations();
  logger.info(`Workers initialized in ${formatMs(performance.now() - start)}`);
};

handleSignal({ abortController: globalWorkerAbortController });

initWorkers();

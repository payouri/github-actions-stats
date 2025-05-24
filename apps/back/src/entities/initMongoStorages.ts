import { formatMs } from "../helpers/format/formatMs.js";
import logger from "../lib/Logger/logger.js";
import { initFormattedWorkflowStorage } from "./FormattedWorkflow/storage/mongo.js";
import { initQueueJobExecutionReportsStorage } from "./QueueJobExecutionReport/storage.js";
import { initWorkflowStatsMongoStorage } from "./WorkflowStat/storage/mongo.js";

export async function initMongoStorages() {
  logger.debug("Initializing MongoDB storages");
  const start = performance.now();
  await Promise.all([
    initWorkflowStatsMongoStorage(),
    initFormattedWorkflowStorage(),
    initQueueJobExecutionReportsStorage(),
    initQueueJobExecutionReportsStorage(),
    initFormattedWorkflowStorage(),
  ]);
  logger.debug(
    `MongoDB storages have been initialized in ${formatMs(
      performance.now() - start
    )}`
  );
}

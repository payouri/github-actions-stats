import { formatMs } from "../helpers/format/formatMs.js";
import logger from "../lib/Logger/logger.js";
import { closeFormattedWorkflowStorage } from "./FormattedWorkflow/storage/mongo.js";
import { closePendingJobsMongoStorage } from "./PendingJob/storage/mongo.js";
import { closeQueueJobExecutionReportsStorage } from "./QueueJobExecutionReport/storage.js";
import { closeWorkflowStatsMongoStorage } from "./WorkflowStat/storage/mongo.js";

export async function closeMongoStorages() {
  logger.debug("Closing MongoDB storages");
  const start = performance.now();
  await Promise.all([
    closeQueueJobExecutionReportsStorage(),
    closeFormattedWorkflowStorage(),
    closeWorkflowStatsMongoStorage(),
    closeQueueJobExecutionReportsStorage(),
    closePendingJobsMongoStorage(),
  ]);
  logger.debug(
    `MongoDB storages have been closed in ${formatMs(
      performance.now() - start
    )}`
  );
}

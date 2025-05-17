import { closeFormattedWorkflowStorage } from "./FormattedWorkflow/storage/mongo.js";
import { closeQueueJobExecutionReportsStorage } from "./QueueJobExecutionReport/storage.js";
import { closeWorkflowStatsMongoStorage } from "./WorkflowStat/storage/mongo.js";

export async function closeMongoStorages() {
  await Promise.all([
    closeQueueJobExecutionReportsStorage(),
    closeFormattedWorkflowStorage(),
    closeWorkflowStatsMongoStorage(),
  ]);
}

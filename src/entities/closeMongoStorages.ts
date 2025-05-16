import { closeFormattedWorkflowStorage } from "./FormattedWorkflow/storage/mongo.js";
import { closeWorkflowStatsMongoStorage } from "./WorkflowStat/storage/mongo.js";

export async function closeMongoStorages() {
  await Promise.all([
    await closeFormattedWorkflowStorage(),
    await closeWorkflowStatsMongoStorage(),
  ]);
}

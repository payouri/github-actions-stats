import { initFormattedWorkflowStorage } from "./FormattedWorkflow/storage/mongo.js";
import { initWorkflowStatsMongoStorage } from "./WorkflowStat/storage/mongo.js";

export async function initMongoStorages() {
  await Promise.all([
    initWorkflowStatsMongoStorage(),
    initFormattedWorkflowStorage(),
  ]);
}

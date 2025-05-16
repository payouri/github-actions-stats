import "colors";
import {
  workflowRunsMongoStorage,
  workflowMongoStorage,
} from "../entities/FormattedWorkflow/storage/mongo.js";
import githubClient from "../lib/githubClient.js";
import { buildGetWorkflowInstance } from "./getWorkflowInstance/index.js";
import { buildLoadWorkflowData } from "../entities/FormattedWorkflow/storage/methods/loadWorkflowData.js";
import { buildSaveWorkflowData } from "../entities/FormattedWorkflow/storage/methods/saveWorkflowData.js";

function buildFeaturesModule() {
  const saveWorkflowData = buildSaveWorkflowData({
    workflowRunsStorage: workflowRunsMongoStorage,
    workflowStorage: workflowMongoStorage,
  });
  const loadWorkflowData = buildLoadWorkflowData({
    workflowRunsStorage: workflowRunsMongoStorage,
    workflowStorage: workflowMongoStorage,
  });

  const getWorkflowInstance = buildGetWorkflowInstance({
    githubClient: githubClient.rest,
    loadWorkflowData,
    saveWorkflowData,
  });
  return { getWorkflowInstance, loadWorkflowData, saveWorkflowData };
}

let featuresModule: ReturnType<typeof buildFeaturesModule> | null = null;
export const getFeaturesModule = () => {
  if (!featuresModule) {
    featuresModule = buildFeaturesModule();
  }
  return featuresModule;
};

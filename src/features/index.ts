import "colors";
import {
  workflowRunsStorage,
  workflowStorage,
} from "../entities/FormattedWorkflow/storage.js";
import githubClient from "../lib/githubClient.js";
import { buildGetWorkflowInstance } from "./getWorkflowInstance/index.js";
import { buildLoadWorkflowData } from "./getWorkflowInstance/methods/loadWorkflowData.js";
import { buildSaveWorkflowData } from "./getWorkflowInstance/methods/saveWorkflowData.js";

function buildFeaturesModule() {
  const saveWorkflowData = buildSaveWorkflowData({
    workflowRunsStorage,
    workflowStorage,
  });
  const loadWorkflowData = buildLoadWorkflowData({
    workflowRunsStorage,
    workflowStorage,
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

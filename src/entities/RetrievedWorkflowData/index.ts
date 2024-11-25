import { getDefaultWorkflowFilePath } from "./helpers.js";
import { createWorkflowInstance } from "./methods/createWorkflowInstance.js";
import { loadRetrievedWorkflowData } from "./methods/loadRetrievedWorkflowDataFromDisk.js";
import { saveRetrievedWorkflowData } from "./methods/saveRetrievedWorkDataFromDisk.js";

export const retrievedWorkflowService = (() => {
  return {
    createWorkflowInstance,
    saveRetrievedWorkflowData,
    loadRetrievedWorkflowData,
    getDefaultFilePath: getDefaultWorkflowFilePath,
  } as const;
})();

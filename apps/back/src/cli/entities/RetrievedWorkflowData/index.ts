import { createWorkflowInstance } from "./methods/createWorkflowInstance.js";
import { loadRetrievedWorkflowData } from "./methods/loadRetrievedWorkflowData.js";
import { saveRetrievedWorkflowData } from "./methods/saveRetrievedWorkDataFromDisk.js";

export const retrievedWorkflowService = (() => {
  return {
    createWorkflowInstance,
    saveRetrievedWorkflowData,
    loadRetrievedWorkflowData,
  } as const;
})();

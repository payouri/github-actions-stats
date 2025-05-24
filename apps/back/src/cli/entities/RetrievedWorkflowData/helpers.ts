import { join } from "node:path";
import type { RetrievedWorkflow, WorkFlowInstance } from "./types.js";

export const getDefaultWorkflowFilePath = (
  workflowV1: Pick<RetrievedWorkflow, "workflowName" | "workflowParams">,
  basePath: string = process.cwd()
) => {
  const { workflowName, workflowParams } = workflowV1;

  return join(
    basePath,
    `data/${workflowName}/${workflowParams.owner}_${workflowParams.repo}_${workflowParams.branchName}.json`
      .toLowerCase()
      .replaceAll(/\s/g, "_")
  );
};

export const isWorkflowInstance = (data: unknown): data is WorkFlowInstance => {
  if (!data) return false;
  if (typeof data !== "object") return false;
  if (Array.isArray(data)) return false;

  return (
    Symbol.iterator in data &&
    "serializableData" in data &&
    "getRunData" in data
  );
};

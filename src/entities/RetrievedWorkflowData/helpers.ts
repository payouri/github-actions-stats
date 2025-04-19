import { join } from "node:path";
import { retrievedWorkflowV0Schema } from "./schemas.js";
import type {
  RetrievedWorkflowV0,
  RetrievedWorkflowV1,
  WorkFlowInstance,
} from "./types.js";

export const isRetrievedWorkflowV0 = (
  data: unknown
): data is RetrievedWorkflowV0 =>
  retrievedWorkflowV0Schema.safeParse(data).success;

export const getDefaultWorkflowFilePath = (
  workflowV1: Pick<RetrievedWorkflowV1, "workflowName" | "workflowParams">,
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

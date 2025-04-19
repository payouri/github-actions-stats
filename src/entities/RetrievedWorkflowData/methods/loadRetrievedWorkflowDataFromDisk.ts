import { readFile } from "node:fs/promises";
import { sortWorkflowMapKeys } from "../../../entities/FormattedWorkflow/helpers/sortWorkflowMapKeys.js";
import { isExistingPath } from "../../../helpers/isExistingPath.js";
import { ProcessResponse } from "../../../ProcessResponse.types.js";
import { isRetrievedWorkflowV0 } from "../helpers.js";
import { retrievedWorkflowSchema } from "../schemas.js";
import { RetrievedWorkflowV1 } from "../types.js";

export const loadRetrievedWorkflowData = async (
  filePath: string
): Promise<ProcessResponse<RetrievedWorkflowV1>> => {
  try {
    if (!isExistingPath(filePath)) {
      return { hasFailed: true, error: new Error("FILE_DOES_NOT_EXIST") };
    }

    const data = JSON.parse(await readFile(filePath, "utf-8"));

    const sp = retrievedWorkflowSchema.safeParse(data);
    if (!sp.success) {
      return { hasFailed: true, error: sp.error };
    }

    if (isRetrievedWorkflowV0(data)) {
      console.log("Converting to v1");
      throw new Error("Removed compatibility");
    }

    return {
      hasFailed: false,
      data: {
        ...data,
        workflowWeekRunsMap: sortWorkflowMapKeys(data.workflowWeekRunsMap),
      },
    };
  } catch (error) {
    return {
      hasFailed: true,
      error: new Error("FAILED_TO_LOAD_WORKFLOW_DATA", {
        cause: error,
      }),
    };
  }
};

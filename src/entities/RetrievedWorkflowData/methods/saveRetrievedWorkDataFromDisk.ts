import {
  createDirIfNotExists,
  createDirIfNotExistsSync,
} from "helpers/createDirIfNotExists.js";
import { isExistingPath } from "helpers/isExistingPath.js";
import { writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { ProcessResponse } from "ProcessResponse.types.js";
import { getDefaultWorkflowFilePath } from "../helpers.js";
import { RetrievedWorkflowV1 } from "../types.js";
import { sortWorkflowMapKeys } from "entities/FormattedWorkflow/helpers/sortWorkflowMapKeys.js";
import { existsSync, writeFileSync } from "node:fs";

export const saveRetrievedWorkflowData = async (
  data: RetrievedWorkflowV1,
  options?: {
    filePath?: string;
    overwrite?: boolean;
  }
): Promise<ProcessResponse<void>> => {
  const { filePath = getDefaultWorkflowFilePath(data), overwrite = false } =
    options ?? {};
  if (!filePath.endsWith(".json") || !isAbsolute(filePath)) {
    return { hasFailed: true, error: new Error("Invalid file path") };
  }

  if (!overwrite && (await isExistingPath(filePath))) {
    return { hasFailed: true, error: new Error("File already exists") };
  }

  try {
    console.log("Saving workflow data to disk", filePath);
    await createDirIfNotExists(filePath);
    await writeFile(
      filePath,
      JSON.stringify(
        {
          ...data,
          workflowWeekRunsMap: sortWorkflowMapKeys(data.workflowWeekRunsMap),
        },
        null,
        2
      ),
      "utf-8"
    );
    return {
      hasFailed: false,
    };
  } catch (error) {
    return {
      hasFailed: true,
      error: new Error("Failed to save workflow data", {
        cause: error,
      }),
    };
  }
};

export const saveRetrievedWorkflowDataSync = (
  data: RetrievedWorkflowV1,
  options?: {
    filePath?: string;
    overwrite?: boolean;
  }
): void => {
  const { filePath = getDefaultWorkflowFilePath(data), overwrite = false } =
    options ?? {};
  if (!filePath.endsWith(".json") || !isAbsolute(filePath)) {
    throw new Error("Invalid file path");
  }

  if (!overwrite && existsSync(filePath)) {
    throw new Error("File already exists");
  }

  try {
    createDirIfNotExistsSync(filePath);
    writeFileSync(
      filePath,
      JSON.stringify(
        {
          ...data,
          workflowWeekRunsMap: sortWorkflowMapKeys(data.workflowWeekRunsMap),
        },
        null,
        2
      ),
      "utf-8"
    );
  } catch (error) {
    throw new Error("Failed to save workflow data", {
      cause: error,
    });
  }
};

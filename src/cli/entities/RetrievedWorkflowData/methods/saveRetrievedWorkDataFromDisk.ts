import { existsSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { sortWorkflowMapKeys } from "../../../../entities/FormattedWorkflow/helpers/sortWorkflowMapKeys.js";
import {
  createDirIfNotExists,
  createDirIfNotExistsSync,
} from "../../../../helpers/createDirIfNotExists.js";
import { isExistingPath } from "../../../../helpers/isExistingPath.js";
import { ProcessResponse } from "../../../../ProcessResponse.types.js";
import { getDefaultWorkflowFilePath } from "../helpers.js";
import { RetrievedWorkflow } from "../types.js";
import logger from "../../../../lib/Logger/logger.js";

export const saveRetrievedWorkflowData = async (
  data: RetrievedWorkflow,
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
    logger.debug("Saving workflow data to disk", filePath);
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
  data: RetrievedWorkflow,
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
        0
      ),
      "utf-8"
    );
  } catch (error) {
    console.error("Failed to save workflow data", error);
    throw new Error("Failed to save workflow data", {
      cause: error,
    });
  }
};

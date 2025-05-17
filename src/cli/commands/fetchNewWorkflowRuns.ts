import { Command } from "commander";
import type { Logger } from "winston";
import { z } from "zod";
import {
  buildFetchWorkflowDataController,
  type FetchWorkflowDataController,
} from "../../controllers/fetchWorkflowData.js";
import {
  buildFetchWorkflowUpdatesController,
  type FetchWorkflowUpdatesController,
} from "../../controllers/fetchWorkflowUpdates.js";
import githubClient from "../../lib/githubClient.js";
import defaultLogger from "../../lib/Logger/logger.js";
import { GITHUB_TOKEN_OPTION } from "../constants.js";
import { createWorkflowInstance } from "../entities/RetrievedWorkflowData/methods/createWorkflowInstance.js";
import { isExistingWorkflowData } from "../entities/RetrievedWorkflowData/methods/isExistingWorkflowData.js";
import { loadRetrievedWorkflowData } from "../entities/RetrievedWorkflowData/methods/loadRetrievedWorkflowData.js";
import { createOption } from "../helpers/createOption.js";
import type { CommandOption } from "../types.js";
import { saveWorkflowData } from "./fetchNewWorkflowRuns/methods/saveWorkflowData.js";

const getWorkflowRunsInstanceOptions: CommandOption[] = [
  GITHUB_TOKEN_OPTION,
  {
    name: "workflowName",
    description: "Workflow name",
    required: true,
  },
  {
    name: "repositoryName",
    description: "Repository name",
    required: true,
  },
  {
    name: "repositoryOwner",
    description: "Repository owner",
    required: true,
  },
  {
    name: "branchName",
    description: "Branch name",
    required: false,
    defaultValue: "trunk",
  },
  {
    name: "updateType",
    description: "Fetch newest or oldest",
    required: false,
    defaultValue: "newest",
    validator: z.string().refine((v) => ["newest", "oldest"].includes(v), {
      message: "Update type must be either newest or oldest",
    }),
  },
];

function buildFetchNewWorkflowRuns(dependencies: {
  logger: Logger;
  program: Command;
  fetchWorkflowData: FetchWorkflowDataController;
  fetchWorkflowUpdatesController: FetchWorkflowUpdatesController;
}) {
  const { logger, program, fetchWorkflowData, fetchWorkflowUpdatesController } =
    dependencies;

  return async function fetchNewWorkflowRunsCommand(
    parsedOptions: Record<string, any>
  ) {
    function onAbort(signal: string) {
      logger.warn(`${signal} signal received`);
      if (abortController.signal.aborted) return;

      abortController.abort(`${signal} signal received`);
    }
    process.on("SIGINT", onAbort);
    process.on("SIGTERM", onAbort);
    const abortController = new AbortController();

    const globalOptions = program.opts();
    console.log(globalOptions);
    for (const option of getWorkflowRunsInstanceOptions) {
      if (
        option.required &&
        !option.defaultValue &&
        !parsedOptions[option.name]
      ) {
        throw new Error(`Option ${option.name} is required`);
      }
      if (option.validator) {
        const { name } = option;
        const optionValue = parsedOptions[name];
        option.validator.parse(optionValue);
      }
    }
    if (abortController.signal.aborted) {
      return;
    }

    const workflowDataResponse = await fetchWorkflowData(
      {
        repositoryName: parsedOptions.repositoryName,
        repositoryOwner: parsedOptions.repositoryOwner,
        workflowName: parsedOptions.workflowName,
      },
      {
        allowFallback: false,
        createIfNotExists: true,
      }
    );

    if (workflowDataResponse.hasFailed) {
      throw new Error(
        `[${workflowDataResponse.error.code}]: ${workflowDataResponse.error.message}`,
        {
          cause: workflowDataResponse.error,
        }
      );
    }

    const { data: workflowInstance } = workflowDataResponse;

    if (abortController.signal.aborted) {
      return;
    }
    logger.info("Fetching new workflow runs...".bgBlack.yellow);
    const newWorkflowRunsResponse = await fetchWorkflowUpdatesController({
      workflowInstance: createWorkflowInstance(workflowInstance),
      updateType: parsedOptions.updateType,
      abortSignal: abortController.signal,
    });

    if (newWorkflowRunsResponse.hasFailed) {
      throw new Error(`Failed to fetch new workflow runs`, {
        cause: newWorkflowRunsResponse.error,
      });
    }

    logger.info(
      `New workflow runs count: ${newWorkflowRunsResponse.data.totalWorkflowRuns}`
    );

    process.removeListener("SIGINT", onAbort);
    process.removeListener("SIGTERM", onAbort);

    process.exit(0);
  };
}

export function buildFetchNewWorkflowRunsCommand(dependencies: {
  program: Command;
  logger?: Logger;
}) {
  const { program, logger = defaultLogger } = dependencies;

  const fetchWorkflowUpdatesController = buildFetchWorkflowUpdatesController({
    githubClient: githubClient.rest,
    workflowPerPage: 1,
    saveWorkflowData,
    onSavedWorkflowData: async ({ workflowData }) => {
      logger.info(`Saved ${workflowData.savedRunsKeys.length} workflow runs`);
    },
  });
  const fetchWorkflowData = buildFetchWorkflowDataController({
    githubClient: githubClient.rest,
    isExistingWorkflowData,
    loadRetrievedWorkflowData,
    saveRetrievedWorkflowData: saveWorkflowData,
  });
  const fetchWorkflowUpdatesAction = buildFetchNewWorkflowRuns({
    fetchWorkflowData,
    fetchWorkflowUpdatesController,
    logger,
    program,
  });

  const fetchNewWorkflowRunsCommand = new Command("fetch-new-runs")
    .description("Retrieve workflow runs data")
    .action(fetchWorkflowUpdatesAction);

  for (const option of getWorkflowRunsInstanceOptions) {
    if (option.required) {
      const { name, description, required, paramName } = option;
      const optionValueString = required ? `<${name}>` : `[${name}]`;
      console.log(optionValueString);

      fetchNewWorkflowRunsCommand.requiredOption(
        `--${paramName ?? name} ${optionValueString}`,
        description,
        option.defaultValue
      );
    } else {
      fetchNewWorkflowRunsCommand.addOption(createOption(option));
    }
  }

  return fetchNewWorkflowRunsCommand;
}

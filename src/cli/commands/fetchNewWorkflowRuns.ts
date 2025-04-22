import { Command } from "commander";
import type { Logger } from "winston";
import { z } from "zod";
import { buildFetchWorkflowUpdatesController } from "../../controllers/fetchWorkflowUpdates.js";
import type { FormattedWorkflowRun } from "../../entities/FormattedWorkflow/types.js";
import type { SaveWorkflowDataResponse } from "../../features/getWorkflowInstance/methods/saveWorkflowData.js";
import githubClient from "../../lib/githubClient.js";
import defaultLogger from "../../lib/Logger/logger.js";
import { saveRetrivedWorkflowRuns } from "../entities/RetrievedWorkflowData/methods/saveRetrievedWorkDataFromDisk.js";
import { createOption } from "../helpers/createOption.js";
import { getWorkflowInstance } from "../helpers/getWorkflowInstance/index.js";
import type { CommandOption } from "../types.js";

const getWorkflowRunsInstanceOptions: CommandOption[] = [
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

export function buildFetchNewWorkflowRunsCommand(dependencies: {
  program: Command;
  logger?: Logger;
}) {
  const { program, logger = defaultLogger } = dependencies;

  const fetchWorkflowUpdatesController = buildFetchWorkflowUpdatesController({
    githubClient: githubClient.rest,
    workflowPerPage: 10,
    saveWorkflowData: async (params): Promise<SaveWorkflowDataResponse> => {
      const {
        workflowName,
        repositoryName,
        repositoryOwner,
        branchName,
        workflowData,
        newOrUpdatedRuns,
      } = params;

      if (newOrUpdatedRuns?.length) {
        await saveRetrivedWorkflowRuns({
          repositoryName,
          repositoryOwner,
          workflowName,
          branchName,
          runs: newOrUpdatedRuns.reduce<Record<number, FormattedWorkflowRun>>(
            (acc, run) => {
              acc[run.runId] = run;
              return acc;
            },
            {}
          ),
        });
        return { hasFailed: false, data: workflowData };
      }
      await saveRetrivedWorkflowRuns({
        repositoryName,
        repositoryOwner,
        workflowName,
        branchName,
        runs: Object.values(workflowData.workflowWeekRunsMap).reduce<
          Record<number, FormattedWorkflowRun>
        >((acc, runs) => {
          runs.forEach((run) => {
            acc[run.runId] = run;
          });
          return acc;
        }, {}),
      });

      return { hasFailed: false, data: workflowData };
    },
  });

  const fetchNewWorkflowRunsCommand = new Command("get-workflow-runs")
    .description("Get workflow runs data")
    .action(async (parsedOptions) => {
      const globalOptions = program.opts();
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

      const workflowDataResponse = await getWorkflowInstance({
        repositoryName: parsedOptions.repositoryName,
        repositoryOwner: parsedOptions.repositoryOwner,
        workflowName: parsedOptions.workflowName,
        branchName: parsedOptions.branchName,
      });

      if (workflowDataResponse.hasFailed) {
        throw new Error(
          `[${workflowDataResponse.error.code}]: ${workflowDataResponse.error.message}`,
          {
            cause: workflowDataResponse.error,
          }
        );
      }

      const { data: workflowInstance } = workflowDataResponse;

      logger.info("Fetching new workflow runs...".bgBlack.yellow);
      const newWorkflowRunsResponse = await fetchWorkflowUpdatesController({
        workflowInstance,
        updateType: "newest",
      });

      if (newWorkflowRunsResponse.hasFailed) {
        throw new Error(`Failed to fetch new workflow runs`, {
          cause: newWorkflowRunsResponse.error,
        });
      }

      logger.info(
        `New workflow runs count: ${newWorkflowRunsResponse.data.totalWorkflowRuns}`
      );
    });

  for (const option of getWorkflowRunsInstanceOptions) {
    if (option.required) {
      const { name, description, required, paramName } = option;
      const optionValueString = required ? `<${name}>` : `[${name}]`;

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

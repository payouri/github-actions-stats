import { Command } from "commander";
import logger from "../../lib/Logger/logger.js";
import { GITHUB_TOKEN_OPTION } from "../constants.js";
import { createOption } from "../helpers/createOption.js";
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
];

export const buildGetWorkflowRunsInstanceCommand = (program: Command) => {
  const getWorkflowRunsInstance = new Command("get-workflow-runs")
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

      logger.info("Starting Github Actions Stats...".bgBlack.yellow);

      const statsModule = buildGithubStatsModule({
        githubToken: globalOptions[GITHUB_TOKEN_OPTION.name],
      });

      const result = await statsModule.getWorkflowInstance(
        {
          repositoryName: parsedOptions.repositoryName,
          repositoryOwner: parsedOptions.repositoryOwner,
          workflowName: parsedOptions.workflowName,
          branchName: parsedOptions.branchName,
        },
        {
          filePath: parsedOptions.filePath,
          localOnly: parsedOptions.localOnly,
        }
      );

      if (result.hasFailed) {
        throw new Error(`${result.error.code}: ${result.error.message}`);
      }
    });

  for (const option of getWorkflowRunsInstanceOptions) {
    if (option.required) {
      const { name, description, required, paramName } = option;
      const optionValueString = required ? `<${name}>` : `[${name}]`;

      getWorkflowRunsInstance.requiredOption(
        `--${paramName ?? name} ${optionValueString}`,
        description,
        option.defaultValue
      );
    } else {
      getWorkflowRunsInstance.addOption(createOption(option));
    }
  }

  return getWorkflowRunsInstance;
};

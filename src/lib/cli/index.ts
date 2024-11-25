import { Command } from "commander";
import { GITHUB_TOKEN_OPTION } from "./constants.js";
import { buildGetWorkflowRunsInstanceCommand } from "./getWorkflowRunsInstance.js";
import { buildGithubStatsModule } from "index.js";
import { isAbsolute } from "path";
import { z } from "zod";
import { retrievedWorkflowService } from "entities/RetrievedWorkflowData/index.js";
import { CommandOption } from "./types.js";
import { createOption } from "./helpers/createOption.js";
import { buildGetAggregatedStatsCommand } from "./getAggregatedStats.js";

const program = new Command("github-actions-stats");
program.requiredOption(
  `-${GITHUB_TOKEN_OPTION.shortName}, --${GITHUB_TOKEN_OPTION.paramName} <${GITHUB_TOKEN_OPTION.name}>`,
  GITHUB_TOKEN_OPTION.description
);

const getWorkflowRunsInstance = buildGetWorkflowRunsInstanceCommand(program);
const getAggregatedStats = buildGetAggregatedStatsCommand(program);
program.addCommand(getWorkflowRunsInstance);
program.addCommand(getAggregatedStats);

export const runCli = async () => {
  program.parse(process.argv);
};

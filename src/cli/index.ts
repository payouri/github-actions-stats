import { Command } from "commander";
import { GITHUB_TOKEN_OPTION } from "./constants.js";
// import { buildGetAggregatedStatsCommand } from "./getAggregatedStats.js";
import { buildFetchNewWorkflowRunsCommand } from "./commands/fetchNewWorkflowRuns.js";
import logger from "../lib/Logger/logger.js";

const program = new Command("github-actions-stats");
program.requiredOption(
  `-${GITHUB_TOKEN_OPTION.shortName}, --${GITHUB_TOKEN_OPTION.paramName} <${GITHUB_TOKEN_OPTION.name}>`,
  GITHUB_TOKEN_OPTION.description
);

const fetchNewWorkflowRuns = buildFetchNewWorkflowRunsCommand({
  program,
  logger: logger,
});

// const getAggregatedStats = buildGetAggregatedStatsCommand(program);

program.addCommand(fetchNewWorkflowRuns);
// program.addCommand(getAggregatedStats);

export const runCli = async () => {
  program.parse(process.argv);
};

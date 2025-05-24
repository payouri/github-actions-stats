import { Command } from "commander";
// import { buildGetAggregatedStatsCommand } from "./getAggregatedStats.js";
import logger from "../lib/Logger/logger.js";
import { buildFetchNewWorkflowRunsCommand } from "./commands/fetchNewWorkflowRuns.js";

const program = new Command("github-actions-stats");

const fetchNewWorkflowRuns = buildFetchNewWorkflowRunsCommand({
  program,
  logger: logger,
});

// const getAggregatedStats = buildGetAggregatedStatsCommand(program);

program.addCommand(fetchNewWorkflowRuns);
// program.addCommand(getAggregatedStats);

export const runCli = async () => {
  program.parse(process.argv);
  program.exitOverride((err) => {
    console.error(err);
    process.exit(1);
  });
};

import { WorkFlowInstance } from "entities/RetrievedWorkflowData/types.js";
import { StepStats, WorkflowsStats } from "../types.js";
import { RunCompletionStatus } from "entities/index.js";
import { getJobsArray } from "entities/FormattedWorkflow/helpers/getJobsArray.js";

const completionStatuses: Extract<
  RunCompletionStatus,
  "success" | "failure" | "cancelled" | "skipped"
>[] = ["success", "failure", "cancelled", "skipped"];

const isWantedStatus = (
  status: string
): status is Extract<
  RunCompletionStatus,
  "success" | "failure" | "cancelled" | "skipped"
> =>
  completionStatuses.includes(
    status as Extract<
      RunCompletionStatus,
      "success" | "failure" | "cancelled" | "skipped"
    >
  );

const emptyStepStats: StepStats["stats"] = {
  total: 0,
  success: 0,
  failure: 0,
  cancelled: 0,
  skipped: 0,
  totalDurationMs: 0,
  shortestDurationMs: 0,
  longestDurationMs: 0,
  durationByStatus: {
    success: {
      longestMs: 0,
      shortestMs: 0,
      totalMs: 0,
    },
    failure: {
      longestMs: 0,
      shortestMs: 0,
      totalMs: 0,
    },
    cancelled: {
      longestMs: 0,
      shortestMs: 0,
      totalMs: 0,
    },
    skipped: {
      longestMs: 0,
      shortestMs: 0,
      totalMs: 0,
    },
  },
  durationValuesMs: [],
};
const emptyWorkflowStats: Pick<
  WorkflowsStats,
  "steps" | "stepsNames" | "runsStats" | "runs"
> = {
  steps: {},
  stepsNames: new Set<string>(),
  runs: {},
  runsStats: {
    cancelled: 0,
    failure: 0,
    skipped: 0,
    success: 0,
    completed: 0,
    unknown: 0,
    total: 0,
  },
};

export const getWorkflowStats = (data: WorkFlowInstance): WorkflowsStats => {
  const stats = data.formattedWorkflowRuns.reduce<
    Pick<WorkflowsStats, "steps" | "stepsNames" | "runsStats" | "runs">
  >((acc, run) => {
    const { runId, status, runAt, usageData } = run;
    if (!usageData) return acc;
    const jobs = getJobsArray(usageData);

    const runStepsArray: StepStats[] = [];
    jobs.forEach(({ durationMs, data }) => {
      if (!data) return;

      const { conclusion, name } = data;
      if (!conclusion) return acc;

      const aggregatedStepData = !acc.stepsNames.has(name)
        ? structuredClone(emptyStepStats)
        : acc.steps[name].stats;
      const currentStepData = structuredClone(emptyStepStats);

      aggregatedStepData.total += 1;
      aggregatedStepData.totalDurationMs += durationMs;
      if (isWantedStatus(conclusion)) {
        currentStepData[conclusion] += 1;
        currentStepData.total += 1;
        currentStepData.shortestDurationMs = durationMs;
        currentStepData.longestDurationMs = durationMs;
        currentStepData.totalDurationMs += durationMs;
        currentStepData.durationValuesMs.push(durationMs);

        aggregatedStepData[conclusion] += 1;
        aggregatedStepData.durationValuesMs.push(durationMs);
        aggregatedStepData.durationByStatus[conclusion].totalMs += durationMs;
        currentStepData.durationByStatus[conclusion] = {
          longestMs: durationMs,
          shortestMs: durationMs,
          totalMs: durationMs,
        };
        if (
          durationMs <
            aggregatedStepData.durationByStatus[conclusion].shortestMs ||
          aggregatedStepData.durationByStatus[conclusion].shortestMs === 0
        ) {
          aggregatedStepData.durationByStatus[conclusion].shortestMs =
            durationMs;
        }
        if (
          durationMs >
            aggregatedStepData.durationByStatus[conclusion].longestMs ||
          aggregatedStepData.durationByStatus[conclusion].longestMs === 0
        ) {
          aggregatedStepData.durationByStatus[conclusion].longestMs =
            durationMs;
        }
      }
      if (
        durationMs < aggregatedStepData.shortestDurationMs ||
        aggregatedStepData.shortestDurationMs === 0
      ) {
        aggregatedStepData.shortestDurationMs = durationMs;
      }
      if (
        durationMs > aggregatedStepData.longestDurationMs ||
        aggregatedStepData.longestDurationMs === 0
      ) {
        aggregatedStepData.longestDurationMs = durationMs;
      }

      acc.steps[name] = {
        name,
        stats: aggregatedStepData,
      };
      acc.stepsNames.add(name);

      runStepsArray.push({
        name,
        stats: currentStepData,
      });
    });

    const stepsNames = new Set<string>();
    runStepsArray.forEach(({ name }) => {
      stepsNames.add(name);
    });
    acc.runs[runId] = {
      date: runAt,
      durationMs: usageData.run_duration_ms ?? 0,
      runId,
      stepsNames: stepsNames,
      stepsArray: runStepsArray,
      status,
    };

    if (!(status in acc.runsStats)) {
      acc.runsStats.unknown += 1;
    } else if (status !== "unknown" && status !== "total") {
      acc.runsStats[
        status as "success" | "failure" | "cancelled" | "skipped" | "completed"
      ] += 1;
    }
    acc.runsStats.total += 1;

    return acc;
  }, structuredClone(emptyWorkflowStats));

  return {
    ...stats,
    workflowId: 0,
    workflowName: data.workflowName,
    get runsArray() {
      return Object.values(this.runs);
    },
    get stepsArray() {
      return Object.values(this.steps);
    },
  };
};

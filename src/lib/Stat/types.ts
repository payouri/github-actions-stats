import type { RunCompletionStatus } from "../../entities/FormattedWorkflow/types.js";
import type { WantedStatus } from "./methods/types.js";

export type StandardWorkflowStats = {
  total: number;
  success: number;
  failure: number;
  cancelled: number;
  skipped: number;
  totalDurationMs: number;
  shortestDurationMs: number;
  longestDurationMs: number;
  durationByStatus: {
    [Status in WantedStatus]: {
      totalMs: number;
      shortestMs: number;
      longestMs: number;
    };
  };
};

export type StepStats = {
  name: string;
  stats: StandardWorkflowStats & {
    durationValuesMs: number[];
  };
};

export type WorkflowsStats = {
  workflowName: string;
  workflowId: number;
  steps: Record<string, StepStats>;
  stepsArray: StepStats[];
  stepsNames: Set<string>;
  runs: {
    [runId: number]: {
      status: string;
      runId: number;
      date: string;
      stepsArray: StepStats[];
      stepsNames: Set<string>;
      durationMs: number;
    };
  };
  runsArray: WorkflowsStats["runs"][number][];
  runsStats: {
    total: number;
    success: number;
    failure: number;
    cancelled: number;
    skipped: number;
    completed: number;
    unknown: number;
  };
};
export type AggregatedPeriodStatsByStepMS = {
  [name: string]: {
    periodDate: string;
    count: number;
    totalDurationMs: number;
    shortestDurationMs: number;
    longestDurationMs: number;
    durationValuesMs: number[];
  };
};
export type AggregatedPeriodStatsByStepMinutes = {
  [name: string]: {
    periodDate: string;
    count: number;
    shortestDurationMs: number;
    longestDurationMs: number;
    totalDurationMs: number;
    averageDurationMs: number;
    averageDurationMinutes: number;
    shortestDurationMinutes: number;
    longestDurationMinutes: number;
    stdDeviation: number;
    deciles: number[];
    p95: number;
  };
};
export type AggregatedPeriodStats = {
  [name in string]: AggregatedPeriodStatsByStepMinutes;
};

import { getJobsCount } from "../../../entities/FormattedWorkflow/helpers/getJobsCount.js";
import { RetrievedWorkflowV0 } from "../types.js";
import { getJobsArray } from "../../../entities/FormattedWorkflow/helpers/getJobsArray.js";
import { GithubJobData } from "../../../entities/FormattedWorkflow/types.js";

type JobRun = {
  jobId: number;
  jobName: string | null;
  durationMs: number;
  data: NonNullable<GithubJobData["data"]> | null;
};

type DurationItem = {
  totalMs: number;
  jobs: number;
  jobRuns: Array<JobRun>;
};

const emptyDurationItem: DurationItem = {
  totalMs: 0,
  jobs: 0,
  jobRuns: [],
};

export const createDurationMap = (map: RetrievedWorkflowV0) => {
  const durationMap = new Map<string, DurationItem>();

  for (const [weekYear, workflowRuns] of Object.entries(map)) {
    const item = structuredClone(emptyDurationItem);
    if (!workflowRuns.length) {
      durationMap.set(weekYear, item);
      continue;
    }

    for (const workflowRun of workflowRuns) {
      const { usageData } = workflowRun;
      if (
        !usageData?.billable ||
        typeof usageData?.run_duration_ms !== "number"
      ) {
        continue;
      }
      item.totalMs += usageData.run_duration_ms;
      item.jobs += getJobsCount(usageData);
      item.jobRuns = getJobsArray(usageData).concat(item.jobRuns);
    }

    durationMap.set(weekYear, item);
  }

  return {
    getEntryTotalDurationMS(name: string) {
      return durationMap.get(name)?.totalMs ?? 0;
    },
    getEntryJobsCount(name: string) {
      return durationMap.get(name)?.jobs ?? 0;
    },
    getEntryJobRuns(name: string) {
      return durationMap.get(name)?.jobRuns ?? [];
    },
    aggregateJobRuns<Output>(
      name: string,
      aggregateFn: (jobRuns: JobRun[]) => Output
    ) {
      return aggregateFn(durationMap.get(name)?.jobRuns ?? []);
    },
  };
};

import {
  FormattedWorkflowRun,
  GithubJobData,
  RunUsageData,
} from "../../../../entities/FormattedWorkflow/types.js";
import { RetrievedWorkflow } from "../types.js";

const buildFormatJobRun = (dependencies: {
  runWorkflowJobMap: Map<
    `${number}_${number}`,
    {
      jobId: number;
      runId: number;
      data: GithubJobData | null;
      weekYear: string;
      osType: string;
    }
  >;
  runIdJobIdsMap: Map<number, Set<number>>;
}) => {
  return (params: {
    runId: number;
    weekYear: string;
    osName: string;
    job_runs: GithubJobData[];
  }): GithubJobData[] => {
    const { runIdJobIdsMap, runWorkflowJobMap } = dependencies;
    const { runId, weekYear, osName, job_runs } = params;

    const jobs: GithubJobData[] = [];

    for (const [jobIndex, jobRun] of job_runs.entries()) {
      const { job_id: jobId } = jobRun;
      const mapKey: `${number}_${number}` = `${runId}_${jobId}`;

      runIdJobIdsMap.set(
        runId,
        (runIdJobIdsMap.get(runId) ?? new Set()).add(jobId)
      );
      runWorkflowJobMap.set(mapKey, {
        data: jobRun,
        jobId,
        weekYear,
        osType: osName,
        runId: runId,
      });

      jobs[jobIndex] = {
        get job_id() {
          return runWorkflowJobMap.get(mapKey)?.data?.job_id ?? 0;
        },
        get duration_ms() {
          return runWorkflowJobMap.get(mapKey)?.data?.duration_ms ?? 0;
        },
        get data() {
          return runWorkflowJobMap.get(mapKey)?.data?.data ?? null;
        },
      };
    }

    return jobs;
  };
};

const buildInitJobData = (dependencies: {
  runWorkflowJobMap: Map<
    `${number}_${number}`,
    {
      jobId: number;
      runId: number;
      data: GithubJobData | null;
      weekYear: string;
      osType: string;
    }
  >;
  runIdJobIdsMap: Map<number, Set<number>>;
}) => {
  return (params: { workflowRun: FormattedWorkflowRun }) => {
    const { runWorkflowJobMap, runIdJobIdsMap } = dependencies;
    const { workflowRun } = params;
    const { usageData } = workflowRun;

    if (!usageData) {
      return null;
    }

    const { billable } = usageData;
    const updatedBillable: typeof billable = {
      durationPerLabel: billable.durationPerLabel ?? {},
      totalMs: billable.totalMs ?? 0,
      jobsCount: billable.jobsCount ?? 0,
      jobRuns: buildFormatJobRun({ runWorkflowJobMap, runIdJobIdsMap })({
        runId: workflowRun.runId,
        weekYear: workflowRun.week_year,
        osName: "Default",
        job_runs: billable.jobRuns ?? [],
      }),
    };

    return {
      data: {
        billable: updatedBillable,
        run_duration_ms: workflowRun.usageData?.run_duration_ms ?? 0,
      },
      weekYear: workflowRun.week_year,
      runId: workflowRun.runId,
    };
  };
};

export const createWorkflowsMaps = (
  workflowWeekRunsMap: RetrievedWorkflow["workflowWeekRunsMap"]
) => {
  const runIdMap = new Map<
    number,
    { data: RunUsageData | null; weekYear: string; runId: number }
  >();
  const runWorkflowJobMap = new Map<
    `${number}_${number}`,
    {
      jobId: number;
      runId: number;
      data: GithubJobData | null;
      weekYear: string;
      osType: string;
    }
  >();
  const runIdJobIdsMap = new Map<number, Set<number>>();

  for (const workflowRun of Object.entries(workflowWeekRunsMap)) {
    const [, workflowRuns] = workflowRun;
    for (const [, workflowRun] of workflowRuns.entries()) {
      const data = buildInitJobData({ runWorkflowJobMap, runIdJobIdsMap })({
        workflowRun: workflowRun,
      });
      if (!data) {
        continue;
      }
      runIdMap.set(workflowRun.runId, data);
    }
  }
  return {
    getRunUsageData(runId: number) {
      return runIdMap.get(runId)?.data ?? null;
    },
    getRunWorkflowJobData(runId: number, jobId: number) {
      return runWorkflowJobMap.get(`${runId}_${jobId}`) ?? null;
    },

    replaceOrAddRunUsageData(
      runId: number,
      data: FormattedWorkflowRun,
      options?: { allowSkip?: boolean }
    ) {
      const { allowSkip } = options ?? { allowSkip: false };
      const formattedRun = buildInitJobData({
        runWorkflowJobMap,
        runIdJobIdsMap,
      })({
        workflowRun: data,
      });

      if (!formattedRun) {
        if (!allowSkip) {
          throw new Error("Not implemented");
        }
        runIdMap.delete(runId);
        runIdJobIdsMap.delete(runId);
        return;
      }

      runIdMap.set(runId, formattedRun);
    },
  };
};

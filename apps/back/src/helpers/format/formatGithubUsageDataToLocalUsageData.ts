import type { components } from "@octokit/openapi-types";
import dayjs from "dayjs";
import { runJobDataSchema } from "../../entities/FormattedWorkflow/schemas/formattedJob.schema.js";
import {
  type GithubJobData,
  type RunJobData,
  type RunUsageData,
} from "../../entities/FormattedWorkflow/types.js";

export function formatGithubUsageDataToLocalUsageData(
  usageData: components["schemas"]["workflow-run-usage"],
  jobsMap?: Record<number, components["schemas"]["job"] | RunJobData>
): RunUsageData {
  const durationPerLabel: Record<string, number> = {};
  let totalMs = 0;
  const jobRuns = Object.entries(usageData.billable).reduce<GithubJobData[]>(
    (acc, [osPlatform, osData]) => {
      durationPerLabel[osPlatform] = osData.total_ms;
      totalMs += osData.total_ms;
      if (!osData || !osData.jobs || !osData.job_runs?.length) return acc;

      for (const jobRun of osData.job_runs) {
        const maybeData = jobsMap?.[jobRun.job_id];

        acc.push({
          job_id: jobRun.job_id,
          duration_ms:
            !jobRun.duration_ms &&
            maybeData?.started_at &&
            maybeData?.completed_at
              ? dayjs(maybeData.completed_at).diff(
                  dayjs(maybeData.started_at),
                  "millisecond"
                )
              : jobRun.duration_ms,
          data: maybeData ? runJobDataSchema.parse(maybeData) : null,
        });
      }

      return acc;
    },
    []
  );

  return {
    run_duration_ms: totalMs,
    billable: {
      durationPerLabel,
      totalMs,
      jobsCount: jobRuns.length,
      jobRuns,
    },
  };
}

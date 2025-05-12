import { DB } from "../../entities/db.js";
import type {
  DefaultJob,
  DefaultJobDefinition,
} from "../../lib/Queue/types.js";
import type { MethodResult } from "../../types/MethodResult.js";

export const CREATE_RUN_STATS_JOB_NAME = "create-run-stats" as const;

export type CreateRunStatsJobJobName = typeof CREATE_RUN_STATS_JOB_NAME;

export interface CreateRunStats extends DefaultJobDefinition {
  jobName: CreateRunStatsJobJobName;
  jobData: {
    workflowKey: string;
    runId: number;
  };
  jobResult: void;
  jobErrorCode: "failed_to_create_run_stats" | "run_not_found";
}

export async function createRunStats(
  params: DefaultJob<CreateRunStats>,
  options?: { abortSignal?: AbortSignal }
): Promise<
  MethodResult<CreateRunStats["jobResult"], CreateRunStats["jobErrorCode"]>
> {
  const findResult = await DB.queries.getRunData({
    runId: params.data.runId,
    workflowKey: params.data.workflowKey,
  });

  if (!findResult) {
    return {
      hasFailed: true,
      error: {
        code: "run_not_found",
        message: "Run not found",
        error: new Error("Run not found"),
        data: undefined,
      },
    };
  }

  const upsertResult = await DB.mutations.upsertWorkflowRunStat(findResult);

  if (upsertResult.hasFailed) {
    return {
      hasFailed: true,
      error: {
        code: "failed_to_create_run_stats",
        message: "Failed to create run stats",
        error: upsertResult.error.error,
        data: upsertResult.error.data,
      },
    };
  }

  return {
    hasFailed: false,
  };
}

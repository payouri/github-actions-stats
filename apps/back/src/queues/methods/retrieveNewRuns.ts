import type {
  DefaultJob,
  DefaultJobDefinition,
} from "../../lib/Queue/types.js";
import type { MethodResult } from "../../types/MethodResult.js";

export const RETRIEVE_NEW_RUN_JOB_NAME = "retrieve-new-run" as const;

export type RetrieveNewRunsJobJobName = typeof RETRIEVE_NEW_RUN_JOB_NAME;

export interface RetrieveNewRuns extends DefaultJobDefinition {
  jobName: RetrieveNewRunsJobJobName;
  jobData: {
    workflowKey: string;
  };
  jobResult: void;
  jobErrorCode: "failed_to_retrieve_new_run";
}

export async function retrieveNewRuns(
  params: DefaultJob<RetrieveNewRuns>,
  options?: { abortSignal?: AbortSignal }
): Promise<
  MethodResult<RetrieveNewRuns["jobResult"], RetrieveNewRuns["jobErrorCode"]>
> {
  return {
    hasFailed: false,
  };
}

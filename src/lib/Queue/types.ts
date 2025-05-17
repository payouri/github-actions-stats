import type { MethodResult } from "../../types/MethodResult.js";
import type { Job as BullJob } from "bullmq";

export interface EndedJob<Job extends DefaultJobDefinition> {
  jobId: string;
  status: "success" | "failed";
  startTime: Date;
  endTime: Date;
  createdTime: Date;
  data: Job["jobData"];
  name: Job["jobName"];
  result:
    | Job["jobResult"]
    | {
        reason: string;
        errorCode: string;
      };
}

export interface DefaultJobDefinition {
  jobName: string;
  jobData: unknown;
  jobResult?: unknown;
  jobErrorCode?: string;
}

export type DefaultJobsMap = {
  [JobName in string]: Omit<DefaultJobDefinition, "jobName"> & {
    jobName: JobName;
  };
};

export type DefaultJob<JobDefinition extends DefaultJobDefinition> = BullJob<
  JobDefinition["jobData"],
  JobDefinition["jobResult"] extends void | undefined
    ? void
    : JobDefinition["jobResult"],
  JobDefinition["jobName"]
>;

export type MethodMap<T extends DefaultJobsMap> = {
  [JobName in DefaultJobKey<T>]: (
    params: DefaultJob<T[JobName]>,
    options?: { abortSignal?: AbortSignal }
  ) => Promise<MethodResult<T[JobName]["jobResult"], string>>;
};

export type DefaultJobKey<T extends DefaultJobsMap> = keyof T;

export interface CreateQueueParams {
  name: string;
  redisUrl: string;
  abortSignal?: AbortSignal;
}
export interface Queue<Job extends DefaultJobsMap> {
  addJob: (
    job: Omit<Job[DefaultJobKey<Job>], "jobResult">
  ) => Promise<MethodResult<void, "failed_to_add_job">>;
  init: () => Promise<MethodResult<void, "failed_to_init_queue">>;
  close: () => Promise<MethodResult<void, "failed_to_close_queue">>;
}

export interface CreateWorkerParams<
  JobMap extends DefaultJobsMap,
  JobKey extends DefaultJobKey<JobMap> = DefaultJobKey<JobMap>,
  JobDefinition extends JobMap[JobKey] = JobMap[JobKey],
  Job extends DefaultJob<JobDefinition> = DefaultJob<JobDefinition>
> {
  queue: string;
  name: string;
  concurrency: number;
  redisUrl: string;
  abortSignal?: AbortSignal;
  onJobEnd?: (job: EndedJob<JobDefinition>) => Promise<void> | void;
  processJob: (
    job: Job,
    options: {
      abortSignal: AbortSignal;
    }
  ) => Promise<
    MethodResult<
      JobDefinition extends { jobResult: infer Result } ? Result : void,
      "failed_to_process_job" | "job_aborted"
    >
  >;
}

export interface Worker<T = unknown> {
  init: () => Promise<MethodResult<void, "failed_to_init_worker">>;
  close: () => Promise<MethodResult<void, "failed_to_close_worker">>;
}

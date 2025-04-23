import { config } from "../config/config.js";
import logger from "../lib/Logger/logger.js";
import { createQueue, createWorker } from "../lib/Queue/index.js";
import type { DefaultJobDefinition, MethodMap } from "../lib/Queue/types.js";
import type { MethodResult } from "../types/MethodResult.js";

export interface RetrieveWorkflowUpdates extends DefaultJobDefinition {
  jobName: "retrieve-workflow-updates";
  jobData: {
    workflowKey: string;
    a: "dsqdq";
  };
  jobResult: void;
}
export interface RetreiveNewRun extends DefaultJobDefinition {
  jobName: "retreive-new-run";
  jobData: {
    workflowKey: string;
  };
  jobResult: void;
}

export type JobsMap = {
  "retrieve-workflow-updates": RetrieveWorkflowUpdates;
  "retreive-new-run": RetreiveNewRun;
};

const MethodsMap: MethodMap<JobsMap> = {
  ["retreive-new-run"]: async function retreiveNewRun(
    params
  ): Promise<
    MethodResult<RetreiveNewRun["jobResult"], "failed_to_retreive_new_run">
  > {
    return {
      hasFailed: false,
    };
  },
  ["retrieve-workflow-updates"]: async function retrieveWorkflowUpdates(
    params
  ): Promise<
    MethodResult<
      RetrieveWorkflowUpdates["jobResult"],
      "failed_to_retreive_workflow_updates"
    >
  > {
    return {
      hasFailed: false,
    };
  },
};

const PROCESS_WORKFLOW_JOB_QUEUE_NAME = "process-workflow-job";
const PROCESS_WORKFLOW_JOB_QUEUE_WORKER_CONCURRENCY = 1;

export function createProcessWorfklowJobQueue(params?: {
  abortSignal?: AbortSignal;
}) {
  const { abortSignal } = params ?? {};

  return createQueue<JobsMap>({
    name: PROCESS_WORKFLOW_JOB_QUEUE_NAME,
    redisUrl: config.REDIS.uri,
    abortSignal,
  });
}

export function createProcessWorkflowJobWorker(params?: {
  abortSignal?: AbortSignal;
}) {
  const { abortSignal } = params ?? {};

  return createWorker<JobsMap>({
    queue: PROCESS_WORKFLOW_JOB_QUEUE_NAME,
    abortSignal,
    name: "process-workflow-job-worker",
    concurrency: PROCESS_WORKFLOW_JOB_QUEUE_WORKER_CONCURRENCY,
    redisUrl: config.REDIS.uri,
    processJob: async (job, { abortSignal }) => {
      logger.debug(`Processing job ${job.id}, job name ${job.name}`);
      console.log({
        abortSignal: abortSignal.aborted,
      });
      if (!(job.name in MethodsMap)) {
        throw new Error(`Job ${job.name} is not supported`);
      }
      const start = performance.now();
      const methodResult = await Reflect.apply(
        MethodsMap[job.name],
        undefined,
        [job]
      );
      const end = performance.now();
      logger.debug(`Job ${job.name} processed in ${end - start}ms`);
      return methodResult;
    },
  });
}

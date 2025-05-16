import { config } from "../config/config.js";
import logger from "../lib/Logger/logger.js";
import { createQueue, createWorker } from "../lib/Queue/index.js";
import type { MethodMap } from "../lib/Queue/types.js";
import {
  RETRIEVE_NEW_RUN_JOB_NAME,
  retrieveNewRuns,
} from "./methods/retrieveNewRuns.js";
import {
  RETRIEVE_OLDER_RUNS_JOB_NAME,
  retrieveOldRuns,
} from "./methods/retrieveOldRuns.js";
import {
  RETRIEVE_WORKFLOW_UPDATES_JOB_NAME,
  retrieveWorkflowUpdates,
} from "./methods/retrieveWorkflowUpdates.js";
import type { JobsMap } from "./methods/types.js";

const MethodsMap: MethodMap<JobsMap> = {
  [RETRIEVE_OLDER_RUNS_JOB_NAME]: retrieveOldRuns,
  [RETRIEVE_NEW_RUN_JOB_NAME]: retrieveNewRuns,
  [RETRIEVE_WORKFLOW_UPDATES_JOB_NAME]: retrieveWorkflowUpdates,
};

const PROCESS_WORKFLOW_JOB_QUEUE_NAME = "process-workflow-job" as const;
const PROCESS_WORKFLOW_JOB_QUEUE_WORKER_CONCURRENCY = 1 as const;

export function createProcessWorkflowJobQueue(params?: {
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

      if (!(job.name in MethodsMap)) {
        throw new Error(`Job ${job.name} is not supported`);
      }
      const start = performance.now();
      const methodResult = await Reflect.apply(
        MethodsMap[job.name],
        undefined,
        [job, { abortSignal }]
      );
      const end = performance.now();
      logger.debug(`Job ${job.name} processed in ${end - start}ms`);
      return methodResult;
    },
  });
}

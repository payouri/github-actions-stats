import { config } from "../config/config.js";
import { buildFetchWorkflowUpdatesController } from "../controllers/fetchWorkflowUpdates.js";
import {
  workflowRunsStorage,
  workflowStorage,
} from "../entities/FormattedWorkflow/storage.js";
import { buildLoadWorkflowData } from "../features/getWorkflowInstance/methods/loadWorkflowData.js";
import { buildSaveWorkflowData } from "../features/getWorkflowInstance/methods/saveWorkflowData.js";
import { formatMs } from "../helpers/format/formatMs.js";
import githubClient from "../lib/githubClient.js";
import logger from "../lib/Logger/logger.js";
import { createQueue, createWorker } from "../lib/Queue/index.js";
import type { DefaultJobDefinition, MethodMap } from "../lib/Queue/types.js";
import type { MethodResult } from "../types/MethodResult.js";

export interface RetrieveWorkflowUpdates extends DefaultJobDefinition {
  jobName: "retrieve-workflow-updates";
  jobData: {
    workflowKey: string;
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

export interface RetriveOldRuns extends DefaultJobDefinition {
  jobName: "retreive-older-runs";
  jobData: {
    workflowKey: string;
    fetchedCount?: number;
  };
  jobResult: void;
}

export type JobsMap = {
  "retrieve-workflow-updates": RetrieveWorkflowUpdates;
  "retreive-new-run": RetreiveNewRun;
  "retreive-older-runs": RetriveOldRuns;
};

const MethodsMap: MethodMap<JobsMap> = {
  ["retreive-older-runs"]: async function retreiveOldRuns(
    params,
    options
  ): Promise<
    MethodResult<
      RetriveOldRuns["jobResult"],
      "failed_to_retreive_old_runs" | "workflow_not_found"
    >
  > {
    const { abortSignal } = options ?? {};
    const { workflowKey, fetchedCount = 0 } = params.data;

    const workflowPerPage = 1;
    const start = Date.now();
    const maxJobsToFetch = 100;
    const maxJobDurationMS = 1000 * 60 * 5;
    const abortController = new AbortController();

    if (fetchedCount >= maxJobsToFetch) {
      logger.debug(
        `Aborting fetching older runs because fetched count ${fetchedCount} is greater than max jobs to fetch ${maxJobsToFetch}`
      );
      abortController.abort("Max jobs to fetch reached");
      return {
        hasFailed: false,
      };
    }

    const workflowDataResponse = await buildLoadWorkflowData({
      workflowRunsStorage,
      workflowStorage,
    })(
      {
        workflowKey,
      },
      {
        onlyOldestRun: true,
      }
    );

    if (workflowDataResponse.hasFailed) {
      return {
        hasFailed: true,
        error: {
          code: "workflow_not_found",
          message: `Workflow ${workflowKey} not found`,
          error: new Error(`Workflow ${workflowKey} not found`),
          data: undefined,
        },
      };
    }

    const fetchWorkflowUpdatesResponse =
      await buildFetchWorkflowUpdatesController({
        saveWorkflowData: buildSaveWorkflowData({
          workflowRunsStorage,
          workflowStorage,
        }),
        githubClient: githubClient.rest,
        workflowPerPage,
        async onPage({ page, total, perPage }) {
          logger.debug(
            `Fetching workflow runs page ${page} (${page * perPage}/${total})`
          );
          const durationMs = Date.now() - start;
          if (durationMs > maxJobDurationMS) {
            logger.debug(
              `Fetching workflow runs aborted after ${formatMs(durationMs, {
                convertToSeconds: true,
              })}`
            );
            abortController.abort("Max job duration reached");
          }
        },
        async onSavedWorkflowData({ savedWorkflowCount }) {
          if (savedWorkflowCount >= maxJobsToFetch) {
            logger.debug(
              `Saved workflow data ${savedWorkflowCount} workflow runs stopping fetching more runs`
            );
            abortController.abort("Enough data fetched");
            return;
          }
          logger.debug(
            `Saved workflow data ${savedWorkflowCount} workflow runs`
          );
          await params.updateData({
            workflowKey,
            fetchedCount: savedWorkflowCount,
          });
        },
      })({
        workflowInstance: workflowDataResponse.data,
        abortSignal: abortSignal
          ? AbortSignal.any([abortController.signal, abortSignal])
          : abortController.signal,
        updateType: "oldest",
        alreadyFetchedCount: fetchedCount,
      });

    if (fetchWorkflowUpdatesResponse.hasFailed) {
      return {
        hasFailed: true,
        error: {
          code: "failed_to_retreive_old_runs",
          message: fetchWorkflowUpdatesResponse.error.message,
          error: fetchWorkflowUpdatesResponse.error.error,
          data: undefined,
        },
      };
    }

    return {
      hasFailed: false,
    };
  },
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
    params,
    options
  ): Promise<
    MethodResult<
      RetrieveWorkflowUpdates["jobResult"],
      "failed_to_retreive_workflow_updates" | "workflow_not_found"
    >
  > {
    const { abortSignal } = options ?? {};
    const { workflowKey } = params.data;
    const workflowDataResponse = await buildLoadWorkflowData({
      workflowRunsStorage,
      workflowStorage,
    })(
      {
        workflowKey,
      },
      {
        maxRunsToLoad: 1,
      }
    );

    if (workflowDataResponse.hasFailed) {
      return {
        hasFailed: true,
        error: {
          code: "workflow_not_found",
          message: `Workflow ${workflowKey} not found`,
          error: new Error(`Workflow ${workflowKey} not found`),
          data: undefined,
        },
      };
    }

    const fetchWorkflowUpdatesResponse =
      await buildFetchWorkflowUpdatesController({
        saveWorkflowData: buildSaveWorkflowData({
          workflowRunsStorage,
          workflowStorage,
        }),
        githubClient: githubClient.rest,
      })({
        workflowInstance: workflowDataResponse.data,
        abortSignal,
        updateType: "newest",
      });

    if (fetchWorkflowUpdatesResponse.hasFailed) {
      return {
        hasFailed: true,
        error: {
          code: "failed_to_retreive_workflow_updates",
          message: fetchWorkflowUpdatesResponse.error.message,
          error: fetchWorkflowUpdatesResponse.error.error,
          data: undefined,
        },
      };
    }

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

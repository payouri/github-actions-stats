import { buildFetchWorkflowUpdatesController } from "../../controllers/fetchWorkflowUpdates.js";
import { DB } from "../../entities/db.js";
import { formatMs } from "../../helpers/format/formatMs.js";
import githubClient from "../../lib/githubClient.js";
import logger from "../../lib/Logger/logger.js";
import type {
  DefaultJob,
  DefaultJobDefinition,
} from "../../lib/Queue/types.js";
import type { MethodResult } from "../../types/MethodResult.js";

export const RETRIEVE_OLDER_RUNS_JOB_NAME = "retrieve-older-runs" as const;

export type RetrieveOldRunsJobJobName = typeof RETRIEVE_OLDER_RUNS_JOB_NAME;

export interface RetrieveOldRuns extends DefaultJobDefinition {
  jobName: RetrieveOldRunsJobJobName;
  jobData: {
    workflowKey: string;
    fetchedCount?: number;
  };
  jobResult: void;
  jobErrorCode: "failed_to_retrieve_old_runs" | "workflow_not_found";
}

export async function retrieveOldRuns(
  jobParams: DefaultJob<RetrieveOldRuns>,
  options?: { abortSignal?: AbortSignal }
): Promise<
  MethodResult<RetrieveOldRuns["jobResult"], RetrieveOldRuns["jobErrorCode"]>
> {
  const { abortSignal } = options ?? {};
  const { workflowKey, fetchedCount = 0 } = jobParams.data;

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

  const workflowDataResponse = await DB.queries.fetchWorkflowDataWithOldestRun({
    workflowKey,
  });

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
      saveWorkflowData: DB.mutations.saveWorkflowData,
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
      async onSavedWorkflowData({ savedWorkflowCount, workflowData }) {
        if (savedWorkflowCount >= maxJobsToFetch) {
          logger.debug(
            `Saved workflow data ${savedWorkflowCount} workflow runs stopping fetching more runs`
          );
          abortController.abort("Enough data fetched");
          return;
        }
        logger.debug(`Saved workflow data ${savedWorkflowCount} workflow runs`);
        await jobParams.updateData({
          workflowKey,
          fetchedCount: savedWorkflowCount,
        });
        for (const runKey of workflowData.savedRunsKeys) {
          const runData = await DB.queries.getRunData({
            workflowKey: workflowData.workflowKey,
            runKey,
          });
          if (!runData) {
            logger.warn(`Run data for run ${runKey} not found`);
            continue;
          }
          const res = await DB.mutations.upsertWorkflowRunStat(runData);
          if (res.hasFailed) {
            logger.warn(`Failed to upsert workflow run stat for run ${runKey}`);
          }
          logger.debug(`Upserted workflow run stat for run ${runKey}`);
        }
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
        code: "failed_to_retrieve_old_runs",
        message: fetchWorkflowUpdatesResponse.error.message,
        error: fetchWorkflowUpdatesResponse.error.error,
        data: undefined,
      },
    };
  }

  return {
    hasFailed: false,
  };
}

import { buildFetchWorkflowUpdatesController } from "../../controllers/fetchWorkflowUpdates.js";
import { DB } from "../../entities/db.js";
import githubClient from "../../lib/githubClient.js";
import logger from "../../lib/Logger/logger.js";
import type {
  DefaultJob,
  DefaultJobDefinition,
} from "../../lib/Queue/types.js";
import type { MethodResult } from "../../types/MethodResult.js";

export const RETRIEVE_WORKFLOW_UPDATES_JOB_NAME =
  "retrieve-workflow-updates" as const;

export type RetrieveWorkflowUpdatesJobJobName =
  typeof RETRIEVE_WORKFLOW_UPDATES_JOB_NAME;

export interface RetrieveWorkflowUpdates extends DefaultJobDefinition {
  jobName: RetrieveWorkflowUpdatesJobJobName;
  jobData: {
    workflowKey: string;
  };
  jobResult: void;
}

export async function retrieveWorkflowUpdates(
  params: DefaultJob<RetrieveWorkflowUpdates>,
  options?: { abortSignal?: AbortSignal }
): Promise<
  MethodResult<
    RetrieveWorkflowUpdates["jobResult"],
    "failed_to_retreive_workflow_updates" | "workflow_not_found"
  >
> {
  const { abortSignal } = options ?? {};
  const { workflowKey } = params.data;
  const workflowDataResponse = await DB.queries.fetchWorkflowDataWithNewestRun({
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
      onSavedWorkflowData: async ({ workflowData }) => {
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
            logger.error(
              `Failed to upsert workflow run stat for run ${runKey}`,
              res.error
            );
          }
          logger.debug(`Upserted workflow run stat for run ${runKey}`);
        }
      },
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
}

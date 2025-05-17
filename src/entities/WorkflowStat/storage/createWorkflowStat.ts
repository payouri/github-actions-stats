import type {
  ExtractMethodResult,
  MethodResult,
} from "../../../types/MethodResult.js";
import type { Prettify } from "../../../types/Prettify.js";
import type { FormattedWorkflowRun } from "../../FormattedWorkflow/types.js";
import { convertWorkflowRunToWorkflowRunStat } from "../helpers/convertWorkflowRunToWorkflowRunStat.js";
import type { WorkflowRunStatsMongoStorage } from "./mongo.js";

export type UpsertWorkflowRunStatResponse = MethodResult<
  void,
  "failed_to_upsert_workflow_run_stat",
  Error,
  {
    parentError: ExtractMethodResult<
      MethodResult<void, "failed_to_set_data" | "validation_failed">,
      true
    >["error"];
  }
>;

export function buildUpsertWorkflowRunStat(dependencies: {
  workflowRunStatsStorage: WorkflowRunStatsMongoStorage;
}) {
  const { workflowRunStatsStorage } = dependencies;
  return async function upsertWorkflowRunStat(
    params: Prettify<
      FormattedWorkflowRun & {
        workflowName: string;
        repositoryName: string;
        repositoryOwner: string;
      }
    >
  ): Promise<UpsertWorkflowRunStatResponse> {
    const statToInsert = convertWorkflowRunToWorkflowRunStat(params);

    const setResult = await workflowRunStatsStorage.set(
      `${params.repositoryOwner}/${params.repositoryName}/${params.workflowName}/${params.runId}`,
      statToInsert
    );
    if (setResult.hasFailed) {
      return {
        hasFailed: true,
        error: {
          code: "failed_to_upsert_workflow_run_stat",
          message: "Failed to upsert workflow run stat",
          error: setResult.error.error,
          data: {
            parentError: setResult.error,
          },
        },
      };
    }

    return {
      hasFailed: false,
    };
  };
}

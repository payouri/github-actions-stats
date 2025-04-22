import dayjs from "dayjs";
import { createWorkflowInstance } from "../../../cli/entities/RetrievedWorkflowData/methods/createWorkflowInstance.js";
import type { WorkFlowInstance } from "../../../cli/entities/RetrievedWorkflowData/types.js";
import type {
  WorkflowRunsStorage,
  WorkflowStorage,
} from "../../../entities/FormattedWorkflow/storage.js";
import logger from "../../../lib/Logger/logger.js";
import type { MethodResult } from "../../../types/MethodResult.js";

export type LoadWorkflowDataResponse = Promise<
  MethodResult<WorkFlowInstance, "failed_to_load_workflow_data">
>;

export type LoadWorkflowDataParams = {
  workflowName: string;
  repositoryName: string;
  repositoryOwner: string;
  branchName?: string;
};

export type LoadWorkflowDataMethod = (
  params: LoadWorkflowDataParams
) => Promise<LoadWorkflowDataResponse>;

export type LoadWorkflowDataDependencies = {
  workflowStorage: WorkflowStorage;
  workflowRunsStorage: WorkflowRunsStorage;
};

export function buildLoadWorkflowData(
  dependencies: LoadWorkflowDataDependencies
) {
  const { workflowStorage, workflowRunsStorage } = dependencies;

  return async function loadWorkflowData(
    params: LoadWorkflowDataParams
  ): Promise<LoadWorkflowDataResponse> {
    const { workflowName, repositoryName, repositoryOwner, branchName } =
      params;

    const [workflowData, runsData] = await Promise.all([
      workflowStorage.get(workflowName),
      workflowRunsStorage.query({
        workflowName,
        repositoryName,
        repositoryOwner,
        branchName,
        ranAt: {
          min: dayjs().subtract(90, "day").toDate(),
          max: new Date(),
        },
      }),
    ]);

    if (!workflowData) {
      return {
        hasFailed: true,
        error: {
          code: "failed_to_load_workflow_data",
          message: "Failed to load workflow data",
          error: new Error("Failed to load workflow data"),
          data: undefined,
        },
      };
    }

    const data = createWorkflowInstance({
      ...workflowData,
      workflowWeekRunsMap: runsData.reduce<
        WorkFlowInstance["workflowWeekRunsMap"]
      >((acc, run) => {
        if (!acc[run.week_year]) acc[run.week_year] = [];
        acc[run.week_year].push(run);

        return acc;
      }, {}),
    });

    logger.debug({
      workflowId: data.workflowId,
      workflowName: data.workflowName,
    });

    return {
      hasFailed: false,
      data,
    };
  };
}

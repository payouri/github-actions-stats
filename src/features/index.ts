import "colors";
import dayjs from "dayjs";
import { z } from "zod";
import { MONGO_CONFIG } from "../config/mongo.js";
import {
  formattedWorkflowRunConclusionSchema,
  formattedWorkflowRunSchema,
  formattedWorkflowRunStatusSchema,
  type FormattedWorkflowRun,
} from "../entities/index.js";
import { createWorkflowInstance } from "../entities/RetrievedWorkflowData/methods/createWorkflowInstance.js";
import { retrievedWorkflowV1Schema } from "../entities/RetrievedWorkflowData/schemas.js";
import type { WorkFlowInstance } from "../entities/RetrievedWorkflowData/types.js";
import githubClient from "../lib/githubClient.js";
import logger from "../lib/Logger/logger.js";
import { createMongoStorage } from "../storage/mongo.js";
import type { MethodResult } from "../types/MethodResult.js";
import { buildGetWorkflowInstance } from "./getWorkflowInstance/index.js";

const retrievedWorkflowV1SchemaWithoutWorkflowRunsMap =
  retrievedWorkflowV1Schema.omit({
    workflowWeekRunsMap: true,
  });
const formattedWorkflowRun = formattedWorkflowRunSchema.merge(
  z.object({
    workflowId: z.number(),
    workflowName: z.string(),
    repositoryName: z.string(),
    repositoryOwner: z.string(),
    branchName: z.string().optional(),
  })
);

function buildFeaturesModule() {
  const workflowStorage = createMongoStorage({
    collectionName: "workflow-data",
    dbURI: MONGO_CONFIG.dbURI,
    indexes: MONGO_CONFIG.indexes.workflows,
    schema: retrievedWorkflowV1SchemaWithoutWorkflowRunsMap,
    logger,
  });

  const workflowRunsStorage = createMongoStorage({
    collectionName: "workflow-runs",
    dbURI: MONGO_CONFIG.dbURI,
    schema: formattedWorkflowRun,
    indexes: MONGO_CONFIG.indexes.workflowRuns,
    logger,
  });

  async function loadWorkflowData(params: {
    workflowName: string;
    repositoryName: string;
    repositoryOwner: string;
    branchName?: string;
  }): Promise<MethodResult<WorkFlowInstance, "failed_to_load_workflow_data">> {
    const { workflowName, repositoryName, repositoryOwner, branchName } =
      params;
    const storage = await workflowStorage;

    const [workflowData, runsData] = await Promise.all([
      storage.get(workflowName),
      (
        await workflowRunsStorage
      ).query({
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
        Record<string, FormattedWorkflowRun[]>
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
  }

  async function saveWorkflowData(params: {
    workflowName: string;
    repositoryName: string;
    repositoryOwner: string;
    branchName?: string;
    workflowData: WorkFlowInstance;
    newOrUpdatedRuns?: FormattedWorkflowRun[];
  }): Promise<MethodResult<WorkFlowInstance, "failed_to_save_workflow_data">> {
    const {
      workflowName,
      // repositoryName,
      // repositoryOwner,
      // branchName,
      newOrUpdatedRuns,
      workflowData,
    } = params;
    const storage = await workflowStorage;
    const runStorage = await workflowRunsStorage;

    const {
      workflowWeekRunsMap,
      serializableData: _,
      formattedWorkflowRuns: __,
      ...restWorkFlowData
    } = workflowData;

    const transaction = await storage.startTransaction();
    transaction?.startTransaction({});
    try {
      await storage.set(
        workflowName,
        {
          ...restWorkFlowData,
          workflowParams: {
            owner: restWorkFlowData.repositoryOwner,
            repo: restWorkFlowData.repositoryName,
            branchName: restWorkFlowData.branchName,
          },
        },
        {
          session: transaction,
        }
      );
      const runsArrays = newOrUpdatedRuns || Object.values(workflowWeekRunsMap);
      if (runsArrays.length === 0) {
        logger.warn(
          `No runs found for workflow ${workflowData.workflowName.yellow}`
        );
        return {
          hasFailed: false,
          data: workflowData,
        };
      }

      const runs = runsArrays.reduce<
        Record<
          string,
          FormattedWorkflowRun & {
            workflowId: number;
            workflowName: string;
            repositoryName: string;
            repositoryOwner: string;
            branchName?: string;
          }
        >
      >((acc, runs) => {
        if (!Array.isArray(runs)) {
          acc[`${runs.workflowId}_${runs.runId}`] = {
            ...runs,
            status: runs.status,
            conclusion: runs.conclusion,
            usageData: runs.usageData,
            name: runs.name,
            runAt: runs.runAt,
            runId: runs.runId,
            workflowId: restWorkFlowData.workflowId,
            week_year: runs.week_year,
            repositoryName: restWorkFlowData.repositoryName,
            repositoryOwner: restWorkFlowData.repositoryOwner,
            branchName: restWorkFlowData.branchName,
            workflowName: restWorkFlowData.workflowName,
          };
          return acc;
        }
        runs.forEach((run) => {
          acc[`${run.workflowId}_${run.runId}`] = {
            ...run,
            status: run.status,
            conclusion: run.conclusion,
            usageData: run.usageData,
            name: run.name,
            runAt: run.runAt,
            runId: run.runId,
            workflowId: restWorkFlowData.workflowId,
            week_year: run.week_year,
            repositoryName: restWorkFlowData.repositoryName,
            repositoryOwner: restWorkFlowData.repositoryOwner,
            branchName: restWorkFlowData.branchName,
            workflowName: restWorkFlowData.workflowName,
          };
        });
        return acc;
      }, {});

      if (Object.keys(runs).length === 0) {
        logger.warn(
          `No runs found for workflow ${workflowData.workflowName.yellow}`
        );
        return {
          hasFailed: false,
          data: workflowData,
        };
      }

      await runStorage.setMany(runs, {
        session: transaction,
      });
    } catch (error) {
      logger.error("Failed to save workflow data", error);
      await transaction?.abortTransaction();
    } finally {
      await transaction?.commitTransaction();
    }

    return {
      hasFailed: false,
      data: workflowData,
    };
  }

  const getWorkflowInstance = buildGetWorkflowInstance({
    githubClient: githubClient.rest,
    loadWorkflowData,
    saveWorkflowData,
  });
  return { getWorkflowInstance, loadWorkflowData, saveWorkflowData };
}

let featuresModule: ReturnType<typeof buildFeaturesModule> | null = null;
export const getFeaturesModule = () => {
  if (!featuresModule) {
    featuresModule = buildFeaturesModule();
  }
  return featuresModule;
};

import {
	generateWorkflowKey,
	generateWorkflowRunKey,
} from "../../../../helpers/generateWorkflowKey.js";
import type {
	WorkflowRunsMongoStorage,
	WorkflowMongoStorage,
} from "../mongo.js";
import logger from "../../../../lib/Logger/logger.js";
import type { MethodResult } from "../../../../types/MethodResult.js";
import type {
	RetrievedWorkflow,
	FormattedWorkflowRun,
} from "@github-actions-stats/workflow-entity";

export type SaveWorkflowDataResponse = Promise<
	MethodResult<
		{
			savedRunsKeys: string[];
			workflowKey: string;
		},
		"failed_to_save_workflow_data"
	>
>;

export type SaveWorkflowDataParams = {
	workflowName: string;
	repositoryName: string;
	repositoryOwner: string;
	branchName?: string;
	workflowData: RetrievedWorkflow;
	newOrUpdatedRuns?: FormattedWorkflowRun[];
};

export type SaveWorkflowDataMethod = (
	params: SaveWorkflowDataParams,
) => Promise<SaveWorkflowDataResponse>;

export type SaveWorkflowDataDependencies = {
	workflowStorage: WorkflowMongoStorage;
	workflowRunsStorage: WorkflowRunsMongoStorage;
};

export function buildSaveWorkflowData(
	dependencies: SaveWorkflowDataDependencies,
) {
	const { workflowStorage, workflowRunsStorage } = dependencies;

	return async function saveWorkflowData(
		params: SaveWorkflowDataParams,
	): Promise<SaveWorkflowDataResponse> {
		const {
			workflowName,
			repositoryName,
			repositoryOwner,
			branchName,
			newOrUpdatedRuns,
			workflowData,
		} = params;

		const { workflowWeekRunsMap, ...restWorkFlowData } = workflowData;
		const workflowKey = generateWorkflowKey({
			workflowName,
			workflowParams: {
				owner: repositoryOwner,
				repo: repositoryName,
				branchName,
			},
		});

		const transaction = await workflowStorage.startTransaction();
		transaction?.startTransaction({});
		try {
			await workflowStorage.set(
				workflowKey,
				{
					...restWorkFlowData,
					workflowParams: {
						owner: restWorkFlowData.workflowParams.owner,
						repo: restWorkFlowData.workflowParams.repo,
						...(restWorkFlowData.workflowParams.branchName
							? { branchName: restWorkFlowData.workflowParams.branchName }
							: {}),
					},
				},
				{
					session: transaction,
				},
			);
			const runsArrays = newOrUpdatedRuns || Object.values(workflowWeekRunsMap);
			if (runsArrays.length === 0) {
				logger.warn(
					`No runs found for workflow ${workflowData.workflowName.yellow}`,
				);
				return {
					hasFailed: false,
					data: {
						savedRunsKeys: [],
						workflowKey,
					},
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
						workflowKey: string;
						branchName?: string;
					}
				>
			>((acc, runs) => {
				if (!Array.isArray(runs)) {
					acc[
						generateWorkflowRunKey({
							repositoryName: restWorkFlowData.workflowParams.repo,
							repositoryOwner: restWorkFlowData.workflowParams.owner,
							workflowName: restWorkFlowData.workflowName,
							runId: runs.runId,
							branchName: restWorkFlowData.workflowParams.branchName,
						})
					] = {
						...runs,
						workflowId: restWorkFlowData.workflowId,
						week_year: runs.week_year,
						repositoryName: restWorkFlowData.workflowParams.repo,
						repositoryOwner: restWorkFlowData.workflowParams.owner,
						branchName: restWorkFlowData.workflowParams.branchName,
						workflowName: restWorkFlowData.workflowName,
						workflowKey,
					};
					return acc;
				}

				// biome-ignore lint/complexity/noForEach: <explanation>
				runs.forEach((run) => {
					acc[
						generateWorkflowRunKey({
							repositoryName: restWorkFlowData.workflowParams.repo,
							repositoryOwner: restWorkFlowData.workflowParams.owner,
							workflowName: restWorkFlowData.workflowName,
							runId: run.runId,
							branchName: restWorkFlowData.workflowParams.branchName,
						})
					] = {
						...run,
						workflowId: restWorkFlowData.workflowId,
						week_year: run.week_year,
						repositoryName: restWorkFlowData.workflowParams.repo,
						repositoryOwner: restWorkFlowData.workflowParams.owner,
						branchName: restWorkFlowData.workflowParams.branchName,
						workflowName: restWorkFlowData.workflowName,
						workflowKey,
					};
				});
				return acc;
			}, {});

			const runsCount = Object.keys(runs).length;
			if (runsCount === 0) {
				logger.warn(
					`No runs found for workflow ${workflowData.workflowName.yellow}`,
				);
				return {
					hasFailed: false,
					data: {
						savedRunsKeys: [],
						workflowKey,
					},
				};
			}

			await Promise.all([
				workflowStorage.updateWithMongoSyntax(
					{
						key: workflowKey,
					},
					{
						$set: {
							totalWorkflowRuns:
								(await workflowRunsStorage.count({
									repositoryName,
									repositoryOwner,
									workflowId: workflowData.workflowId,
								})) + runsCount,
						},
					},
					{
						session: transaction,
					},
				),
				workflowRunsStorage.setMany(runs, {
					session: transaction,
				}),
			]);
			return {
				hasFailed: false,
				data: {
					savedRunsKeys: Object.keys(runs),
					workflowKey,
				},
			};
		} catch (error) {
			logger.error("Failed to save workflow data", error);
			await transaction?.abortTransaction();
			throw error;
		} finally {
			await transaction?.commitTransaction();
		}
	};
}

import type { RetrievedWorkflow } from "@github-actions-stats/workflow-entity";
import type { Octokit } from "octokit";
import type { ProcessResponse } from "../ProcessResponse.types.js";
import type { SaveWorkflowDataMethod } from "../entities/FormattedWorkflow/storage/methods/saveWorkflowData.js";
import { createEmptyWorkflowData } from "../helpers/createEmptyWorkflowData.js";
import logger from "../lib/Logger/logger.js";
import { buildGetRepoWorkflowDataRequest } from "../lib/RequestsManager/requests/getRepoWorkflowData.js";
import type { MethodResult } from "../types/MethodResult.js";

export type FetchWorkflowDataControllerDependencies = {
	githubClient: Octokit["rest"];
	loadRetrievedWorkflowData: (params: {
		workflowName: string;
		workflowParams: {
			owner: string;
			repo: string;
		};
	}) => Promise<ProcessResponse<RetrievedWorkflow>>;
	isExistingWorkflowData: (params: {
		workflowName: string;
		workflowParams: {
			owner: string;
			repo: string;
		};
	}) => Promise<boolean>;
	saveRetrievedWorkflowData: SaveWorkflowDataMethod;
};

export type FetchWorkflowDataControllerParams = {
	repositoryName: string;
	repositoryOwner: string;
	workflowName: string;
};
export type FetchWorkflowDataControllerOptions = {
	allowFallback?: boolean;
	createIfNotExists?: boolean;
	allowUpdate?: boolean;
};

export type FetchWorkflowDataControllerResponse = MethodResult<
	RetrievedWorkflow,
	"repo_not_found" | "workflow_not_found" | "failed_to_load_workflow_data"
>;

export type FetchWorkflowDataController = (
	params: FetchWorkflowDataControllerParams,
	options?: FetchWorkflowDataControllerOptions,
) => Promise<FetchWorkflowDataControllerResponse>;

export function buildFetchWorkflowDataController(
	dependencies: FetchWorkflowDataControllerDependencies,
) {
	const {
		githubClient,
		isExistingWorkflowData,
		loadRetrievedWorkflowData,
		saveRetrievedWorkflowData,
	} = dependencies;

	const getRepoWorkflowDataRequest = buildGetRepoWorkflowDataRequest({
		octokit: githubClient,
	});

	return async function fetchWorkflowDataController(
		params: FetchWorkflowDataControllerParams,
		options?: FetchWorkflowDataControllerOptions,
	): Promise<FetchWorkflowDataControllerResponse> {
		const { repositoryName, repositoryOwner, workflowName } = params;
		const { allowFallback = false, createIfNotExists = true } = options ?? {};

		const [repoWorkflowDataResponse, workflowDataResponse] = await Promise.all([
			getRepoWorkflowDataRequest({
				repositoryName,
				repositoryOwner,
				workflowName,
			}),
			loadRetrievedWorkflowData({
				workflowName,
				workflowParams: {
					owner: repositoryOwner,
					repo: repositoryName,
				},
			}),
		]);

		if (repoWorkflowDataResponse.hasFailed) {
			if (allowFallback) {
				if (workflowDataResponse.hasFailed) {
					return {
						hasFailed: true,
						error: {
							code: "failed_to_load_workflow_data",
							message: workflowDataResponse.error.message,
							error: workflowDataResponse.error,
							data: undefined,
						},
					};
				}

				return {
					hasFailed: false,
					data: workflowDataResponse.data,
				};
			}

			return {
				hasFailed: true,
				error: {
					code: "failed_to_load_workflow_data",
					message: repoWorkflowDataResponse.error.message,
					error: repoWorkflowDataResponse.error.error,
					data: undefined,
				},
			};
		}

		if (
			createIfNotExists &&
			!(await isExistingWorkflowData({
				workflowName,
				workflowParams: {
					owner: repositoryOwner,
					repo: repositoryName,
				},
			}))
		) {
			logger.debug(
				`Creating workflow data for workflow ${workflowName} in repository ${repositoryName} by ${repositoryOwner}`,
			);
			const workflowData = createEmptyWorkflowData({
				workflowId: repoWorkflowDataResponse.data.workflows.workflow.id,
				workflowName,
				workflowRepository: repositoryName,
				workflowOwner: repositoryOwner,
			});
			const saveResultResponse = await saveRetrievedWorkflowData({
				repositoryName,
				repositoryOwner,
				workflowName,
				workflowData,
			});

			if (!saveResultResponse.hasFailed) {
				return {
					hasFailed: false,
					data: workflowData,
				};
			}
		}

		if (workflowDataResponse.hasFailed) {
			return {
				hasFailed: true,
				error: {
					code: "failed_to_load_workflow_data",
					message: workflowDataResponse.error.message,
					error: workflowDataResponse.error,
					data: undefined,
				},
			};
		}

		return {
			hasFailed: false,
			data: workflowDataResponse.data,
		};
	};
}

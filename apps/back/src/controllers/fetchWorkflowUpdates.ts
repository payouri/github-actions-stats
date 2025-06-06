import dayjs from "dayjs";
import type { Octokit } from "octokit";
import type { WorkFlowInstance } from "../cli/entities/RetrievedWorkflowData/types.js";
import type { SaveWorkflowDataMethod } from "../entities/FormattedWorkflow/storage/methods/saveWorkflowData.js";
import { getFormattedWorkflowRun } from "../helpers/getFormattedWorkflowRun.js";
import { updateRunUsageWithJobs } from "../helpers/updateRunUsageWithJobs.js";
import logger from "../lib/Logger/logger.js";
import { buildGithubRequests } from "../lib/RequestsManager/requests/buildRequests.js";
import type { MethodResult } from "../types/MethodResult.js";
import { AbortError } from "../errors/AbortError.js";

const DEFAULT_WORKFLOW_PER_PAGE = 100 as const;
const DEFAULT_UPDATE_TYPE = "newest" as const;

function getRequestCreatedAtParams(
	data: Pick<WorkFlowInstance, "lastRunAt" | "oldestRunAt">,
	updateType: "oldest" | "newest",
) {
	if (updateType === "oldest") {
		return {
			created: `<${dayjs(data.oldestRunAt).format("YYYY-MM-DD")}`,
		};
	}

	return {
		created: `>${dayjs(data.lastRunAt).format("YYYY-MM-DD")}`,
	};
}

export type FetchWorkflowUpdatesControllerDependencies = {
	githubClient: Octokit["rest"];
	workflowPerPage?: number;
	onPage?: (params: {
		perPage: number;
		page: number;
		total: number;
	}) => Promise<void> | void;
	saveWorkflowData: SaveWorkflowDataMethod;
	onSavedWorkflowData: (params: {
		workflowData: {
			savedRunsKeys: string[];
			workflowKey: string;
		};
		savedWorkflowCount: number;
	}) => Promise<void> | void;
};
export type FetchWorkflowUpdatesControllerParams = {
	workflowInstance: WorkFlowInstance;
	updateType?: "oldest" | "newest" | "both";
	abortSignal?: AbortSignal;
	alreadyFetchedCount?: number;
};
export type FetchWorkflowUpdatesControllerResponse = MethodResult<
	WorkFlowInstance,
	| "failed_to_fetch_workflow_updates"
	| "failed_to_save_workflow_data"
	| "aborted"
>;
export type FetchWorkflowUpdatesController = (
	params: FetchWorkflowUpdatesControllerParams,
) => Promise<FetchWorkflowUpdatesControllerResponse>;

export function buildFetchWorkflowUpdatesController(
	dependencies: FetchWorkflowUpdatesControllerDependencies,
) {
	const {
		githubClient,
		workflowPerPage = DEFAULT_WORKFLOW_PER_PAGE,
		onPage,
		saveWorkflowData,
		onSavedWorkflowData,
	} = dependencies;

	const githubRequests = buildGithubRequests({
		octokit: githubClient,
	});

	return async function fetchWorkflowUpdatesController(
		params: FetchWorkflowUpdatesControllerParams,
	): Promise<FetchWorkflowUpdatesControllerResponse> {
		const {
			workflowInstance,
			updateType = DEFAULT_UPDATE_TYPE,
			abortSignal,
			alreadyFetchedCount = 0,
		} = params;

		if (updateType === "both") {
			throw new Error("Both update type is not supported yet");
		}
		logger.debug(`Update type: ${updateType}`);

		const { created } = getRequestCreatedAtParams(workflowInstance, updateType);

		let page = 1;
		let isDone = false;
		let totalCount = 0;
		let savedWorkflow = alreadyFetchedCount;
		do {
			try {
				if (abortSignal?.aborted) {
					logger.warn(
						`Fetching ${workflowInstance.repositoryOwner}/${workflowInstance.repositoryName}/${workflowInstance.workflowId} workflow runs aborted`,
					);
					return {
						hasFailed: true,
						error: {
							code: "aborted",
							message: "Aborted",
							error: new AbortError({
								message: "Fetch workflow updates aborted",
								signal: abortSignal,
								abortReason:
									typeof abortSignal.reason === "string"
										? abortSignal.reason
										: JSON.stringify(abortSignal.reason),
							}),
							data: undefined,
						},
					};
				}

				const response = await githubClient.actions.listWorkflowRuns({
					created,
					owner: workflowInstance.repositoryOwner,
					repo: workflowInstance.repositoryName,
					workflow_id: workflowInstance.workflowId,
					page,
					per_page: workflowPerPage,
					//   event: triggerEvent,
					//   branch: branchName,
					//   status: workflowStatus,
				});

				if (response.data.total_count > totalCount) {
					totalCount = response.data.total_count;
				}
				onPage?.({ page, total: totalCount, perPage: workflowPerPage });

				if (!response.data.workflow_runs.length) {
					break;
				}
				page += 1;
				isDone = response.data.workflow_runs.length < workflowPerPage;

				for (const workflowRun of response.data.workflow_runs) {
					if (abortSignal?.aborted) {
						logger.warn(
							`Fetching ${workflowInstance.repositoryOwner}/${workflowInstance.repositoryName}/${workflowInstance.workflowId} workflow runs aborted`,
						);
						return {
							hasFailed: true,
							error: {
								code: "aborted",
								message: "Aborted",
								error: new AbortError({
									message: "Fetch workflow updates aborted",
									signal: abortSignal,
									abortReason:
										typeof abortSignal.reason === "string"
											? abortSignal.reason
											: JSON.stringify(abortSignal.reason),
								}),
								data: undefined,
							},
						};
					}

					logger.debug(`Fetching workflow run ${workflowRun.id}`);
					const formattedWorkflowRun = getFormattedWorkflowRun(workflowRun);

					const [usageDataResponse, jobsDataResponse] = await Promise.all([
						githubRequests.getWorkflowRunsUsage({
							owner: workflowInstance.repositoryOwner,
							repo: workflowInstance.repositoryName,
							workflowRunIds: [workflowRun.id],
						}),
						githubRequests.getWorkflowRunJobs({
							owner: workflowInstance.repositoryOwner,
							repo: workflowInstance.repositoryName,
							workflowRunId: workflowRun.id,
						}),
					]);

					if (usageDataResponse.hasFailed) {
						return {
							hasFailed: true,
							error: {
								code: "failed_to_fetch_workflow_updates",
								message: "Failed to fetch workflow updates",
								error:
									usageDataResponse.error.error instanceof Error
										? usageDataResponse.error.error
										: new Error("Failed to fetch workflow updates", {
												cause: usageDataResponse.error.error,
											}),
								data: undefined,
							},
						};
					}
					if (jobsDataResponse.hasFailed) {
						return {
							hasFailed: true,
							error: {
								code: "failed_to_fetch_workflow_updates",
								message: "Failed to fetch workflow updates",
								error:
									jobsDataResponse.error.error instanceof Error
										? jobsDataResponse.error.error
										: new Error("Failed to fetch workflow updates", {
												cause: jobsDataResponse.error.error,
											}),
								data: undefined,
							},
						};
					}

					const {
						data: { usage: runUsageData },
					} = usageDataResponse;
					const {
						data: { jobs: jobsArray },
					} = jobsDataResponse;

					formattedWorkflowRun.usageData = updateRunUsageWithJobs({
						runUsageData: {
							run_duration_ms: runUsageData[workflowRun.id].run_duration_ms,
							billable: runUsageData[workflowRun.id].billable,
						},
						jobs: jobsArray,
					});

					const isExistingRunData = workflowInstance.isExistingRunData(
						formattedWorkflowRun.runId,
					);
					if (isExistingRunData) {
						const hasMissingData = workflowInstance.runHasMissingData(
							// biome-ignore lint/style/noNonNullAssertion: <explanation>
							workflowInstance.getRunData(formattedWorkflowRun.runId)!,
						);
						if (!hasMissingData) {
							continue;
						}
					}
					if (isExistingRunData) {
						workflowInstance.updateRunData({
							runId: formattedWorkflowRun.runId,
							runUsageData: formattedWorkflowRun.usageData,
						});
					} else {
						workflowInstance.addRunData({
							runId: formattedWorkflowRun.runId,
							runData: formattedWorkflowRun,
						});
					}

					const saveResult = await saveWorkflowData({
						repositoryName: workflowInstance.repositoryName,
						repositoryOwner: workflowInstance.repositoryOwner,
						workflowData: workflowInstance.serializableData,
						workflowName: workflowInstance.workflowName,
						branchName: workflowInstance.branchName,
						newOrUpdatedRuns: [formattedWorkflowRun],
					});

					if (saveResult.hasFailed) {
						return {
							hasFailed: true,
							error: {
								code: "failed_to_save_workflow_data",
								message: "Failed to save workflow data",
								error: saveResult.error.error,
								data: saveResult.error.data,
							},
						};
					}
					savedWorkflow += 1;
					await onSavedWorkflowData?.({
						workflowData: saveResult.data,
						savedWorkflowCount: savedWorkflow,
					});
				}
			} catch (err) {
				logger.error("Failed to fetch workflow updates", err);
				return {
					hasFailed: true,
					error: {
						code: "failed_to_fetch_workflow_updates",
						message: "Failed to fetch workflow updates",
						error:
							err instanceof Error
								? err
								: new Error("Failed to fetch workflow updates", {
										cause: err,
									}),
						data: undefined,
					},
				};
			}
		} while (!isDone);

		return {
			hasFailed: false,
			data: workflowInstance,
		};
	};
}

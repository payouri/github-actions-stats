import type { components } from "@octokit/openapi-types";
import type { Api as GithubApi } from "@octokit/plugin-rest-endpoint-methods";
import "colors";
import dayjs from "dayjs";
import logger from "../../Logger/logger.js";

export type BuildGetAllWorkflowsControllerDependencies<
	T = components["schemas"]["workflow"],
> = {
	githubClient: GithubApi["rest"];
	formatWorkflow?: (param: components["schemas"]["workflow-run"]) => T;
	transformWorkflow?: (params: {
		workflow: T;
		owner: string;
		repo: string;
		workflowId: number;
		branchName?: string;
		triggerEvent?: string;
	}) => T | Promise<T>;
	workflowPerPage?: number;
	onPage?: (params: { perPage: number; page: number; total: number }) => void;
};

export type GetAllWorkflowsControllerParams<T> = {
	owner: string;
	repo: string;
	workflowStatus?: components["parameters"]["workflow-run-status"];
	workflowId: number;
	onFinalWorkflow?: (params: T) => void;
	createdAfter?: string;
	branchName?: string;
	triggerEvent?: string;
	startPage?: number;
};

export type GetAllWorkflowsControllerResponse<
	T = components["schemas"]["workflow-run"],
> =
	| {
			hasFailed: false;
			data: { total: number; workflows: T[] };
	  }
	| {
			hasFailed: true;
			error: Error;
	  };

export type GetAllWorkflowsController<
	T = components["schemas"]["workflow-run"],
> = (
	params: GetAllWorkflowsControllerParams<T>,
) => Promise<GetAllWorkflowsControllerResponse<T>>;

export const buildGetAllWorkflowsController = <
	T = components["schemas"]["workflow-run"],
>(
	dependencies: BuildGetAllWorkflowsControllerDependencies<T>,
) => {
	const {
		githubClient,
		formatWorkflow,
		workflowPerPage = 100,
		onPage,
		transformWorkflow,
	} = dependencies;

	return async (
		params: GetAllWorkflowsControllerParams<T>,
	): Promise<GetAllWorkflowsControllerResponse<T>> => {
		const {
			owner,
			repo,
			startPage,
			workflowId,
			triggerEvent,
			branchName,
			workflowStatus,
			createdAfter,
			onFinalWorkflow,
		} = params;

		let workflows: T[] = [];
		let page = typeof startPage !== "number" || startPage < 1 ? 1 : startPage;
		logger.debug("Fetching page", page);
		let isDone = false;
		let total = 0;
		const now = dayjs();

		try {
			while (!isDone) {
				const {
					data: { workflow_runs, total_count },
				} = await githubClient.actions.listWorkflowRuns({
					owner,
					repo,
					workflow_id: workflowId,
					page,
					per_page: workflowPerPage,
					event: triggerEvent,
					branch: branchName,
					status: workflowStatus,
					created: `>${dayjs(
						createdAfter ?? now.subtract(1, "year").subtract(1, "day"),
					).format("YYYY-MM-DD")}`,
				});

				if (total_count > total) total = total_count;

				onPage?.({ page, total, perPage: workflowPerPage });

				const newWorkflows = workflow_runs.reduce<T[] | Promise<T[]>>(
					async (promiseAcc, workflowRun) => {
						const acc = await promiseAcc;
						const formattedWorkflowRun = (formatWorkflow?.(workflowRun) ??
							workflowRun) as T;

						const finalWorkflowRun =
							typeof transformWorkflow === "function"
								? await transformWorkflow({
										workflow: formattedWorkflowRun,
										owner,
										repo,
										workflowId,
										branchName,
										triggerEvent,
									})
								: formattedWorkflowRun;

						if (finalWorkflowRun) {
							acc.push(finalWorkflowRun);
							onFinalWorkflow?.(finalWorkflowRun);
						}

						return acc;
					},
					[],
				);
				workflows = workflows.concat(await newWorkflows);
				isDone = workflow_runs.length < workflowPerPage;
				if (isDone && workflows.length !== total) {
					console.warn("Github wont return all workflows".bgBlack.yellow);
					total = workflows.length;
				}
				page++;
			}
		} catch (err) {
			return {
				hasFailed: true,
				error: new Error("Failed to fetch workflows", {
					cause: err,
				}),
			};
		}

		if (workflows.length === 0) {
			return {
				hasFailed: false,
				data: {
					total: 0,
					workflows: [],
				},
			};
		}

		return {
			hasFailed: false,
			data: {
				workflows: workflows,
				total,
			},
		};
	};
};

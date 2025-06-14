import type { GetWorkflowRunsProcedureResponse } from "@github-actions-stats/workflow-client/src/procedures/workflow.procedures";
import { queryClientUtils } from "../../../../../hooks/useRequest";

export const RUNS_VIEW_LOADER_ID = "workflow-runs";

export async function runsViewLoader(params: {
	workflowKey: string;
	start?: number;
	count?: number;
}) {
	const { start = 0, count = 20, workflowKey } = params;

	const [workflowRunsResponse] = await Promise.all([
		queryClientUtils.getWorkflowRuns.fetchInfinite({
			workflowKey,
			count,
			cursor: start,
		}),
	]);

	if (workflowRunsResponse.pages.some((p) => p.hasFailed)) {
		throw new Error("Failed to load workflow runs");
	}
	const { pages } = workflowRunsResponse;
	const data: Array<
		Exclude<
			Awaited<GetWorkflowRunsProcedureResponse>,
			{ hasFailed: true }
		>["data"]
	> = pages.flatMap((p) => {
		if (p.hasFailed) {
			throw new Error("Failed to load workflow runs");
		}

		return p.data;
	});
	const nextCursor =
		data.length === count ? data[data.length - 1].nextCursor : null;

	return {
		workflowRuns: data.flatMap((d) => d.runs),
		workflowKey,
		nextCursor,
	};
}

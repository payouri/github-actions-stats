import { useLoaderData, useRouteLoaderData } from "react-router";
import { queryClientUtils } from "../../../hooks/useRequest";
import type { AggregatePeriod } from "@github-actions-stats/workflow-entity";

export async function loadStatsData(params: {
	workflowKey: string;
	from: Date;
	period: AggregatePeriod;
}) {
	const { from, period, workflowKey } = params;

	const [stats] = await Promise.all([
		queryClientUtils.getAggregatedWorkflowStats.ensureData({
			workflowKey,
			from,
			period,
		}),
	]);

	return {
		stats,
		workflowKey,
	};
}

export async function loadMainContentData(params: {
	workflowKey: string;
	start?: number;
	count?: number;
}) {
	const { start = 0, count = 10, workflowKey } = params;

	const [workflowRuns] = await Promise.all([
		queryClientUtils.getWorkflowRuns.ensureData({
			workflowKey,
			count,
			start,
		}),
	]);

	return {
		workflowRuns,
		workflowKey,
	};
}

export const useRouteMainContentDataLoader = () =>
	useRouteLoaderData<Awaited<ReturnType<typeof loadMainContentData>>>(
		"workflow-overview",
	);

export const useMainContentDataLoader = useLoaderData<
	Awaited<ReturnType<typeof loadMainContentData>>
>;
export const useRouteStatsDataLoader = () =>
	useRouteLoaderData<Awaited<ReturnType<typeof loadStatsData>>>(
		"workflow-overview",
	);
export const useStatsDataLoader = useLoaderData<
	Awaited<ReturnType<typeof loadStatsData>>
>;

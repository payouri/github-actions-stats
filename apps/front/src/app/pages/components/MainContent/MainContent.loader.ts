import type { AggregatePeriod } from "@github-actions-stats/workflow-entity";
import { useLoaderData, useRouteLoaderData } from "react-router";
import { queryClientUtils } from "../../../hooks/useRequest";
import dayjs from "dayjs";

export async function loadStatsData(params: {
	workflowKey: string;
	from: Date;
	period: AggregatePeriod;
}) {
	const { from, period, workflowKey } = params;

	const [stats] = await Promise.all([
		queryClientUtils.getAggregatedWorkflowStats.ensureData({
			workflowKey,
			from: dayjs(from).endOf("hour").toDate(),
			period,
		}),
	]);

	return {
		stats,
		workflowKey,
	};
}

export async function loadWorkflowRunsData(params: {
	workflowKey: string;
	start?: number;
	count?: number;
}) {
	const { start = 0, count = 10, workflowKey } = params;

	const [workflowRuns] = await Promise.all([
		queryClientUtils.getWorkflowRuns.ensureData({
			workflowKey,
			count,
			cursor: start,
		}),
	]);

	return {
		workflowRuns,
		workflowKey,
	};
}

export const useRouteMainContentDataLoader = () =>
	useRouteLoaderData<Awaited<ReturnType<typeof loadWorkflowRunsData>>>(
		"workflow-runs",
	);

export const useMainContentDataLoader = useLoaderData<
	Awaited<ReturnType<typeof loadWorkflowRunsData>>
>;
export const useRouteStatsDataLoader = () => {
	const overviewData =
		useRouteLoaderData<Awaited<ReturnType<typeof loadStatsData>>>(
			"workflow-overview",
		);
	if (!overviewData?.stats) {
		throw new Error("Stats are not loaded");
	}
	if (overviewData.stats.hasFailed) {
		throw new Error("Stats failed to load");
	}

	return overviewData.stats.data;
};
export const useStatsDataLoader = useLoaderData<
	Awaited<ReturnType<typeof loadStatsData>>
>;

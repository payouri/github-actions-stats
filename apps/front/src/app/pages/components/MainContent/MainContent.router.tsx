import { aggregatePeriodSchema } from "@github-actions-stats/workflow-entity";
import dayjs from "dayjs";
import type { RouteObject } from "react-router";
import { DEFAULT_DATE_PERIOD } from "../../../components/SelectDateRange/SelectDateRange.component";
import { loadStatsData } from "./MainContent.loader";
import { OverviewView } from "./views/Overview.components";
import { RunsView } from "./views/RunsView/RunsView.components";
import {
	RUNS_VIEW_LOADER_ID,
	runsViewLoader,
} from "./views/loaders/RunsView.loader";

const getSearchParamsFromUrl = (url: string) => {
	const searchParams = new URLSearchParams(url.split("?")[1]);
	return searchParams;
};

export const MainContentRouter: RouteObject[] = [
	{
		id: "workflow-overview",
		path: "/:workflowKey",
		Component: OverviewView,
		HydrateFallback: OverviewView,
		loader: async ({ params: { workflowKey }, request }) => {
			if (!workflowKey) {
				throw new Error("Workflow key is required");
			}

			const searchParams = getSearchParamsFromUrl(request.url);
			const period = aggregatePeriodSchema.safeParse(
				searchParams.get("period"),
			);
			const from = dayjs(searchParams.get("from"));

			return await loadStatsData({
				workflowKey,
				period: period.success ? period.data : DEFAULT_DATE_PERIOD,
				from: from.isValid() ? from.toDate() : new Date(),
			});
		},
	},
	{
		id: RUNS_VIEW_LOADER_ID,
		path: "/:workflowKey/runs",
		Component: RunsView,
		HydrateFallback: RunsView,
		loader: async ({ params: { workflowKey } }) => {
			if (!workflowKey) {
				throw new Error("Workflow key is required");
			}

			return await runsViewLoader({
				workflowKey,
			});
		},
	},
	// {
	// 	id: "workflow-jobs",
	// 	path: "/:workflowKey/jobs",
	// 	Component: JobsView,
	// 	loader,
	// },
	{
		id: "workflow-costs",
		path: "/:workflowKey/costs",
		element: <div>Costs</div>,
		// loader,
	},
	{
		id: "workflow-graphs",
		path: "/:workflowKey/graphs",
		element: <div>Graphs</div>,
		// loader,
	},
];

const capitalize = (str: string) => {
	return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getMainContentFormattedRoutes = () => {
	return MainContentRouter.reduce<Record<string, string>>((acc, route) => {
		const { id, path } = route;
		if (!path || !id) {
			return acc;
		}

		acc[path] = capitalize(id.replace("workflow-", ""));
		return acc;
	}, {});
};

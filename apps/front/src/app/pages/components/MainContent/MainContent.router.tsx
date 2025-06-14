import { aggregatePeriodSchema } from "@github-actions-stats/workflow-entity";
import dayjs from "dayjs";
import type { LoaderFunction, RouteObject } from "react-router";
import { HomePageLoader } from "../../Home.loader";
import { loadStatsData, loadWorkflowRunsData } from "./MainContent.loader";
import { OverviewView } from "./views/Overview.components";
import { RunsView } from "./views/RunsView.components";
import {
	RUNS_VIEW_LOADER_ID,
	runsViewLoader,
} from "./views/loaders/RunsView.loader";

const getSearchParamsFromUrl = (url: string) => {
	const searchParams = new URLSearchParams(url.split("?")[1]);
	return searchParams;
};

const loader = async (...loaderParams: Parameters<LoaderFunction>) => {
	const [
		{
			params: { workflowKey },
			request,
		},
	] = loaderParams;
	if (!workflowKey) {
		throw new Error("Workflow key is required");
	}
	const searchParams = getSearchParamsFromUrl(request.url);
	const period = aggregatePeriodSchema.safeParse(searchParams.get("period"));
	const from = dayjs(searchParams.get("from"));

	const [homeLoaded, mainLoaded, statsLoaded] = await Promise.all([
		HomePageLoader({}),
		loadWorkflowRunsData({
			workflowKey,
		}),
		loadStatsData({
			workflowKey,
			period: period.success ? period.data : "last_7_days",
			from: from.isValid() ? from.toDate() : new Date(),
		}),
	]);
	return {
		...homeLoaded,
		...mainLoaded,
		...statsLoaded,
		workflowKey,
	};
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
				period: period.success ? period.data : "last_7_days",
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

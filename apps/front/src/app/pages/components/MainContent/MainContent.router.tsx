import type { RouteObject } from "react-router";
import { JobsView } from "./views/JobsView.components";
import { OverviewView } from "./views/Overview.components";
import { HomePageLoader } from "../../Home.loader";
import { loadMainContentData, loadStatsData } from "./MainContent.loader";
import { aggregatePeriodSchema } from "@github-actions-stats/workflow-entity";
import dayjs from "dayjs";

const getSearchParamsFromUrl = (url: string) => {
	const searchParams = new URLSearchParams(url.split("?")[1]);
	return searchParams;
};

export const MainContentRouter: RouteObject[] = [
	{
		id: "workflow-overview",
		path: "/:workflowKey",
		Component: OverviewView,
		loader: async ({ params: { workflowKey }, request }) => {
			if (!workflowKey) {
				throw new Error("Workflow key is required");
			}
			const searchParams = getSearchParamsFromUrl(request.url);
			const period = aggregatePeriodSchema.safeParse(
				searchParams.get("period"),
			);
			const from = dayjs(searchParams.get("from"));

			const [homeLoaded, mainLoaded, statsLoaded] = await Promise.all([
				HomePageLoader({}),
				loadMainContentData({
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
			};
		},
	},
	{
		id: "workflow-runs",
		path: "/:workflowKey/runs",
		Component: () => <div>Runs</div>,
	},
	{
		id: "workflow-jobs",
		path: "/:workflowKey/jobs",
		Component: JobsView,
	},
	{
		id: "workflow-costs",
		path: "/:workflowKey/costs",
		element: <div>Costs</div>,
	},
	{
		id: "workflow-graphs",
		path: "/:workflowKey/graphs",
		element: <div>Graphs</div>,
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

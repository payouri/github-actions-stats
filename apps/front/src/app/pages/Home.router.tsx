import type { RouteObject } from "react-router";
import { HomePageLoader } from "./Home.loader";
import { loadMainContentData } from "./components/MainContent/MainContent.loader";
import { MainContentRouter } from "./components/MainContent/MainContent.router";
import { lazy } from "react";

const LazyMainContent = lazy(
	() => import("./components/MainContent/MainContent.component"),
);

export const HomeRouter: RouteObject[] = [
	{
		path: "/",
		Component: LazyMainContent,
		id: "home",
		loader: async () => {
			return await HomePageLoader({});
		},
	},
	{
		id: "main",
		path: "/:workflowKey",
		loader: async ({ params: { workflowKey } }) => {
			if (!workflowKey) {
				throw new Error("Workflow key is required");
			}

			const [homeLoaded, mainLoaded] = await Promise.all([
				HomePageLoader({}),
				loadMainContentData({
					workflowKey,
				}),
			]);
			return {
				...homeLoaded,
				...mainLoaded,
			};
		},
		Component: LazyMainContent,
		children: MainContentRouter,
	},
];

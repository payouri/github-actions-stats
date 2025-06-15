import { lazy } from "react";
import type { RouteObject } from "react-router";
import { HomePageLoader } from "./Home.loader";
import { MainContentRouter } from "./components/MainContent/MainContent.router";

const LazyMainContent = lazy(
	() => import("./components/MainContent/MainContent.component"),
);

export const HomeRouter: RouteObject[] = [
	{
		id: "home",
		index: true,
		path: "*",
	},
	{
		id: "no_workflow_selected",
		path: "/",
		Component: LazyMainContent,
		hydrateFallbackElement: <div>Loading...</div>,
	},
	{
		id: "main",
		path: "/:workflowKey",
		hydrateFallbackElement: <div>Loading...</div>,
		Component: LazyMainContent,
		children: MainContentRouter,
	},
];

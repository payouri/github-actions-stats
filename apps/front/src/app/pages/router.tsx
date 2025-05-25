import type { RouteObject } from "react-router";
import { MainContent } from "./components/MainContent/MainContent.component";
import { lazy } from "react";

const LazyComponent = lazy(
	() => import("./components/MainContent/MainContent.component"),
);

export const HomeRouter: RouteObject[] = [
	{
		path: "/:workflowKey",
		loader: ({ params }) => {
			console.log(params);
			console.log("Loaded");
		},
		Component: LazyComponent,
	},
];

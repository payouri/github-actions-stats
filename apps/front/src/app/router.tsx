import {
	createBrowserRouter,
	createRoutesFromElements,
	Route,
} from "react-router-dom";
import { HomePage, HomePageLoader } from "./pages/Home";
import { HomeRouter } from "./pages/router";

export const AppRoutes = createBrowserRouter([
	{
		path: "/",
		hydrateFallbackElement: <div>Loading...</div>,
		Component: HomePage,
		async loader({ params, context, request }) {
			console.log(params, context, request);
			const { start, count } = params;
			return await HomePageLoader({
				count: Number.isInteger(count) ? Number(count) : undefined,
				start: Number.isInteger(start) ? Number(start) : undefined,
			});
		},
		children: HomeRouter,
	},
]);

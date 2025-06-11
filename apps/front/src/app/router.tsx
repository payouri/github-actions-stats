import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "./pages/Home.component";
import { HomePageLoader } from "./pages/Home.loader";
import { HomeRouter } from "./pages/Home.router";

export const AppRoutes = createBrowserRouter([
	{
		path: "/",
		id: "root",
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

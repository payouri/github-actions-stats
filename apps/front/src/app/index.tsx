import "@radix-ui/themes/styles.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, Suspense } from "react";
import { queryClient, trpcReact, trpcReactClient } from "./hooks/useRequest";
import { AppRoutes } from "./router";
import { RadixThemeProvider } from "./theme/ThemeProvider";
import { RouterProvider } from "react-router-dom";

const App = () => {
	return (
		<StrictMode>
			<RadixThemeProvider>
				<trpcReact.Provider client={trpcReactClient} queryClient={queryClient}>
					<QueryClientProvider client={queryClient}>
						<Suspense fallback="loading">
							<RouterProvider router={AppRoutes} />
						</Suspense>
					</QueryClientProvider>
				</trpcReact.Provider>
			</RadixThemeProvider>
		</StrictMode>
	);
};

export default App;

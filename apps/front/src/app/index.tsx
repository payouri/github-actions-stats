import { Avatar, Flex, Grid, Heading, Spinner } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { type FC, StrictMode, Suspense } from "react";
import { WorkflowSidebar } from "./components/WorkflowSidebar/WorkflowSidebar.component";
import { RadixThemeProvider } from "./theme/ThemeProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeRequest, queryClient } from "./hooks/useRequest";

const PageHeader: FC<{
	title?: string;
}> = ({ title }) => {
	return (
		<Flex
			gap="1rem"
			align="center"
			justify="between"
			px="4"
			py="3"
			style={{
				boxShadow: "var(--shadow-1)",
				gridArea: "header",
			}}
		>
			{title && <Heading size="5">{title}</Heading>}
			<Avatar radius="full" fallback={<Spinner />} />
		</Flex>
	);
};

const AppBody: FC = () => {
	// const getWorkflowsRequest = useRequest("getWorkflows");
	const response = makeRequest.getWorkflows
		.fetch({
			count: 10,
			start: 0,
		})
		.then(console.log);
	return (
		<Grid
			columns={{ initial: "minmax(12rem, 0.25fr) 1fr 0.5fr" }}
			rows={{
				initial: "auto 1fr auto",
			}}
			areas={{
				initial:
					'"header header header" "sidebar content content"  "footer footer footer"',
			}}
			minHeight="100vh"
			maxHeight="100vh"
			width="100%"
		>
			<PageHeader title="Hello World" />
			<WorkflowSidebar workflows={[]} onNewWorkflowAdded={undefined} />
			<div
				style={{
					gridArea: "content",
				}}
			>
				Hello World
			</div>
		</Grid>
	);
};

const App = () => {
	return (
		<StrictMode>
			<RadixThemeProvider>
				<QueryClientProvider client={queryClient}>
					<Suspense fallback="loading">
						<AppBody />
					</Suspense>
				</QueryClientProvider>
			</RadixThemeProvider>
		</StrictMode>
	);
};

export default App;

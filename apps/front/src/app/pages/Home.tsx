import type { StoredWorkflowWithKey } from "@github-actions-stats/workflow-entity";
import { Avatar, Flex, Grid, Heading, Spinner } from "@radix-ui/themes";
import { Suspense, type FC } from "react";
import {
	useLoaderData,
	useLocation,
	useNavigate,
	useRoutes,
} from "react-router";
import { WorkflowSidebar } from "../components/WorkflowSidebar/WorkflowSidebar.component";
import { trpcReactClient } from "../hooks/useRequest";
import { RouterProvider } from "react-router-dom";
import { HomeRouter } from "./router";

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

export async function HomePageLoader(params: {
	start?: number;
	count?: number;
}) {
	const { start = 0, count = 10 } = params;
	const [workflows] = await Promise.all([
		trpcReactClient.getWorkflows.query({
			count,
			start,
		}),
	]);

	return {
		workflows,
	};
}
export const useHomePageData = useLoaderData<
	Awaited<ReturnType<typeof HomePageLoader>>
>;

export const HomePage: FC = () => {
	const { workflows } = useHomePageData();
	const location = useLocation();
	const history = useNavigate();
	const routes = useRoutes(HomeRouter);

	console.log(location);
	function onWorkflowSelected(workflowKey: string) {
		history({
			pathname: `/${encodeURIComponent(workflowKey)}`,
		});
	}

	if (workflows.hasFailed) {
		return <div>Failed to load data</div>;
	}

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
			<WorkflowSidebar
				workflows={workflows.data as unknown as StoredWorkflowWithKey[]}
				onNewWorkflowAdded={undefined}
				selectedWorkflow={undefined}
				onWorkflowSelected={onWorkflowSelected}
			/>
			<Suspense fallback="loading">{routes}</Suspense>
		</Grid>
	);
};

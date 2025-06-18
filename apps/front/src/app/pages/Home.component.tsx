import type { StoredWorkflowWithKey } from "@github-actions-stats/workflow-entity";
import { Avatar, Flex, Grid, Heading, Spinner } from "@radix-ui/themes";
import { Suspense, type FC } from "react";
import { useMatches, useNavigate, useParams, useRoutes } from "react-router";
import { WorkflowSidebar } from "../components/WorkflowSidebar/WorkflowSidebar.component";
import { useHomePageData, useRouteHomePageDataLoader } from "./Home.loader";
import { HomeRouter } from "./Home.router";
import { queryClient, queryClientUtils } from "../hooks/useRequest";

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

export const HomePage: FC = () => {
	const workflows = useRouteHomePageDataLoader();
	const history = useNavigate();
	const routes = useRoutes(HomeRouter);
	const routeParams = useParams<{ workflowKey: string }>();

	function onWorkflowSelected(workflowKey: string) {
		history({
			pathname: `/${encodeURIComponent(workflowKey)}`,
		});
	}
	function onNewWorkflowAdded(workflowData: StoredWorkflowWithKey) {
		const currentData = queryClientUtils.getWorkflows.getData({
			count: 10,
			start: 0,
		});

		queryClientUtils.getWorkflows.setData(
			{
				count: 10,
				start: 0,
			},
			!currentData || currentData.hasFailed
				? ({
						hasFailed: false,
						data: [workflowData],
					} as const)
				: ({
						hasFailed: false,
						data: [...(currentData.data ?? []), workflowData],
					} as const),
		);
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
				workflows={workflows}
				onNewWorkflowAdded={onNewWorkflowAdded}
				selectedWorkflow={
					routeParams.workflowKey
						? decodeURIComponent(routeParams.workflowKey)
						: undefined
				}
				onWorkflowSelected={onWorkflowSelected}
			/>
			<Suspense fallback="loading">{routes}</Suspense>
		</Grid>
	);
};

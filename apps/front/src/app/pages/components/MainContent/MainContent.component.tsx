import { aggregatePeriodSchema } from "@github-actions-stats/workflow-entity";
import { Button, Flex } from "@radix-ui/themes";
import type { FC } from "react";
import {
	useLocation,
	useMatches,
	useNavigate,
	useOutlet,
	useParams,
	type UIMatch,
} from "react-router";
import { SelectDateRange } from "../../../components/SelectDateRange/SelectDateRange.component";
import { TabNavigation } from "../../../components/TabNavigation/TabNavigation.component";
import { useRouteHomePageDataLoader } from "../../Home.loader";
import { getMainContentFormattedRoutes } from "./MainContent.router";
import { queryClientUtils, trpcReactClient } from "../../../hooks/useRequest";

export const NoWorkflows: FC = () => {
	return <div>No workflows</div>;
};

export const NoWorkflowSelected: FC = () => {
	return <div>No workflow selected</div>;
};

// const statsLoader = async ({ workflowKey, period, from }: {

function shouldShowDatePicker(params: {
	matches: UIMatch[];
}) {
	return params.matches.some((match) =>
		["workflow-overview"].includes(match.id),
	);
}

const MainContent: FC = () => {
	const { workflowKey } = useParams<{ workflowKey: string }>();
	const safeUrlWorkflowKey = encodeURIComponent(workflowKey ?? "");
	const outlet = useOutlet();
	const location = useLocation();
	const navigate = useNavigate();
	const matches = useMatches();

	const locationSearchParams = new URLSearchParams(location.search);
	const initialPeriod = aggregatePeriodSchema.safeParse(
		locationSearchParams.get("period"),
	);
	const isLoadingRefreshWorkflow =
		queryClientUtils.refreshWorkflowRunsData.isMutating() > 0;
	async function onRefreshWorkflowRunsClick() {
		console.log(
			"onRefreshWorkflowRunsClick",
			workflowKey,
			isLoadingRefreshWorkflow,
		);
		if (isLoadingRefreshWorkflow) return;
		if (!workflowKey) throw new Error("Workflow key is not defined");

		const response = await trpcReactClient.refreshWorkflowRunsData.mutate({
			workflowKey,
		});
		if (response.hasFailed) {
			throw new Error("Failed to refresh workflow runs");
		}
	}

	return (
		<Flex
			overflow="hidden"
			maxWidth="100%"
			py="3"
			px="4"
			style={{
				gridArea: "content",
			}}
			direction="column"
			gap="3"
			maxHeight="100%"
		>
			<Flex
				maxWidth="100%"
				maxHeight="100%"
				justify="between"
				align="center"
				flexBasis="auto"
				flexGrow="0"
				flexShrink="0"
				style={{
					backgroundColor: "var(--color-background-secondary)",
				}}
			>
				<TabNavigation
					onLinkClick={(link) => {
						if (!workflowKey) {
							return;
						}
						navigate(link.replace(":workflowKey", safeUrlWorkflowKey));
					}}
					activeLink={location.pathname.replace(
						safeUrlWorkflowKey,
						":workflowKey",
					)}
					links={getMainContentFormattedRoutes()}
				/>
				<Flex align="center" gap="2">
					{shouldShowDatePicker({
						matches,
					}) ? (
						<SelectDateRange
							initialPeriod={
								initialPeriod.success ? initialPeriod.data : "last_7_days"
							}
							onPeriodChange={({ period, from, to }) => {
								locationSearchParams.set("period", period);
								if (period === "custom") {
									locationSearchParams.set("from", from.toISOString());
									locationSearchParams.set("to", to.toISOString());
								} else {
									locationSearchParams.delete("from");
									locationSearchParams.delete("to");
								}
								navigate({
									...location,
									search: locationSearchParams.toString(),
								});
							}}
						/>
					) : null}
					{workflowKey ? (
						<Button
							loading={isLoadingRefreshWorkflow}
							onClick={onRefreshWorkflowRunsClick}
						>
							Refresh Workflow Runs
						</Button>
					) : null}
				</Flex>
			</Flex>
			{outlet}
		</Flex>
	);
};

export const MainContentPage: FC = () => {
	const { workflowKey } = useParams<{
		workflowKey: string;
	}>();
	const workflows = useRouteHomePageDataLoader();

	if (workflows.length === 0) {
		return <NoWorkflows />;
	}
	if (!workflowKey) {
		return <NoWorkflowSelected />;
	}

	return <MainContent />;
};

export default MainContentPage;

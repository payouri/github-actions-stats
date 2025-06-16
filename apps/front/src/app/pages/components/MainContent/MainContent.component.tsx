import { aggregatePeriodSchema } from "@github-actions-stats/workflow-entity";
import { Flex } from "@radix-ui/themes";
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

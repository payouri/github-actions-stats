import { type FC, use, useState } from "react";
import { useHomePageData, useRouteHomePageDataLoader } from "../../Home.loader";
import {
	useLocation,
	useNavigate,
	useParams,
	useResolvedPath,
	useRoutes,
	useOutlet,
	useRouteLoaderData,
	useMatches,
} from "react-router";
import {
	useMainContentDataLoader,
	useRouteMainContentDataLoader,
} from "./MainContent.loader";
import { Container, Flex, Select, TabNav, Tabs } from "@radix-ui/themes";
import {
	getMainContentFormattedRoutes,
	MainContentRouter,
} from "./MainContent.router";
import { SelectDateRange } from "../../../components/SelectDateRange/SelectDateRange.component";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { queryClientUtils } from "../../../hooks/useRequest";
import { HomeRouter } from "../../Home.router";
import { TabNavigation } from "../../../components/TabNavigation/TabNavigation.component";
import { aggregatePeriodSchema } from "@github-actions-stats/workflow-entity";

export const NoWorkflows: FC = () => {
	return <div>No workflows</div>;
};

export const NoWorkflowSelected: FC = () => {
	return <div>No workflow selected</div>;
};

// const statsLoader = async ({ workflowKey, period, from }: {

const MainContent: FC = () => {
	const { workflowKey } = useParams<{ workflowKey: string }>();
	const safeUrlWorkflowKey = encodeURIComponent(workflowKey ?? "");
	const outlet = useOutlet();
	const location = useLocation();
	const navigate = useNavigate();

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
						navigate({ ...location, search: locationSearchParams.toString() });
					}}
				/>
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

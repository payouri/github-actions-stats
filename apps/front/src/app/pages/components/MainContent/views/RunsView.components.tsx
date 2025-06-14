import type { StoredWorkflowRunWithKey } from "@github-actions-stats/workflow-entity";
import { Flex, Link, ScrollArea, Table } from "@radix-ui/themes";
import { Text } from "@radix-ui/themes";
import type {
	CellProps,
	ColumnHeaderCellProps,
} from "@radix-ui/themes/components/table";
import { Link1Icon } from "@radix-ui/react-icons";
import type { TextProps } from "@radix-ui/themes/components/text";
import dayjs from "dayjs";
import { useLayoutEffect, useRef, type FC } from "react";
import { useLoaderData, useLocation, useParams } from "react-router-dom";
import { ViewContainer, ViewInnerContainer } from "./ViewsCommon.components";
import type { runsViewLoader } from "./loaders/RunsView.loader";
import {
	queryClient,
	trpcReact,
	trpcReactClient,
} from "../../../../hooks/useRequest";

export const DEFAULT_RUNS_PER_PAGE = 10;
export const RUNS_PER_PAGE_OPTIONS = [DEFAULT_RUNS_PER_PAGE, 20, 50, 100];

const tableColumns = [
	{
		id: "runDate",
		label: "Run date",
		sortable: true,
		getData(workflowRun: StoredWorkflowRunWithKey) {
			return dayjs(workflowRun.startedAt).format("DD/MM/YYYY [at] HH:mm");
		},
		cellProps: {
			align: "left",
			maxWidth: "10rem",
			width: "10rem",
		} satisfies CellProps,
		getCellTextColor(
			workflowRun: StoredWorkflowRunWithKey,
		): TextProps["color"] {
			if (!this.getData(workflowRun)) {
				return "gray";
			}

			return undefined;
		},
	},
	{
		id: "runDuration",
		label: "Run duration",
		sortable: true,
		getData(workflowRun: StoredWorkflowRunWithKey) {
			return dayjs(workflowRun.completedAt)
				.diff(workflowRun.startedAt, "minutes", true)
				.toPrecision(2);
		},
		cellProps: { align: "right", width: "7rem" } satisfies CellProps,
		getCellTextColor(
			workflowRun: StoredWorkflowRunWithKey,
		): TextProps["color"] {
			if (!this.getData(workflowRun)) {
				return "gray";
			}

			return undefined;
		},
	},
	{
		id: "runStatus",
		label: "Run end status",
		sortable: true,
		getData(workflowRun: StoredWorkflowRunWithKey) {
			return workflowRun.status;
		},
		cellProps: { align: "right", width: "7rem" } satisfies CellProps,

		getCellTextColor(
			workflowRun: StoredWorkflowRunWithKey,
		): TextProps["color"] {
			if (!this.getData(workflowRun)) {
				return "gray";
			}

			return undefined;
		},
	},
	{
		id: "runConclusion",
		label: "Run conclusion",
		sortable: true,
		getData(workflowRun: StoredWorkflowRunWithKey) {
			return workflowRun.conclusion;
		},
		cellProps: { align: "right", width: "7rem" } satisfies CellProps,
		getCellTextColor(
			workflowRun: StoredWorkflowRunWithKey,
		): TextProps["color"] {
			if (!this.getData(workflowRun)) {
				return "gray";
			}

			return undefined;
		},
	},
	{
		id: "cumulativeDuration",
		label: "Cumulative (min)",
		sortable: true,
		getData(workflowRun: StoredWorkflowRunWithKey) {
			if (typeof workflowRun.usageData?.billable.totalMs !== "number")
				return "N/A";

			return (workflowRun.usageData?.billable.totalMs / 1000 / 60).toPrecision(
				3,
			);
		},
		cellProps: { align: "right", width: "6rem" } satisfies CellProps,
		getCellTextColor(
			workflowRun: StoredWorkflowRunWithKey,
		): TextProps["color"] {
			if (!this.getData(workflowRun)) {
				return "gray";
			}

			return undefined;
		},
	},
	{
		id: "ubuntu_latest_duration",
		label: "Ubuntu Latest (min)",
		sortable: true,
		getData(workflowRun: StoredWorkflowRunWithKey) {
			const data =
				workflowRun.usageData?.billable.durationPerLabel?.["ubuntu-latest"];

			if (typeof data !== "number") return "N/A";

			return (data / 1000 / 60).toPrecision(3);
		},
		cellProps: { align: "right", width: "8rem" } satisfies CellProps,
		getCellTextColor(
			workflowRun: StoredWorkflowRunWithKey,
		): TextProps["color"] {
			if (this.getData(workflowRun) === "N/A") {
				return "gray";
			}

			return undefined;
		},
	},
	{
		id: "8_cores_duration",
		label: "8 Cores (min)",
		sortable: true,
		getData(workflowRun: StoredWorkflowRunWithKey) {
			const data =
				workflowRun.usageData?.billable.durationPerLabel?.["8-cores"];

			if (typeof data !== "number") return "N/A";

			return (data / 1000 / 60).toPrecision(3);
		},
		cellProps: { align: "right", width: "6rem" } satisfies CellProps,
		getCellTextColor(
			workflowRun: StoredWorkflowRunWithKey,
		): TextProps["color"] {
			if (this.getData(workflowRun) === "N/A") {
				return "gray";
			}

			return undefined;
		},
	},
	{
		id: "16_cores_duration",
		label: "16 Cores (min)",
		sortable: true,
		getData(workflowRun: StoredWorkflowRunWithKey) {
			const data =
				workflowRun.usageData?.billable.durationPerLabel?.["16-cores"];
			if (typeof data !== "number") return "N/A";

			return (data / 1000 / 60).toPrecision(3);
		},
		cellProps: { align: "right", width: "6rem" } satisfies CellProps,
		headerCellProps: {
			align: "right",
			width: "6rem",
		} satisfies ColumnHeaderCellProps,
		getCellTextColor(
			workflowRun: StoredWorkflowRunWithKey,
		): TextProps["color"] {
			if (this.getData(workflowRun) === "N/A") {
				return "gray";
			}

			return undefined;
		},
	},
	{
		id: "actions",
		label: "",
		sortable: false,
		getData(workflowRun: StoredWorkflowRunWithKey) {
			return (
				<Link
					style={{
						lineHeight: "1",
					}}
					href={`https://github.com/${workflowRun.repositoryOwner}/${workflowRun.repositoryName}/actions/runs/${workflowRun.runId}`}
					target="_blank"
					rel="noopener noreferrer nofollow"
				>
					<Flex align="center" gap="1">
						<Link1Icon />
						<Text>Open</Text>
					</Flex>
				</Link>
			);
		},
		cellProps: {
			align: "center",
			width: "4rem",
			maxWidth: "4rem",
		} satisfies CellProps,
	},
] as const;

const RunTable: FC<{
	workflowRuns: StoredWorkflowRunWithKey[];
	onTableScroll?: (params: {
		scrollTop: number;
		scrollHeight: number;
		clientHeight: number;
	}) => void;
}> = ({ workflowRuns, onTableScroll }) => {
	const scrollRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		console.log(scrollRef.current);
		if (!scrollRef.current) return;
		const { current: scrollElement } = scrollRef;

		const onScroll = (_: Event) => {
			if (!onTableScroll) return;
			onTableScroll({
				scrollTop: scrollElement.scrollTop,
				scrollHeight: scrollElement.scrollHeight,
				clientHeight: scrollElement.clientHeight,
			});
		};
		scrollElement.addEventListener("scroll", onScroll);
		return () => {
			scrollElement.removeEventListener("scroll", onScroll);
		};
	}, [onTableScroll]);

	return (
		<>
			<Table.Root
				variant="surface"
				style={{
					width: "100%",
					flex: "0 0 auto",
					position: "relative",
					borderBottom: "0",
					borderBottomLeftRadius: "0",
					borderBottomRightRadius: "0",
				}}
			>
				<Table.Header
					style={{
						borderBottom: "0",
						borderBottomLeftRadius: "0",
						borderBottomRightRadius: "0",
					}}
				>
					<Table.Row>
						{tableColumns.map((column) => {
							return (
								<Table.ColumnHeaderCell
									{...column.cellProps}
									key={column.id}
									style={{
										borderTop: "0",
										borderTopLeftRadius: "0",
										borderTopRightRadius: "0",
									}}
								>
									{column.label}
								</Table.ColumnHeaderCell>
							);
						})}
					</Table.Row>
				</Table.Header>
			</Table.Root>

			<ScrollArea size="3" ref={scrollRef}>
				<Table.Root
					variant="surface"
					style={{
						width: "100%",
						flex: "1 0 auto",
						borderTop: "0",
						borderTopLeftRadius: "0",
						borderTopRightRadius: "0",
					}}
				>
					<Table.Body style={{ position: "relative", overflow: "auto" }}>
						{workflowRuns.map((workflowRun) => {
							return (
								<Table.Row key={workflowRun.runId}>
									{tableColumns.map((column) => {
										const data = column.getData(workflowRun);
										return (
											<Table.Cell {...column.cellProps} key={column.id}>
												{["string", "number", "boolean"].includes(
													typeof data,
												) ? (
													<Text
														color={
															"getCellTextColor" in column
																? column.getCellTextColor?.(workflowRun)
																: undefined
														}
													>
														{data}
													</Text>
												) : (
													data
												)}
											</Table.Cell>
										);
									})}
								</Table.Row>
							);
						})}
					</Table.Body>
				</Table.Root>
			</ScrollArea>
		</>
	);
};

export const RunsView: FC = () => {
	const { workflowKey } = useParams<{ workflowKey: string }>();
	if (!workflowKey) throw new Error("Workflow key is required");

	const runsViewLoadedData = useLoaderData<typeof runsViewLoader>();
	const query = trpcReact.getWorkflowRuns.useInfiniteQuery(
		{
			workflowKey,
			count: 20,
		},
		{
			getNextPageParam: (lastPage) => {
				if (!lastPage.hasFailed) {
					return lastPage.data.nextCursor;
				}
				return null;
			},
		},
	);

	function onTableScroll(params: {
		scrollTop: number;
		scrollHeight: number;
		clientHeight: number;
	}) {
		const { scrollTop, scrollHeight, clientHeight } = params;
		const scrollPercent = scrollTop / (scrollHeight - clientHeight);
		if (scrollPercent > 0.8 && query.hasNextPage) {
			query.fetchNextPage();
		}
	}
	console.log(runsViewLoadedData);

	return (
		<ViewContainer>
			<ViewInnerContainer direction="column" gap="0">
				<RunTable
					workflowRuns={runsViewLoadedData.workflowRuns}
					onTableScroll={onTableScroll}
				/>
			</ViewInnerContainer>
		</ViewContainer>
	);
};

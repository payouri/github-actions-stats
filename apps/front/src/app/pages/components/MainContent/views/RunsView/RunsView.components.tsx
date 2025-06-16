import type { StoredWorkflowRunWithKey } from "@github-actions-stats/workflow-entity";
import {
	GitHubLogoIcon,
	MinusCircledIcon,
	PlusCircledIcon,
	ReloadIcon,
} from "@radix-ui/react-icons";
import {
	Box,
	Flex,
	IconButton,
	Link,
	Progress,
	ScrollArea,
	Table,
	Text,
} from "@radix-ui/themes";
import type {
	CellProps,
	ColumnHeaderCellProps,
} from "@radix-ui/themes/components/table";
import type { TextProps } from "@radix-ui/themes/components/text";
import dayjs from "dayjs";
import { useLayoutEffect, useRef, useState, type FC } from "react";
import { useParams } from "react-router-dom";
import {
	queryClient,
	queryClientUtils,
	trpcReact,
	trpcReactClient,
} from "../../../../../hooks/useRequest";
import { ViewContainer, ViewInnerContainer } from "../ViewsCommon.components";

export const DEFAULT_RUNS_PER_PAGE = 10;
export const RUNS_PER_PAGE_OPTIONS = [DEFAULT_RUNS_PER_PAGE, 20, 50, 100];

const tableColumns = [
	{
		id: "plus",
		label: "",
		sortable: false,
		getData(
			data: StoredWorkflowRunWithKey,
			api: {
				isRowOpen: boolean;
				handleAction: (params: {
					action: string;
					data: StoredWorkflowRunWithKey;
				}) => Promise<unknown> | unknown;
			},
		) {
			return (
				<Flex gap="1" align="center" justify="center">
					<IconButton
						size="1"
						onClick={() => {
							if (api.isRowOpen) {
								api.handleAction({ action: "show_less", data: data });
								return;
							}
							api.handleAction({ action: "show_more", data: data });
						}}
					>
						{api.isRowOpen ? <MinusCircledIcon /> : <PlusCircledIcon />}
					</IconButton>
				</Flex>
			);
		},
		cellProps: {
			align: "center",
			width: "2rem",
			maxWidth: "2rem",
		} as const,
	},
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
		getData(
			workflowRun: StoredWorkflowRunWithKey,
			api: {
				loadingReloads: Set<number>;
				handleAction: (params: {
					action: string;
					data: StoredWorkflowRunWithKey;
				}) => Promise<void> | void;
			},
		) {
			const isLoading = api.loadingReloads.has(workflowRun.runId);
			return (
				<Flex gap="1" align="center" justify="center">
					<Link
						style={{
							lineHeight: "1",
							display: "block",
						}}
						href={`https://github.com/${workflowRun.repositoryOwner}/${workflowRun.repositoryName}/actions/runs/${workflowRun.runId}`}
						target="_blank"
						rel="noopener noreferrer nofollow"
					>
						<Flex align="center" gap="1" justify="center">
							<GitHubLogoIcon />
						</Flex>
					</Link>
					<IconButton
						variant="ghost"
						loading={isLoading}
						size="1"
						onClick={() => {
							api.handleAction({ action: "reload_data", data: workflowRun });
						}}
					>
						<ReloadIcon />
					</IconButton>
				</Flex>
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
	isLoadingPage?: boolean;
	onTableScroll?: (params: {
		scrollTop: number;
		scrollHeight: number;
		clientHeight: number;
	}) => void;
}> = ({ isLoadingPage, workflowRuns, onTableScroll }) => {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [loadingReloads, setLoadingReloads] = useState<Set<number>>(new Set());
	const [openedRuns, setOpenedRuns] = useState<Set<number>>(new Set());

	useLayoutEffect(() => {
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
	async function handleAction(params: {
		action: string;
		data: StoredWorkflowRunWithKey;
	}) {
		// console.log("handleAction", params);
		switch (params.action) {
			case "show_more": {
				return setOpenedRuns((prev) => {
					const newSet = new Set(prev);
					newSet.add(params.data.runId);
					return newSet;
				});
			}
			case "show_less": {
				return setOpenedRuns((prev) => {
					const newSet = new Set(prev);
					newSet.delete(params.data.runId);
					return newSet;
				});
			}
			case "reload_data": {
				setLoadingReloads((prev) => {
					const newSet = new Set(prev);
					newSet.add(params.data.runId);
					return newSet;
				});
				await trpcReactClient.refreshRunsData.mutate({
					runKeys: [params.data.key],
				});
				setLoadingReloads((prev) => {
					const newSet = new Set(prev);
					newSet.delete(params.data.runId);
					return newSet;
				});
				return;
			}
			default: {
				throw new Error("Invalid action");
			}
		}
	}

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
			<Box width="100%">
				<Progress
					duration={isLoadingPage ? "2s" : "0s"}
					radius="none"
					style={{
						width: "100%",
						minWidth: "100%",
						opacity: isLoadingPage ? 1 : 0,
					}}
				/>
			</Box>
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
								<>
									<Table.Row key={workflowRun.runId}>
										{tableColumns.map((column) => {
											const data = column.getData(workflowRun, {
												loadingReloads,
												isRowOpen: openedRuns.has(workflowRun.runId),
												handleAction: handleAction,
											});
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
									{openedRuns.has(workflowRun.runId) ? (
										<Table.Row key={`${workflowRun.runId}-opened`}>
											<Table.Cell colSpan={tableColumns.length}>
												<Box
													style={{
														border: "1px solid var(--gray-4)",
														borderRadius: "var(--radix-radii-lg)",
														padding: "1rem",
													}}
												>
													<Text>More...</Text>
												</Box>
											</Table.Cell>
										</Table.Row>
									) : null}
								</>
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
		if (scrollPercent > 0.9 && query.hasNextPage && !query.isFetching) {
			query.fetchNextPage();
		}
	}

	const workflowRuns =
		query.data?.pages
			.flatMap((p) => {
				if (p.hasFailed) {
					throw new Error("Failed to load workflow runs");
				}

				return p.data;
			})
			.flatMap((d) => d.runs) ?? [];

	return (
		<ViewContainer>
			<ViewInnerContainer direction="column" gap="0">
				<RunTable
					workflowRuns={workflowRuns}
					onTableScroll={onTableScroll}
					isLoadingPage={query.isFetching || query.isFetchingNextPage}
				/>
			</ViewInnerContainer>
		</ViewContainer>
	);
};

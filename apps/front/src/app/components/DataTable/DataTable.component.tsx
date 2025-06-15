import {
	Button,
	ChevronDownIcon,
	Flex,
	IconButton,
	Table,
	Text,
} from "@radix-ui/themes";
import type { CellProps } from "@radix-ui/themes/components/table";
import { MinusIcon } from "@radix-ui/react-icons";
import { Collapsible } from "radix-ui";
import {
	useId,
	useRef,
	useState,
	type MouseEvent,
	type ReactNode,
} from "react";
import type { ColumnDefinition } from "./DataTable.types";

export const DataTable = <Data extends Record<string, unknown>>(props: {
	data: Data[];
	columns: ColumnDefinition<Data>[];
	getRowKey?: (data: Data) => string;
	initialRowsCount?: number;
}): ReactNode => {
	const { data, columns, getRowKey, initialRowsCount = 5 } = props;
	const [displayRowsCount, setDisplayRowsCount] = useState(initialRowsCount);
	const tableId = useId();
	const [isOpen, setIsOpen] = useState(true);
	const tableRef = useRef<HTMLDivElement>(null);
	const lastRowRef = useRef<HTMLTableRowElement>(null);

	function onShowMoreClick(event: MouseEvent<HTMLButtonElement>) {
		event.stopPropagation();
		const newRowsCount =
			displayRowsCount + initialRowsCount > data.length
				? data.length
				: displayRowsCount + initialRowsCount;
		setDisplayRowsCount(newRowsCount);

		if (event.target instanceof HTMLButtonElement) {
			event.target.blur(); // TODO: fix this
			setTimeout(() => {
				if (event.target instanceof HTMLButtonElement) {
					event.target.scrollIntoView({
						block: "end",
						behavior: "smooth",
					});
				}
			}, 100);
		}
	}

	return (
		<Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
			{!isOpen ? (
				<Collapsible.Trigger asChild>
					<Table.Root
						key={tableId}
						style={{ width: "100%", position: "relative" }}
						layout="fixed"
						variant="surface"
						ref={tableRef}
					>
						<Table.Header style={{ position: "sticky", top: "0" }}>
							<Table.Row>
								{columns.map(
									({ label, cellProps, headerCellProps, key }, index) => {
										return (
											<Table.ColumnHeaderCell
												width={headerCellProps?.width || cellProps?.width}
												maxWidth={
													headerCellProps?.maxWidth || cellProps?.maxWidth
												}
												key={`column-${key.toString()}`}
												style={{
													whiteSpace: "nowrap",
													overflow: "hidden",
													textOverflow: "ellipsis",
												}}
												align={headerCellProps?.align || cellProps?.align}
											>
												<Flex gap="2" display="inline-flex" align="center">
													{label}
													{index === columns.length - 1 ? (
														<IconButton size="1">
															<ChevronDownIcon />
														</IconButton>
													) : null}
												</Flex>
											</Table.ColumnHeaderCell>
										);
									},
								)}
							</Table.Row>
						</Table.Header>
					</Table.Root>
				</Collapsible.Trigger>
			) : null}
			<Collapsible.Content>
				<Table.Root
					key={tableId}
					style={{ width: "100%" /* position: "relative" */ }}
					layout="fixed"
					variant="surface"
				>
					<Table.Header>
						<Table.Row style={{ position: "sticky", top: "0px" }}>
							{columns.map(
								({ label, cellProps, headerCellProps, key }, index) => {
									return (
										<Table.ColumnHeaderCell
											width={headerCellProps?.width || cellProps?.width}
											maxWidth={
												headerCellProps?.maxWidth || cellProps?.maxWidth
											}
											key={`column-${key.toString()}`}
											style={{
												whiteSpace: "nowrap",
												overflow: "hidden",
												textOverflow: "ellipsis",
											}}
											align={headerCellProps?.align || cellProps?.align}
										>
											<Flex gap="2" display="inline-flex" align="center">
												{label}
												{index === columns.length - 1 ? (
													<Collapsible.Trigger asChild>
														<IconButton size="1">
															<MinusIcon />
														</IconButton>
													</Collapsible.Trigger>
												) : null}
											</Flex>
										</Table.ColumnHeaderCell>
									);
								},
							)}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{!data.length ? (
							<Table.Row>
								<Table.Cell
									colSpan={columns.length}
									style={{
										whiteSpace: "nowrap",
										overflow: "hidden",
										textOverflow: "ellipsis",
									}}
								>
									<Flex width="100%" align="center" justify="center" p="5">
										No data
									</Flex>
								</Table.Cell>
							</Table.Row>
						) : (
							data.slice(0, displayRowsCount).map((v, index) => {
								const rowKey = getRowKey?.(v) ?? String(index);
								return (
									<Table.Row
										key={rowKey}
										ref={index === data.length - 1 ? lastRowRef : undefined}
									>
										{columns.map(({ key, getCellData, cellProps }) => {
											const columnKey = `${rowKey}-${key.toString()}`;
											return (
												<Table.Cell
													width={cellProps?.width}
													maxWidth={cellProps?.maxWidth || cellProps?.width}
													key={columnKey}
													style={{
														whiteSpace: "nowrap",
														overflow: "hidden",
														textOverflow: "ellipsis",
													}}
													align={cellProps?.align}
												>
													<Text
														style={{
															maxWidth: (cellProps?.maxWidth ||
																"100%") as string,
															whiteSpace: "nowrap",
															overflow: "hidden",
															textOverflow: "ellipsis",
														}}
													>
														{getCellData(v)}
													</Text>
												</Table.Cell>
											);
										})}
									</Table.Row>
								);
							})
						)}
						{data.length && displayRowsCount < data.length ? (
							<Table.Row>
								<Table.Cell
									style={{ height: "auto" }}
									colSpan={columns.length}
									p="0"
								>
									<Button
										key="show-more"
										onClick={onShowMoreClick}
										radius="none"
										size="2"
										style={{
											width: "100%",
										}}
									>
										Show More
									</Button>
								</Table.Cell>
							</Table.Row>
						) : null}
					</Table.Body>
				</Table.Root>
			</Collapsible.Content>
		</Collapsible.Root>
	);
};

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

export const DataTable = <Data extends Record<string, unknown>>(props: {
	data: Data[];
	columns: {
		key: keyof Data | (string & {});
		label: string;
		getValue: (data: Data) => string | number | ReactNode | null | undefined;
		align?: "left" | "center" | "right";
		alignHeader?: "left" | "center" | "right";
		colWidth?: CellProps["width"];
	}[];
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
			event.target.blur();
			console.log({
				lastRowRef: lastRowRef.current,
				tableRef: tableRef.current,
			});
			setTimeout(() => {
				console.log("scroll");
				console.log({
					lastRowRef: lastRowRef.current,
					tableRef: tableRef.current,
				});
				lastRowRef.current?.scrollIntoView({
					block: "end",
					behavior: "smooth",
				});
				tableRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
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
									({ key, label, colWidth, alignHeader, align }, index) => (
										<Table.ColumnHeaderCell
											width={colWidth}
											maxWidth={colWidth}
											key={`column-${key.toString()}`}
											style={{
												whiteSpace: "nowrap",
												overflow: "hidden",
												textOverflow: "ellipsis",
											}}
											align={alignHeader || align}
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
									),
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
								({ key, label, colWidth, alignHeader, align }, index) => (
									<Table.ColumnHeaderCell
										width={colWidth}
										maxWidth={colWidth}
										key={`column-${key.toString()}`}
										style={{
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}
										align={alignHeader || align}
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
								),
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
										{columns.map(({ key, colWidth, getValue, align }) => {
											const columnKey = `${rowKey}-${key.toString()}`;
											return (
												<Table.Cell
													width={colWidth}
													maxWidth={colWidth}
													key={columnKey}
													style={{
														whiteSpace: "nowrap",
														overflow: "hidden",
														textOverflow: "ellipsis",
													}}
													align={align}
												>
													<Text
														style={{
															maxWidth: colWidth as string,
															whiteSpace: "nowrap",
															overflow: "hidden",
															textOverflow: "ellipsis",
														}}
													>
														{getValue(v)}
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

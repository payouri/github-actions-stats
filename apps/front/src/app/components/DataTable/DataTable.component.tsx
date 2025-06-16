import { Table } from "@radix-ui/themes";
import { Collapsible } from "radix-ui";
import {
	useId,
	useRef,
	useState,
	type MouseEvent,
	type ReactNode,
} from "react";
import type { ColumnDefinition } from "./DataTable.types";
import { DataTableFooter } from "./components/DataTableFooter.component";
import { DataTableHeader } from "./components/DataTableHeader.component";
import { DataTableNoData } from "./components/DataTableNoData.component";
import { DataTableRow } from "./components/DataTableRow.component";

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
	const footerRef = useRef<HTMLTableSectionElement>(null);

	function onShowMoreClick(event: MouseEvent<HTMLButtonElement>) {
		event.stopPropagation();
		const newRowsCount =
			displayRowsCount + initialRowsCount > data.length
				? data.length
				: displayRowsCount + initialRowsCount;
		setDisplayRowsCount(newRowsCount);

		setTimeout(() => {
			if (footerRef.current instanceof HTMLElement) {
				footerRef.current.scrollIntoView({
					block: "end",
					behavior: "smooth",
				});
			}
		}, 0);
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
						<DataTableHeader columns={columns} isOpen={isOpen} />
					</Table.Root>
				</Collapsible.Trigger>
			) : null}
			<Collapsible.Content>
				<Table.Root
					key={tableId}
					style={{ width: "100%" }}
					layout="fixed"
					variant="surface"
				>
					<DataTableHeader columns={columns} isOpen={isOpen} />
					<Table.Body>
						{!data.length ? (
							<DataTableNoData
								columnsCount={columns.length}
								key={`${tableId}-no-data`}
							/>
						) : (
							data.slice(0, displayRowsCount).map((v, index) => {
								const rowKey = getRowKey?.(v) ?? String(index);
								return (
									<DataTableRow
										key={rowKey}
										rowKey={rowKey}
										columns={columns}
										data={v}
									/>
								);
							})
						)}
					</Table.Body>
					<DataTableFooter
						ref={footerRef}
						columnsCount={columns.length}
						onShowMoreClick={onShowMoreClick}
						rowsCount={data.length}
						displayRowsCount={displayRowsCount}
					/>
				</Table.Root>
			</Collapsible.Content>
		</Collapsible.Root>
	);
};

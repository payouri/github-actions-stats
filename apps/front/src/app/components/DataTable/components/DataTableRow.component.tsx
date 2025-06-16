import { Table, Text } from "@radix-ui/themes";
import type { ColumnDefinition, DefaultData } from "../DataTable.types";

export type DataTableRowProps<Data extends DefaultData> = {
	rowKey: string;
	columns: ColumnDefinition<Data>[];
	data: Data;
};

export function DataTableRow<Data extends DefaultData>(
	props: DataTableRowProps<Data>,
) {
	const { rowKey, columns, data } = props;

	return (
		<Table.Row key={rowKey}>
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
								maxWidth: (cellProps?.maxWidth || "100%") as string,
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
							}}
						>
							{getCellData(data)}
						</Text>
					</Table.Cell>
				);
			})}
		</Table.Row>
	);
}

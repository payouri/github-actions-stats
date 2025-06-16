import { Flex, Table } from "@radix-ui/themes";
import type { ReactNode } from "react";

export type DataTableNoDataProps = {
	columnsCount: number;
	noDataComponent?: ReactNode;
};

export function DataTableNoData(props: DataTableNoDataProps) {
	const { columnsCount, noDataComponent = "No data" } = props;

	return (
		<Table.Row>
			<Table.Cell
				colSpan={columnsCount}
				style={{
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
				}}
			>
				<Flex width="100%" align="center" justify="center" p="5">
					{noDataComponent}
				</Flex>
			</Table.Cell>
		</Table.Row>
	);
}

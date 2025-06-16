import { ChevronDownIcon, Flex, IconButton, Table } from "@radix-ui/themes";
import type { ColumnDefinition, DefaultData } from "../DataTable.types";
import { MinusIcon } from "@radix-ui/react-icons";

export type DataTableHeaderProps<Data extends DefaultData> = {
	columns: ColumnDefinition<Data>[];
	isOpen?: boolean;
};

export function DataTableHeader<Data extends DefaultData>(
	props: DataTableHeaderProps<Data>,
) {
	const { columns, isOpen } = props;

	return (
		<Table.Header style={{ position: "sticky", top: "0" }}>
			<Table.Row>
				{columns.map(({ label, cellProps, headerCellProps, key }, index) => {
					return (
						<Table.ColumnHeaderCell
							width={headerCellProps?.width || cellProps?.width}
							maxWidth={headerCellProps?.maxWidth || cellProps?.maxWidth}
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
								{typeof isOpen === "boolean" && index === columns.length - 1 ? (
									<IconButton size="1">
										{isOpen ? <MinusIcon /> : <ChevronDownIcon />}
									</IconButton>
								) : null}
							</Flex>
						</Table.ColumnHeaderCell>
					);
				})}
			</Table.Row>
		</Table.Header>
	);
}

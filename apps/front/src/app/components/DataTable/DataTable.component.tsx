import { Button, Flex, Table, Text } from "@radix-ui/themes";
import type { CellProps } from "@radix-ui/themes/components/table";
import type { ReactNode } from "react";

export const DataTable = <Data extends Record<string, unknown>>(props: {
	data: Data[];
	columns: {
		key: keyof Data | (string & {});
		label: string;
		getValue: (data: Data) => string | number | ReactNode | null | undefined;
		colWidth?: CellProps["width"];
	}[];
	getRowKey?: (data: Data) => string;
	initialRowsCount?: number;
}): ReactNode => {
	const { data, columns, getRowKey, initialRowsCount = 5 } = props;
	return (
		<Table.Root style={{ width: "100%" }} layout="fixed" variant="surface">
			<Table.Header>
				<Table.Row>
					{columns.map(({ key, label, colWidth }) => (
						<Table.ColumnHeaderCell
							width={colWidth}
							maxWidth={colWidth}
							key={`column-${key.toString()}`}
							style={{
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
							}}
						>
							{label}
						</Table.ColumnHeaderCell>
					))}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{!data.length ? (
					<Flex width="100%" align="center" justify="center" p="5">
						No data
					</Flex>
				) : (
					data.map((v, index) => {
						const rowKey = getRowKey?.(v) ?? String(index);
						return (
							<Table.Row key={getRowKey?.(v) ?? String(index)}>
								{columns.map(({ key, colWidth, getValue }) => {
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
				<Table.Row>
					<Table.Cell style={{ height: "auto" }} colSpan={columns.length} p="0">
						<Button
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
			</Table.Body>
		</Table.Root>
	);
};

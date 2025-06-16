import type {
	CellProps,
	ColumnHeaderCellProps,
} from "@radix-ui/themes/components/table";
import type { ReactNode } from "react";

export type DefaultData = Record<string, unknown>;

export type ColumnDefinition<Data extends DefaultData> = {
	getCellData: (data: Data) => ReactNode;
	key: string | number;
	label: string | undefined;
	cellProps?: CellProps;
	headerCellProps?: ColumnHeaderCellProps;
};

export type DataTableProps<Data extends DefaultData> = {
	data: Data[];
	columns: ColumnDefinition<Data>[];
	getRowKey?: (data: Data) => string;
	initialRowsCount?: number;
};

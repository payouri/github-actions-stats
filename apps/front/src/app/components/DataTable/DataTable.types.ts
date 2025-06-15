import type {
	CellProps,
	ColumnHeaderCellProps,
} from "@radix-ui/themes/components/table";
import type { ReactNode } from "react";

export type ColumnDefinition<Data extends Record<string, unknown>> = {
	getCellData: (data: Data) => ReactNode;
	key: string | number;
	label: string | undefined;
	cellProps?: CellProps;
	headerCellProps?: ColumnHeaderCellProps;
};

import { Table } from "@radix-ui/themes";
import { DataTableShowMoreRow } from "./DataTableShowMoreRow.component";
import { forwardRef, type MouseEvent, type Ref } from "react";

export type DataTableFooterProps = {
	columnsCount: number;
	rowsCount: number;
	onShowMoreClick: (event: MouseEvent<HTMLButtonElement>) => void;
	displayRowsCount: number;
};

function DataTableFooterComponent(
	props: DataTableFooterProps,
	ref: Ref<HTMLTableSectionElement>,
) {
	const { columnsCount, rowsCount, onShowMoreClick, displayRowsCount } = props;

	return (
		<tfoot ref={ref}>
			{rowsCount && displayRowsCount < rowsCount ? (
				<DataTableShowMoreRow
					onShowMoreClick={onShowMoreClick}
					columnsCount={columnsCount}
				/>
			) : null}
		</tfoot>
	);
}

export const DataTableFooter = forwardRef(DataTableFooterComponent);

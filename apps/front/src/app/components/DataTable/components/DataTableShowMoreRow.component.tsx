import { Table, Button } from "@radix-ui/themes";
import type { MouseEvent } from "react";

export type DataTableShowMoreRowProps = {
	onShowMoreClick: (event: MouseEvent<HTMLButtonElement>) => void;
	columnsCount: number;
	showMoreButtonText?: string;
};

export function DataTableShowMoreRow(props: DataTableShowMoreRowProps) {
	const {
		columnsCount,
		onShowMoreClick,
		showMoreButtonText = "Show More",
	} = props;

	return (
		<Table.Row>
			<Table.Cell style={{ height: "auto" }} colSpan={columnsCount} p="0">
				<Button
					key="show-more"
					onClick={onShowMoreClick}
					radius="none"
					size="2"
					style={{
						width: "100%",
					}}
				>
					{showMoreButtonText}
				</Button>
			</Table.Cell>
		</Table.Row>
	);
}

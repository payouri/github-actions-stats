import type { FC } from "react";

export const NumberBox: FC<{
	value: number;
	label: string;
}> = ({ value, label }) => {
	return (
		<div>
			<div>{label}</div>
			<div>{value}</div>
		</div>
	);
};

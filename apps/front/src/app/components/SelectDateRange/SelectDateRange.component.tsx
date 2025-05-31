import { Select } from "@radix-ui/themes";
import dayjs, { type Dayjs } from "dayjs";
import type { FC } from "react";

const DatePeriods = {
	LAST_7_DAYS: "last_7_days",
	LAST_30_DAYS: "last_30_days",
	LAST_90_DAYS: "last_90_days",
	CUSTOM: "custom",
	WEEK: "week",
	MONTH: "month",
	YEAR: "year",
	DAY: "day",
} as const;

type DatePeriod = (typeof DatePeriods)[keyof typeof DatePeriods];
type DateRange = {
	from: Dayjs;
	to: Dayjs;
};

const DateRangeMap: Record<
	DatePeriod,
	{
		from: () => Dayjs;
		to: () => Dayjs;
	}
> = {
	[DatePeriods.LAST_7_DAYS]: {
		from: () => dayjs().subtract(7, "day"),
		to: () => dayjs(),
	},
	[DatePeriods.LAST_30_DAYS]: {
		from: () => dayjs().subtract(30, "day"),
		to: () => dayjs(),
	},
	[DatePeriods.LAST_90_DAYS]: {
		from: () => dayjs().subtract(90, "day"),
		to: () => dayjs(),
	},
	[DatePeriods.CUSTOM]: {
		from: () => dayjs(),
		to: () => dayjs(),
	},
	[DatePeriods.WEEK]: {
		from: () => dayjs().startOf("week"),
		to: () => dayjs().endOf("week"),
	},
	[DatePeriods.MONTH]: {
		from: () => dayjs().startOf("month"),
		to: () => dayjs().endOf("month"),
	},
	[DatePeriods.YEAR]: {
		from: () => dayjs().startOf("year"),
		to: () => dayjs().endOf("year"),
	},
	[DatePeriods.DAY]: {
		from: () => dayjs().startOf("day"),
		to: () => dayjs().endOf("day"),
	},
};

export interface SelectDateRangeProps {
	initialPeriod?: DatePeriod;
	onPeriodChange?: (period: DateRange & { period: DatePeriod }) => void;
}

function upperCaseFirstLetter(str: string) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
function removeUnderscore(str: string) {
	return str.replaceAll("_", " ");
}

export const SelectDateRange: FC<SelectDateRangeProps> = ({
	initialPeriod = DatePeriods.LAST_7_DAYS,
	onPeriodChange,
}) => {
	const options = Object.values(DatePeriods);

	const handlePeriodChange = (period: DatePeriod) => {
		if (!onPeriodChange) {
			return;
		}

		const { from, to } = DateRangeMap[period];

		onPeriodChange({
			from: from(),
			to: to(),
			period,
		});
	};

	return (
		<Select.Root
			defaultValue={initialPeriod}
			onValueChange={handlePeriodChange}
		>
			<Select.Trigger />
			<Select.Content>
				{options.map((option) => (
					<Select.Item value={option} key={option}>
						{upperCaseFirstLetter(
							removeUnderscore(option).split("_").join(" "),
						)}
					</Select.Item>
				))}
			</Select.Content>
		</Select.Root>
	);
};

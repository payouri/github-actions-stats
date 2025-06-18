import { Grid } from "@radix-ui/themes";
import type { FC } from "react";
import { DataTable } from "../../../../components/DataTable/DataTable.component";
import { NumberBox } from "../../../../components/NumberBox/NumberBox.component";
import {
	isLoadingStatsData,
	useRouteStatsDataLoader,
} from "../MainContent.loader";
import { ViewContainer, ViewInnerContainer } from "./ViewsCommon.components";
import { aggregatePeriodSchema } from "@github-actions-stats/workflow-entity";
import dayjs from "dayjs";
import { DEFAULT_DATE_PERIOD } from "../../../../components/SelectDateRange/SelectDateRange.component";
import { useParams } from "react-router";

const StatsBoxes: FC<{
	loading: boolean;
	boxes: {
		label: string;
		value: number | "loading";
	}[];
}> = ({ loading, boxes }) => {
	if (loading) {
		return <div>Loading...</div>;
	}

	return (
		<Grid
			columns={{
				initial: "2",
				sm: String(boxes.length),
			}}
			rows={{
				initial: "auto",
				md: "1",
				lg: "1",
				xl: "1",
			}}
			gap={{
				initial: "3",
			}}
			maxWidth="100%"
			justify="between"
			flexBasis="100%"
			px={{
				md: "6rem",
				lg: "12rem",
				xl: "20rem",
			}}
		>
			{boxes.map(({ label, value }) => (
				<NumberBox key={label} label={label} value={value} />
			))}
		</Grid>
	);
};

export const OverviewView: FC = () => {
	const data = useRouteStatsDataLoader();
	const { workflowKey } = useParams<{ workflowKey: string }>();
	const searchParams = new URLSearchParams(window.location.search);
	const period = aggregatePeriodSchema.safeParse(searchParams.get("period"));
	const from = dayjs(searchParams.get("from"));
	const isLoading = isLoadingStatsData({
		from: from.isValid()
			? from.endOf("hour").toDate()
			: dayjs().endOf("hour").toDate(),
		period: period.success ? period.data : DEFAULT_DATE_PERIOD,
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		workflowKey: workflowKey!,
	});

	const values = data.reduce<{
		totalRuns: number;
		failuresCount: number;
		totalTimeRunning: number;
		longestRun: number;
		mostRanJobs: Map<string, number>;
		mostTimeUsedJobs: Map<string, number>;
		mostRanSteps: Map<string, number>;
		mostTimeUsedSteps: Map<string, number>;
	}>(
		(acc, val) => {
			acc.totalRuns += val.runsCount;
			acc.failuresCount += val.statusCount.failure ?? 0;
			acc.totalTimeRunning += val.runsDurationMs;
			acc.longestRun = Math.max(
				acc.longestRun,
				val.maxRunDurationMs / 60 / 1000,
			);
			for (const [jobName, jobValue] of Object.entries(
				val.totalDurationMsByJobName,
			)) {
				if (!acc.mostTimeUsedJobs.has(jobName)) {
					acc.mostTimeUsedJobs.set(jobName, jobValue);
				} else {
					acc.mostTimeUsedJobs.set(
						jobName,
						(acc.mostTimeUsedJobs.get(jobName) ?? 0) + jobValue,
					);
				}
				if (!acc.mostRanJobs.has(jobName)) {
					acc.mostRanJobs.set(jobName, 1);
				} else {
					acc.mostRanJobs.set(jobName, (acc.mostRanJobs.get(jobName) ?? 0) + 1);
				}
			}
			for (const [stepName, stepValue] of Object.entries(
				val.totalDurationMsByStepsName,
			)) {
				if (!acc.mostTimeUsedSteps.has(stepName)) {
					acc.mostTimeUsedSteps.set(stepName, stepValue);
				} else {
					acc.mostTimeUsedSteps.set(
						stepName,
						(acc.mostTimeUsedSteps.get(stepName) ?? 0) + stepValue,
					);
				}
				if (!acc.mostRanSteps.has(stepName)) {
					acc.mostRanSteps.set(stepName, 1);
				} else {
					acc.mostRanSteps.set(
						stepName,
						(acc.mostRanSteps.get(stepName) ?? 0) + 1,
					);
				}
			}

			return acc;
		},
		{
			totalRuns: 0,
			failuresCount: 0,
			totalTimeRunning: 0,
			longestRun: 0,
			mostRanJobs: new Map<string, number>(),
			mostTimeUsedJobs: new Map<string, number>(),
			mostRanSteps: new Map<string, number>(),
			mostTimeUsedSteps: new Map<string, number>(),
		},
	);

	return (
		<ViewContainer>
			<ViewInnerContainer direction="column" gap="4">
				<StatsBoxes
					boxes={[
						{
							label: "Workflow runs",
							value: isLoading ? "loading" : values.totalRuns,
						},
						{
							label: "Failures",
							value: isLoading ? "loading" : values.failuresCount,
						},
						{
							label: "Total time running (minutes)",
							value: isLoading
								? "loading"
								: Math.floor(values.totalTimeRunning / 1000 / 60),
						},
						{
							label: "Longest run",
							value: isLoading ? "loading" : values.longestRun,
						},
					]}
					loading={!data}
				/>
				<DataTable
					data={Array.from(values.mostRanJobs.entries())
						.sort(([, a], [, b]) => b - a)
						.map(([label, value]) => ({
							label,
							value,
						}))}
					columns={[
						{
							key: "label",
							label: "Most Ran Jobs",
							getCellData({ label }) {
								return label;
							},
							cellProps: { width: "calc(100% - 8rem)" },
						},
						{
							key: "value",
							label: "Count",
							getCellData({ value }) {
								return value;
							},
							cellProps: { width: "8rem", align: "right" },
						},
					]}
					getRowKey={({ label }) => label}
				/>
				<DataTable
					data={Array.from(values.mostRanSteps.entries())
						.sort(([, a], [, b]) => b - a)
						.map(([label, value]) => ({
							label,
							value,
						}))}
					columns={[
						{
							key: "label",
							label: "Most Ran Steps",
							getCellData({ label }) {
								return label;
							},
							cellProps: { width: "calc(100% - 8rem)" },
						},
						{
							key: "count",
							label: "Count",
							getCellData({ value }) {
								return value;
							},
							cellProps: { width: "8rem", align: "right" },
						},
					]}
					getRowKey={({ label }) => label}
				/>
				<DataTable
					data={Array.from(values.mostTimeUsedJobs.entries())
						.sort(([, a], [, b]) => b - a)
						.map(([label, value]) => ({
							label,
							value,
						}))}
					columns={[
						{
							key: "job_name",
							label: "Most Time Consuming Jobs",
							getCellData({ label }) {
								return label;
							},
							cellProps: { width: "calc(100% - 8rem)" },
						},
						{
							key: "value",
							label: "Minutes",
							getCellData({ value }) {
								return Math.ceil(value / 60 / 1000);
							},
							cellProps: { width: "8rem", align: "right" },
						},
					]}
					getRowKey={({ label }) => label}
				/>
				<DataTable
					data={Array.from(values.mostTimeUsedSteps.entries())
						.sort(([, a], [, b]) => b - a)
						.map(([label, value]) => ({
							label,
							value,
						}))}
					columns={[
						{
							key: "step_name",
							label: "Most Time Consuming Steps",
							getCellData({ label }) {
								return label;
							},
							cellProps: { width: "calc(100% - 8rem)" },
						},
						{
							key: "duration",
							label: "Minutes",
							getCellData({ value }) {
								return Math.ceil(value / 60 / 1000);
							},
							cellProps: { width: "8rem", align: "right" },
						},
					]}
					getRowKey={({ label }) => label}
				/>
			</ViewInnerContainer>
		</ViewContainer>
	);
};

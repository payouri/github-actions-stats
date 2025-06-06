import type { FC } from "react";
import { ViewContainer, ViewInnerContainer } from "./ViewsCommon.components";
import {
	useMainContentDataLoader,
	useRouteMainContentDataLoader,
	useRouteStatsDataLoader,
	useStatsDataLoader,
} from "../MainContent.loader";
import { NumberBox } from "../../../../components/NumberBox/NumberBox.component";
import { Flex, Grid } from "@radix-ui/themes";
import { DataTable } from "../../../../components/DataTable/DataTable.component";

const StatsBoxes: FC<{
	loading: boolean;
	boxes: {
		label: string;
		value: number;
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
							value: values.totalRuns,
						},
						{
							label: "Failures",
							value: values.failuresCount,
						},
						{
							label: "Total time running (minutes)",
							value: Math.floor(values.totalTimeRunning / 1000 / 60),
						},
						{
							label: "Longest run",
							value: values.longestRun,
						},
					]}
					loading={!data}
				/>
				<DataTable
					data={Array.from(values.mostRanJobs.entries())
						.sort(([, a], [, b]) => b - a)
						.slice(0, 5)
						.map(([label, value]) => ({
							label,
							value,
						}))}
					columns={[
						{
							key: "label",
							label: "Most Ran Jobs",
							getValue: ({ label }) => label,
							colWidth: "calc(100% - 6rem)",
						},
						{
							key: "value",
							label: "Count",
							getValue: ({ value }) => value,
							colWidth: "6rem",
						},
					]}
				/>
				<DataTable
					data={Array.from(values.mostRanSteps.entries())
						.sort(([, a], [, b]) => b - a)
						.slice(0, 5)
						.map(([label, value]) => ({
							label,
							value,
						}))}
					columns={[
						{
							key: "label",
							label: "Most Ran Steps",
							getValue: ({ label }) => label,
							colWidth: "calc(100% - 6rem)",
						},
						{
							key: "value",
							label: "Value",
							getValue: ({ value }) => value,
							colWidth: "6rem",
						},
					]}
				/>
				<DataTable
					data={Array.from(values.mostTimeUsedJobs.entries())
						.sort(([, a], [, b]) => b - a)
						.slice(0, 5)
						.map(([label, value]) => ({
							label,
							value,
						}))}
					columns={[
						{
							key: "Job name",
							label: "Label",
							getValue: ({ label }) => label,
							colWidth: "calc(100% - 6rem)",
						},
						{
							key: "Minutes",
							label: "Value",
							getValue: ({ value }) => Math.ceil(value / 60 / 1000),
							colWidth: "6rem",
						},
					]}
				/>
				<DataTable
					data={Array.from(values.mostTimeUsedSteps.entries())
						.sort(([, a], [, b]) => b - a)
						.slice(0, 5)
						.map(([label, value]) => ({
							label,
							value,
						}))}
					columns={[
						{
							key: "Job step",
							label: "Label",
							getValue: ({ label }) => label,
							colWidth: "calc(100% - 6rem)",
						},
						{
							key: "value",
							label: "Minutes",
							getValue: ({ value }) => Math.ceil(value / 60 / 1000),
							colWidth: "6rem",
						},
					]}
				/>
			</ViewInnerContainer>
		</ViewContainer>
	);
};

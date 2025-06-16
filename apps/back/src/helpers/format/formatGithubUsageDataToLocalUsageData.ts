import {
	type RunJobData,
	type RunUsageData,
	type GithubJobData,
	runJobDataSchema,
} from "@github-actions-stats/workflow-entity";
import type { components } from "@octokit/openapi-types";
import dayjs from "dayjs";

export function formatGithubUsageDataToLocalUsageData(
	usageData: components["schemas"]["workflow-run-usage"],
	jobsMap:
		| Record<number, components["schemas"]["job"] | RunJobData>
		| undefined,
): RunUsageData {
	const durationPerLabel: Record<string, number> = {};
	console.log(
		"Object.keys(usageData.billable)",
		Object.keys(usageData.billable),
	);
	console.log(
		"Object.keys(jobsMap)",
		jobsMap ? Object.keys(jobsMap).length : jobsMap,
	);
	console.log(
		"Object.values(jobsMap)",
		jobsMap ? Object.values(jobsMap)[0] : jobsMap,
	);

	if (jobsMap && Object.keys(jobsMap).length > 0) {
		let firstJobDate = dayjs();
		let lastJobDate = dayjs();

		let totalMs = 0;
		const durationPerLabel: Record<string, number> = {};
		const jobsRuns: GithubJobData[] = [];
		for (const [_, job] of Object.entries(jobsMap)) {
			if (job.started_at && dayjs(job.started_at).isBefore(firstJobDate))
				firstJobDate = dayjs(job.started_at);
			if (job.completed_at && dayjs(job.completed_at).isAfter(lastJobDate))
				lastJobDate = dayjs(job.completed_at);

			const jobDuration = dayjs(job.completed_at).diff(
				job.started_at,
				"millisecond",
			);
			if (job.labels?.length) {
				for (const label of job.labels) {
					if (!durationPerLabel[label]) durationPerLabel[label] = 0;
					durationPerLabel[label] += jobDuration;
				}
			}
			totalMs += jobDuration;
			jobsRuns.push({
				job_id: job.id,
				duration_ms: jobDuration,
				data: runJobDataSchema.parse(job),
			});
		}

		return {
			run_duration_ms: lastJobDate.diff(firstJobDate, "millisecond"),
			billable: {
				durationPerLabel,
				totalMs,
				jobsCount: jobsRuns.length,
				jobRuns: jobsRuns,
			},
		};
	}

	let totalMs = 0;
	const jobRuns = Object.entries(usageData.billable).reduce<GithubJobData[]>(
		(acc, [osPlatform, osData]) => {
			durationPerLabel[osPlatform] = osData.total_ms;
			if (!totalMs) totalMs = osData.total_ms;
			else totalMs += osData.total_ms;

			if (!osData || !osData.jobs || !osData.job_runs?.length) return acc;

			for (const jobRun of osData.job_runs) {
				const maybeData = jobsMap?.[jobRun.job_id];

				acc.push({
					job_id: jobRun.job_id,
					duration_ms:
						!jobRun.duration_ms &&
						maybeData?.started_at &&
						maybeData?.completed_at
							? dayjs(maybeData.completed_at).diff(
									dayjs(maybeData.started_at),
									"millisecond",
								)
							: jobRun.duration_ms,
					data: maybeData ? runJobDataSchema.parse(maybeData) : null,
				});
			}

			return acc;
		},
		[],
	);

	return {
		run_duration_ms: totalMs,
		billable: {
			durationPerLabel,
			totalMs: totalMs ?? 0,
			jobsCount: jobRuns.length,
			jobRuns,
		},
	};
}

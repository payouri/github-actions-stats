import type { JobSchedulerTemplateOptions, RepeatOptions } from "bullmq";
import { DB } from "../../entities/db.js";
import { DEFAULT_PENDING_JOB_GROUP } from "../../entities/PendingJob/constants.js";
import { ReprocessLaterError } from "../../errors/ReprocessLaterError.js";
import type {
	DefaultJobDefinition,
	JobProcessMethod,
} from "../../lib/Queue/types.js";
import type { JobsMap } from "../methods/types.js";
import type { WorkflowQueueJobData } from "../types.js";
import logger from "../../lib/Logger/logger.js";
import { JobTokenMissingError } from "../../errors/JobTokenMissingError.js";

type Steps = Readonly<{
	1: {
		name: "get-next-job";
	};
}>;

export const POP_JOBS_REPEATEDLY_JOB_NAME = "pop-jobs-repeatedly" as const;
const NO_JOB_DEFAULT_DELAY_MS = 5000;
const JOB_ALREADY_PROCESSING_DELAY_MS = 100;

const firstStep = {
	name: "get-next-job",
	async method(...args: Parameters<JobProcessMethod<DefaultJobDefinition>>) {
		const [jobData] = args;
		const pendingJob = await DB.queries.getNextQueueJob({ user: "default" });
		if (!pendingJob) {
			if (!jobData.token) {
				throw new JobTokenMissingError({
					message: "No job token found",
					jobName: jobData.name,
					methodName: POP_JOBS_REPEATEDLY_JOB_NAME,
				});
			}

			throw new ReprocessLaterError({
				message: "No pending jobs found",
				delayMs: NO_JOB_DEFAULT_DELAY_MS,
				jobToken: jobData.token,
			});
		}
		return pendingJob;
	},
} as const;

const JOB_STEPS = {
	1: firstStep,
	2: {
		verify: "verify-job",
	},
} as const;

const MAX_JOB_STEPS = Object.keys(JOB_STEPS).length;

export const PopJobsRepeatedly: {
	repeat: RepeatOptions;
	data?: Record<string, unknown>;
} & JobSchedulerTemplateOptions & {
		name: typeof POP_JOBS_REPEATEDLY_JOB_NAME;
		type: "scheduled";
		processJob: JobProcessMethod<DefaultJobDefinition>;
	} = {
	type: "scheduled",
	name: POP_JOBS_REPEATEDLY_JOB_NAME,
	repeat: {
		every: 1000,
	},
	processJob: async (jobData, { queueInstance: processWorkflowJobQueue }) => {
		const { id: workerQueueJobId } = jobData;
		logger.debug(
			`[${POP_JOBS_REPEATEDLY_JOB_NAME}]:Processing job ${workerQueueJobId}`,
		);
		const pendingJob = await DB.queries.getNextQueueJob({
			user: DEFAULT_PENDING_JOB_GROUP,
		});
		if (!pendingJob) {
			logger.debug(`[${POP_JOBS_REPEATEDLY_JOB_NAME}]:No pending jobs found`);
			if (!jobData.token) {
				throw new JobTokenMissingError({
					message: "No job token found",
					jobName: jobData.name,
					methodName: POP_JOBS_REPEATEDLY_JOB_NAME,
				});
			}
			throw new ReprocessLaterError({
				message: "No pending jobs found",
				delayMs: NO_JOB_DEFAULT_DELAY_MS,
				jobToken: jobData.token,
			});
		}
		logger.debug(
			`[${POP_JOBS_REPEATEDLY_JOB_NAME}]:Pending job ${pendingJob?.key} found`,
			typeof processWorkflowJobQueue.generateJobId,
		);
		const isExisting = await processWorkflowJobQueue.isExistingJob(
			processWorkflowJobQueue.generateJobId({
				group: "default",
				jobData: pendingJob.data as unknown as WorkflowQueueJobData["data"],
				jobName: pendingJob.method as unknown as keyof JobsMap,
			}),
		);
		if (isExisting) {
			logger.debug(
				`[${POP_JOBS_REPEATEDLY_JOB_NAME}]:Job ${pendingJob.key} is already existing`,
			);
			if (!jobData.token) {
				throw new JobTokenMissingError({
					message: "No job token found",
					jobName: jobData.name,
					methodName: POP_JOBS_REPEATEDLY_JOB_NAME,
				});
			}
			throw new ReprocessLaterError({
				message: "No pending jobs found",
				delayMs: JOB_ALREADY_PROCESSING_DELAY_MS,
				jobToken: jobData.token,
			});
		}
		const addJobResult = await processWorkflowJobQueue.addJob({
			jobName: pendingJob.method as unknown as keyof JobsMap,
			jobData: pendingJob.data as unknown as WorkflowQueueJobData["data"],
		});
		if (!addJobResult.hasFailed) {
			await DB.mutations.deletePendingJob({
				jobId: pendingJob.key,
			});
		}

		return addJobResult;
	},
};

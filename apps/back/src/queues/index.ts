import dayjs from "dayjs";
import { config } from "../config/config.js";
import { formatMs } from "../helpers/format/formatMs.js";
import logger from "../lib/Logger/logger.js";
import { createQueue, createWorker } from "../lib/Queue/index.js";
import type { DefaultJobDefinition, MethodMap } from "../lib/Queue/types.js";
import {
	RETRIEVE_NEW_RUN_JOB_NAME,
	retrieveNewRuns,
} from "./methods/retrieveNewRuns.js";
import {
	RETRIEVE_OLDER_RUNS_JOB_NAME,
	retrieveOldRuns,
} from "./methods/retrieveOldRuns.js";
import {
	RETRIEVE_WORKFLOW_UPDATES_JOB_NAME,
	retrieveWorkflowUpdates,
} from "./methods/retrieveWorkflowUpdates.js";
import type { JobsMap } from "./methods/types.js";
import { queueJobExecutionReportsMongoStorage } from "../entities/QueueJobExecutionReport/storage.js";
import {
	UniqueJobsMap,
	type UniqueJobsMapType,
} from "./uniqueJobs/initUniqueJobs.js";
import {
	POPULATE_RUN_AND_CREATE_STAT_JOB_NAME,
	populateRunAndCreateStat,
} from "./sequenceJobs/populateRunAndCreateStat/populateRunAndCreateStat.job.js";

const MethodsMap: MethodMap<JobsMap> = {
	[RETRIEVE_OLDER_RUNS_JOB_NAME]: retrieveOldRuns,
	[RETRIEVE_NEW_RUN_JOB_NAME]: retrieveNewRuns,
	[RETRIEVE_WORKFLOW_UPDATES_JOB_NAME]: retrieveWorkflowUpdates,
	[POPULATE_RUN_AND_CREATE_STAT_JOB_NAME]: populateRunAndCreateStat,
};

const PROCESS_WORKFLOW_JOB_QUEUE_NAME = "process-workflow-job" as const;
const PROCESS_WORKFLOW_JOB_QUEUE_WORKER_CONCURRENCY = 1 as const;

export function createProcessWorkflowJobQueue(params?: {
	abortSignal?: AbortSignal;
}) {
	const { abortSignal } = params ?? {};

	return createQueue<JobsMap>({
		name: PROCESS_WORKFLOW_JOB_QUEUE_NAME,
		redisUrl: config.REDIS.uri,
		abortSignal,
	});
}

export function createProcessWorkflowJobWorker(params?: {
	abortSignal?: AbortSignal;
}) {
	const { abortSignal } = params ?? {};

	return createWorker<
		JobsMap & {
			[Key in keyof UniqueJobsMapType]: DefaultJobDefinition;
		}
	>({
		queue: PROCESS_WORKFLOW_JOB_QUEUE_NAME,
		abortSignal,
		name: "process-workflow-job-worker",
		concurrency: PROCESS_WORKFLOW_JOB_QUEUE_WORKER_CONCURRENCY,
		redisUrl: config.REDIS.uri,
		async onJobEnd(endedJob) {
			logger.debug(
				`[${PROCESS_WORKFLOW_JOB_QUEUE_NAME}][${endedJob.name}] Ended job ${
					endedJob.status
				} in ${formatMs(dayjs(endedJob.endTime).diff(endedJob.startTime))}`,
			);
			await queueJobExecutionReportsMongoStorage.set(
				`${endedJob.name}/${endedJob.jobId}`,
				endedJob,
			);
		},
		async processJob(job, { abortSignal, queueInstance }) {
			logger.debug(`Processing job ${job.id}, job name ${job.name}`);

			const start = performance.now();
			try {
				if (job.name in UniqueJobsMap) {
					const methodResult = await Reflect.apply(
						UniqueJobsMap[job.name as keyof UniqueJobsMapType].processJob,
						undefined,
						[
							job,
							{
								abortSignal,
								queueInstance,
							},
						],
					);
					return methodResult;
				}
				if (job.name in MethodsMap) {
					const methodResult = await Reflect.apply(
						MethodsMap[job.name as keyof typeof MethodsMap],
						undefined,
						[job, { abortSignal, queueInstance }],
					);
					return methodResult;
				}

				throw new Error(`Job ${job.name} is not supported`);
			} finally {
				const end = performance.now();
				logger.debug(`Job ${job.name} processed in ${end - start}ms`);
			}
		},
	});
}

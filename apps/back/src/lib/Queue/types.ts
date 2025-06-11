import type { MethodResult } from "../../types/MethodResult.js";
import type { Job as BullJob, Queue as BullQueue } from "bullmq";

export interface EndedJob<Job extends DefaultJobDefinition> {
	jobId: string;
	status: "success" | "failed";
	startTime: Date;
	endTime: Date;
	createdTime: Date;
	data: Job["jobData"];
	name: Job["jobName"];
	result:
		| Job["jobResult"]
		| {
				reason: string;
				errorCode: string;
		  };
}

export interface DefaultJobDefinition {
	jobName: string;
	jobData: unknown;
	jobResult?: unknown;
	jobErrorCode?: string;
}

export type DefaultJobsMap = {
	[JobName in string]: Omit<DefaultJobDefinition, "jobName"> & {
		jobName: JobName;
	};
};

export type DefaultJob<JobDefinition extends DefaultJobDefinition> = BullJob<
	JobDefinition["jobData"],
	// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
	JobDefinition["jobResult"] extends void | undefined
		? void
		: JobDefinition["jobResult"],
	JobDefinition["jobName"]
>;

export type JobMethodResult<JobDefinition extends DefaultJobDefinition> =
	MethodResult<
		JobDefinition extends { jobResult: infer Result }
			? // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
				Result extends undefined | void
				? void
				: Result
			: void,
		| "failed_to_process_job"
		| "job_aborted"
		| Exclude<JobDefinition["jobErrorCode"], undefined>
	>;

export type JobProcessMethod<JobDefinition extends DefaultJobDefinition> = (
	job: DefaultJob<JobDefinition>,
	options: { abortSignal: AbortSignal; queueInstance: Queue<DefaultJobsMap> },
) => JobMethodResult<JobDefinition> | Promise<JobMethodResult<JobDefinition>>;

export type MethodMap<T extends DefaultJobsMap> = {
	[JobName in DefaultJobKey<T>]: JobProcessMethod<T[JobName]>;
};

export type DefaultJobKey<T extends DefaultJobsMap> = keyof T;
export type GetJobMethod<T extends DefaultJobsMap> = (
	jobId: string,
) => Promise<DefaultJob<T[DefaultJobKey<T>]>>;
export type IsExistingJobMethod = (jobId: string) => Promise<boolean>;
export type GenerateJobIdMethod<Job extends DefaultJobsMap> = (
	jobData: Omit<Job[DefaultJobKey<Job>], "jobResult" | "jobErrorCode"> & {
		group: string;
	},
) => string;

export interface CreateQueueParams {
	name: string;
	redisUrl: string;
	abortSignal?: AbortSignal;
	queuePrefix?: string;
}
export interface Queue<Job extends DefaultJobsMap> {
	addJob: (
		job: Omit<Job[DefaultJobKey<Job>], "jobResult" | "jobErrorCode">,
		options?: {
			jobId?: string;
			delayMs?: number;
		},
	) => Promise<MethodResult<void, "failed_to_add_job">>;
	getJob: GetJobMethod<Job>;
	isExistingJob: IsExistingJobMethod;
	generateJobId: GenerateJobIdMethod<Job>;
	init: () => Promise<MethodResult<void, "failed_to_init_queue">>;
	close: () => Promise<MethodResult<void, "failed_to_close_queue">>;
	queue: BullQueue;
}

export interface CreateWorkerParams<
	JobMap extends DefaultJobsMap,
	JobKey extends DefaultJobKey<JobMap> = DefaultJobKey<JobMap>,
	JobDefinition extends JobMap[JobKey] = JobMap[JobKey],
	Job extends DefaultJob<JobDefinition> = DefaultJob<JobDefinition>,
> {
	queue: string;
	name: string;
	concurrency: number;
	redisUrl: string;
	abortSignal?: AbortSignal;
	queuePrefix?: string;
	onJobEnd?: (job: EndedJob<JobDefinition>) => Promise<void> | void;
	processJob: (
		job: Job,
		options: {
			abortSignal: AbortSignal;
			queueInstance: Queue<JobMap>;
		},
	) => Promise<
		MethodResult<
			JobDefinition extends { jobResult: infer Result } ? Result : void,
			"failed_to_process_job" | "job_aborted"
		>
	>;
}

export interface Worker<T = unknown> {
	init: () => Promise<MethodResult<void, "failed_to_init_worker">>;
	close: () => Promise<MethodResult<void, "failed_to_close_worker">>;
}

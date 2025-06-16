import { Queue as BullQueue, QueueEvents } from "bullmq";
import { BullMQOtel } from "bullmq-otel";
import { config } from "../../config/config.js";
import logger from "../Logger/logger.js";
import {
	DEFAULT_QUEUE_INIT_TIMEOUT,
	DEFAULT_QUEUE_PREFIX,
} from "./constants.js";
import type { CreateQueueParams, DefaultJobsMap, Queue } from "./types.js";

export { createWorker } from "./worker.js";

export function createQueue<T extends DefaultJobsMap>(
	params: CreateQueueParams,
): Queue<T> {
	const {
		name,
		redisUrl,
		abortSignal: abortSignalParam,
		queuePrefix = DEFAULT_QUEUE_PREFIX,
	} = params;

	const abortController = new AbortController();
	const abortSignal = abortSignalParam
		? AbortSignal.any([abortSignalParam, abortController.signal])
		: abortController.signal;

	const queue = new BullQueue(name, {
		connection: {
			lazyConnect: true,
			url: redisUrl,
		},
		prefix: queuePrefix,
		streams: {
			events: {
				maxLen: 5000,
			},
		},
		telemetry: new BullMQOtel("stats-queue", config.OTEL.serviceVersion),
		defaultJobOptions: {
			keepLogs: 10,
			attempts: 0,
			removeOnComplete: true,
			removeOnFail: true,
			sizeLimit: 1024,
			backoff: {
				type: "exponential",
				delay: 1000,
			},
		},
	});
	const queueEvents = new QueueEvents(name, {
		connection: {
			lazyConnect: true,
			url: redisUrl,
		},
		prefix: queuePrefix,
	});
	queueEvents.on("stalled", async (job) => {
		const jobData = await queue.getJob(job.jobId);

		logger.warn(
			`[${name}] Job ${job.jobId} is stalled`,
			jobData
				? {
						jobName: jobData.name,
						stalledTime: jobData.stalledCounter,
					}
				: {},
		);
	});
	queueEvents.on("duplicated", async (job) => {
		const jobData = await queue.getJob(job.jobId);
		logger.warn(`[${name}] Job ${job.jobId} is duplicated`, {
			jobName: jobData.name,
		});
	});

	async function addJob(
		...data: Parameters<Queue<T>["addJob"]>
	): ReturnType<Queue<T>["addJob"]> {
		const [{ jobName, jobData }, options] = data;

		await queue.add(jobName, jobData, {
			// deduplication: {
			//   id: jobName,
			//   ttl: 2000,
			// },
			telemetry: {},
			...(options?.jobId ? { deduplication: { id: options.jobId } } : {}),
			...(options?.delayMs ? { delay: options.delayMs } : {}),
		});

		return {
			hasFailed: false,
		};
	}
	async function isExistingJob(
		...params: Parameters<Queue<T>["isExistingJob"]>
	): ReturnType<Queue<T>["isExistingJob"]> {
		const [jobId] = params;
		const job = await queue.getJobState(jobId);
		return job !== "unknown";
	}
	async function getJob(
		...params: Parameters<Queue<T>["getJob"]>
	): ReturnType<Queue<T>["getJob"]> {
		const [jobId] = params;
		const [job] = await queue.getJob(jobId);
		return job;
	}
	function generateJobId(
		...params: Parameters<Queue<T>["generateJobId"]>
	): ReturnType<Queue<T>["generateJobId"]> {
		const [jobData] = params;

		return `group:${jobData.group}`;
	}

	async function init(): ReturnType<Queue<T>["init"]> {
		const client = await queue.client;
		const queueEventsClient = await queueEvents.client;

		if (client.status === "ready") {
			logger.debug(`[${name}] Queue is ready`);
			return {
				hasFailed: false,
			};
		}

		logger.debug(`[${name}] Connecting to queue`);
		const start = Date.now();
		client.connect();
		queueEventsClient.connect();

		while (
			["connecting", "reconnecting", "connect"].includes(client.status) ||
			["connecting", "reconnecting", "connect"].includes(
				queueEventsClient.status,
			)
		) {
			logger.debug(`[${name}] Waiting for queue to be ready`);
			await new Promise((resolve) => {
				setTimeout(resolve, 100);
			});
			if (Date.now() - start > DEFAULT_QUEUE_INIT_TIMEOUT) {
				return {
					hasFailed: true,
					error: {
						code: "failed_to_init_queue",
						message: `[${name}] RedisClient of queue failed to connect`,
						error: new Error(`[${name}] RedisClient of queue is not ready`),
						data: client,
					},
				};
			}
		}

		if (
			["close", "end"].includes(client.status) ||
			["close", "end"].includes(queueEventsClient.status)
		) {
			return {
				hasFailed: true,
				error: {
					code: "failed_to_init_queue",
					message: `[${name}] RedisClient of queue failed to connect`,
					error: new Error(`[${name}] RedisClient of queue is closed`),
					data: client,
				},
			};
		}

		abortSignal.addEventListener(
			"abort",
			() => {
				logger.debug(`[${name}] Aborting queue`);
				close();
			},
			{
				once: true,
			},
		);

		return {
			hasFailed: false,
		};
	}

	async function close(): ReturnType<Queue<T>["close"]> {
		try {
			if (queue.closing) {
				logger.debug(`[${name}] Queue is already closing`);
				await Promise.all([queue.closing, queueEvents.closing]);

				return {
					hasFailed: false,
				};
			}

			logger.debug(`[${name}] Closing queue`);
			await Promise.all([queue.close(), queueEvents.close()]);
			logger.debug(`[${name}] Queue has been closed`);
			return {
				hasFailed: false,
			};
		} catch (error) {
			return {
				hasFailed: true,
				error: {
					code: "failed_to_close_queue",
					message:
						error instanceof Error
							? error.message
							: "Failed to close queue properly",
					error:
						error instanceof Error
							? error
							: new Error("Failed to close queue properly", {
									cause: error,
								}),
					data: undefined,
				},
			};
		}
	}

	return {
		generateJobId,
		addJob,
		getJob,
		isExistingJob,
		init,
		close,
		get queue() {
			return queue;
		},
	};
}

import { formatMs } from "@github-actions-stats/common-utils";
import { Worker as BullWorker, DelayedError, UnrecoverableError } from "bullmq";
import { BullMQOtel } from "bullmq-otel";
import dayjs from "dayjs";
import { config } from "../../config/config.js";
import { AbortError } from "../../errors/AbortError.js";
import { MoveToWaitError } from "../../errors/MoveToWaitError.js";
import { ReprocessLaterError } from "../../errors/ReprocessLaterError.js";
import {
	UniqueJobsMap,
	type UniqueJobsMapType,
} from "../../queues/uniqueJobs/initUniqueJobs.js";
import logger from "../Logger/logger.js";
import {
	DEFAULT_QUEUE_INIT_TIMEOUT,
	DEFAULT_QUEUE_PREFIX,
} from "./constants.js";
import { createQueue } from "./index.js";
import type { CreateWorkerParams, DefaultJobsMap, Worker } from "./types.js";

export function createWorker<Job extends DefaultJobsMap>(
	params: CreateWorkerParams<Job>,
): Worker<Job> {
	const {
		queue,
		name,
		concurrency,
		redisUrl,
		abortSignal: abortSignalParam,
		onJobEnd,
		processJob,
		queuePrefix = DEFAULT_QUEUE_PREFIX,
	} = params;
	const abortController = new AbortController();
	const abortSignal = abortSignalParam
		? AbortSignal.any([abortSignalParam, abortController.signal])
		: abortController.signal;

	const queueInstance = createQueue<Job>({
		name: queue,
		redisUrl,
		abortSignal: abortController.signal,
	});

	const worker = new BullWorker(
		queue,
		async (job) => {
			try {
				logger.debug(
					`[${queue}] Processing job ${job.id}, job name ${job.name}`,
				);
				const start = performance.now();
				const result = await processJob(job, {
					abortSignal,
					queueInstance,
				});
				if (result.hasFailed) {
					if (result.error.error instanceof AbortError) {
						if (
							["max_duration_reached", "max_data_reached"].includes(
								result.error.error.abortReason,
							)
						) {
							return {
								hasFailed: false,
							};
						}

						throw result.error.error;
					}

					throw result.error instanceof Error
						? result.error
						: new Error(result.error.message);
				}
				const end = performance.now();
				logger.debug(
					`[${queue}] Job ${job.id} processed in ${formatMs(end - start)}ms`,
				);
				return result;
			} catch (error) {
				if (error instanceof MoveToWaitError) {
					logger.debug(
						`[${queue}][${worker.id}][${job.id}] Job will be moved to wait`,
					);
					await job.moveToWait(error.jobToken);
					return;
				}
				if (error instanceof ReprocessLaterError) {
					logger.debug(
						`[${queue}][${worker.id}][${
							job.id
						}] Job will be reprocessed in ${formatMs(error.delayMs, {
							convertToSeconds: true,
						})}`,
					);
					if (job.name in UniqueJobsMap) {
						const { name, repeat, ...jobOpts } =
							UniqueJobsMap[job.name as keyof UniqueJobsMapType];

						await queueInstance.queue.upsertJobScheduler(
							name,
							{
								...UniqueJobsMap[job.name as keyof UniqueJobsMapType].repeat,
								offset: error.delayMs,
								immediately: false,
							},
							{
								data: job.data,
								opts: {
									removeOnComplete: true,
									removeOnFail: true,
									...jobOpts,
								},
								name,
							},
						);
					}
					return {
						hasFailed: false,
					};
					// throw new DelayedError(error.message);
				}
				if (
					error instanceof AbortError &&
					["SIGTERM", "SIGINT", "abort_signal_aborted"].includes(
						error.abortReason,
					) &&
					job.token
				) {
					logger.debug(
						`[${queue}][${worker.id}][${job.id}] Job is aborted, moving to wait`,
					);
					await job.moveToWait(job.token);
					return;
				}

				job.failedReason = JSON.stringify(error);
				logger.error(
					`[${queue}][${worker.id}][${job.id}] Job failed to process`,
					error,
				);
				throw new UnrecoverableError(String(error));
			}
		},
		{
			telemetry: new BullMQOtel("stats-worker", config.OTEL.serviceVersion),
			connection: {
				lazyConnect: true,
				url: redisUrl,
			},
			autorun: false,
			concurrency,
			prefix: queuePrefix,
		},
	);
	worker.on("error", (error) => {
		logger.error(`[${name}:${worker.id}] Worker error`, error);
	});
	worker.on("completed", async (job) => {
		await onJobEnd?.({
			name: job.name,
			data: job.data,
			startTime: dayjs(job.processedOn).toDate(),
			endTime: dayjs(job.finishedOn).toDate(),
			createdTime: dayjs(job.timestamp).toDate(),
			status:
				job.returnvalue !== undefined &&
				Reflect.has(job.returnvalue, "hasFailed") &&
				Reflect.get(job.returnvalue, "hasFailed") === false
					? "success"
					: "failed",
			result: job.returnvalue,
			jobId: job.id ?? "unknown",
		});
	});
	worker.on("failed", async (job, error) => {
		logger.error(`[${name}:${worker.id}] Worker failed`, error);
		if (!job) {
			logger.error(`[${name}:${worker.id}] Failed job is undefined`);
			return;
		}

		await onJobEnd?.({
			name: job.name,
			data: job.data,
			startTime: dayjs(job.processedOn).toDate(),
			endTime: dayjs(job.finishedOn).toDate(),
			createdTime: dayjs(job.timestamp).toDate(),
			jobId: job.id ?? "unknown",
			status: "failed",
			result: job.returnvalue
				? job.returnvalue
				: { reason: job.failedReason, errorCode: "unknown" },
		});
	});

	async function close(): ReturnType<Worker["close"]> {
		try {
			if (worker.closing) {
				logger.debug(`[${name}:${worker.id}] Worker is already closing`);
				await worker.closing;
				return {
					hasFailed: false,
				};
			}
			logger.debug(`[${name}:${worker.id}] Closing worker`);
			await worker.close();
			logger.debug(`[${name}:${worker.id}] Worker has been closed`);
			return {
				hasFailed: false,
			};
		} catch (error) {
			return {
				hasFailed: true,
				error: {
					code: "failed_to_close_worker",
					message:
						error instanceof Error
							? error.message
							: "Failed to close worker properly",
					error:
						error instanceof Error
							? error
							: new Error("Failed to close worker properly", {
									cause: error,
								}),
					data: undefined,
				},
			};
		} finally {
			await queueInstance.close();
		}
	}

	async function init(): ReturnType<Worker["init"]> {
		await queueInstance.init();
		if (worker.closing) {
			logger.debug(`[${name}] Worker is closing`);
			return {
				hasFailed: true,
				error: {
					code: "failed_to_init_worker",
					message: `[${name}] Worker is closing`,
					error: new Error(`[${name}] Worker is closing`),
					data: undefined,
				},
			};
		}

		if (worker.isRunning()) {
			if (worker.isPaused()) {
				logger.debug(`[${name}] Worker is already paused`);
				return {
					hasFailed: false,
				};
			}
			logger.debug(`[${name}] Worker is already running`);
			return {
				hasFailed: false,
			};
		}

		const start = Date.now();
		logger.debug(`[${name}:${worker.id}] Starting worker`);
		worker.run();
		while (!worker.isRunning()) {
			logger.debug(`[${name}:${worker.id}] Waiting for worker to be ready`);
			await new Promise((resolve) => {
				setTimeout(resolve, 100);
			});
			if (Date.now() - start > DEFAULT_QUEUE_INIT_TIMEOUT) {
				return {
					hasFailed: true,
					error: {
						code: "failed_to_init_worker",
						message: ` [${name}:${worker.id}] RedisClient of worker failed to connect`,
						error: new Error(
							`[${name}:${worker.id}] RedisClient of worker is not ready`,
						),
						data: undefined,
					},
				};
			}
		}
		if (worker.isPaused()) {
			logger.debug(`[${name}:${worker.id}] Worker is paused`);
			worker.resume();
		}

		logger.debug(`[${name}:${worker.id}] Worker initialized`);

		return {
			hasFailed: false,
		};
	}

	abortSignal.addEventListener(
		"abort",
		() => {
			logger.debug(`[${name}:${worker.id}] Aborting worker`);
			close();
		},
		{ once: true },
	);

	return {
		close,
		init,
	};
}

import {
  Queue as BullQueue,
  Worker as BullWorker,
  UnrecoverableError,
} from "bullmq";
import { formatMs } from "../../helpers/format/formatMs.js";
import logger from "../Logger/logger.js";
import type {
  CreateQueueParams,
  CreateWorkerParams,
  DefaultJobsMap,
  Queue,
  Worker,
} from "./types.js";
import dayjs from "dayjs";

const PREFIX = "github-actions-stats-queues";
const INIT_TIMEOUT = 10_000;

export function createQueue<T extends DefaultJobsMap>(
  params: CreateQueueParams
): Queue<T> {
  const { name, redisUrl, abortSignal: abortSignalParam } = params;

  const abortController = new AbortController();
  const abortSignal = abortSignalParam
    ? AbortSignal.any([abortSignalParam, abortController.signal])
    : abortController.signal;

  const queue = new BullQueue(name, {
    connection: {
      lazyConnect: true,
      url: redisUrl,
    },
    prefix: PREFIX,
    streams: {
      events: {
        maxLen: 5000,
      },
    },
    defaultJobOptions: {
      keepLogs: 10,
      attempts: 0,
      removeOnComplete: true,
      removeOnFail: true,
      sizeLimit: 1024 / 4,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  });

  async function addJob(
    ...data: Parameters<Queue<T>["addJob"]>
  ): ReturnType<Queue<T>["addJob"]> {
    const [{ jobName, jobData }] = data;

    await queue.add(jobName, jobData, {
      // deduplication: {
      //   id: jobName,
      //   ttl: 2000,
      // },
    });

    return {
      hasFailed: false,
    };
  }

  async function init(): ReturnType<Queue<T>["init"]> {
    const client = await queue.client;

    if (client.status === "ready") {
      logger.debug(`[${name}] Queue is ready`);
      return {
        hasFailed: false,
      };
    }

    logger.debug(`[${name}] Connecting to queue`);
    const start = Date.now();
    client.connect();
    while (["connecting", "reconnecting", "connect"].includes(client.status)) {
      logger.debug(`[${name}] Waiting for queue to be ready`);
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      if (Date.now() - start > INIT_TIMEOUT) {
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

    if (client.status === "close" || client.status === "end") {
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
      }
    );

    return {
      hasFailed: false,
    };
  }

  async function close(): ReturnType<Queue<T>["close"]> {
    try {
      if (queue.closing) {
        logger.debug(`[${name}] Queue is already closing`);
        await queue.closing;
        return {
          hasFailed: false,
        };
      }

      logger.debug(`[${name}] Closing queue`);
      await queue.close();
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
    addJob,
    init,
    close,
  };
}

export function createWorker<Job extends DefaultJobsMap>(
  params: CreateWorkerParams<Job>
): Worker<Job> {
  const {
    queue,
    name,
    concurrency,
    redisUrl,
    abortSignal: abortSignalParam,
    onJobEnd,
    processJob,
  } = params;
  const abortController = new AbortController();
  const abortSignal = abortSignalParam
    ? AbortSignal.any([abortSignalParam, abortController.signal])
    : abortController.signal;

  const worker = new BullWorker(
    queue,
    async (job) => {
      try {
        logger.debug(
          `[${queue}] Processing job ${job.id}, job name ${job.name}`
        );
        const start = performance.now();
        const result = await processJob(job, {
          abortSignal,
        });
        if (result.hasFailed) {
          if (result.error.code === "job_aborted") {
            throw new Error("Job aborted");
          }
          throw new Error(result.error.message);
        } else if (abortSignal.aborted && job.token) {
          throw new Error("Job aborted");
        }
        const end = performance.now();
        logger.debug(
          `[${queue}] Job ${job.id} processed in ${formatMs(end - start)}ms`
        );
        return result;
      } catch (error) {
        job.failedReason = JSON.stringify(error);
        if (
          error instanceof Error &&
          error.message === "Job aborted" &&
          job.token
        ) {
          logger.debug(
            `[${queue}][${worker.id}][${job.id}] Job is aborted, moving to wait`
          );
          await job.moveToWait(job.token);
          return;
        }

        logger.error(
          `[${queue}][${worker.id}][${job.id}] Job failed to process`,
          error
        );
        throw new UnrecoverableError(String(error));
      }
    },
    {
      connection: {
        lazyConnect: true,
        url: redisUrl,
      },
      autorun: false,
      concurrency,
      prefix: PREFIX,
    }
  );
  worker.on("error", (error) => {
    logger.error(`[${name}:${worker.id}] Worker error`, error);
  });
  worker.on("completed", (job) => {
    onJobEnd?.({
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
  worker.on("failed", (job) => {
    if (!job) {
      logger.error(`[${name}:${worker.id}] Failed job is undefined`);
      return;
    }

    onJobEnd?.({
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
    }
  }

  async function init(): ReturnType<Worker["init"]> {
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
      if (Date.now() - start > INIT_TIMEOUT) {
        return {
          hasFailed: true,
          error: {
            code: "failed_to_init_worker",
            message: ` [${name}:${worker.id}] RedisClient of worker failed to connect`,
            error: new Error(
              `[${name}:${worker.id}] RedisClient of worker is not ready`
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
    { once: true }
  );

  return {
    close,
    init,
  };
}

import { Queue as BullQueue, Worker as BullWorker } from "bullmq";
import logger from "../Logger/logger.js";
import type {
  CreateQueueParams,
  CreateWorkerParams,
  DefaultJobsMap,
  Queue,
  Worker,
} from "./types.js";

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
      sizeLimit: 1024 / 4,
      backoff: {
        type: "exponential",
        delay: 5000,
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
      logger.debug(`Queue ${name} is already ready`);
      return {
        hasFailed: false,
      };
    }

    logger.debug(`Connecting to queue ${name}`);
    const start = Date.now();
    client.connect();
    while (["connecting", "reconnecting", "connect"].includes(client.status)) {
      logger.debug(`Waiting for queue ${name} to be ready`);
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      if (Date.now() - start > INIT_TIMEOUT) {
        return {
          hasFailed: true,
          error: {
            code: "failed_to_init_queue",
            message: `RedisClient of queue ${name} failed to connect`,
            error: new Error(`RedisClient of queue ${name} is not ready`),
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
          message: `RedisClient of queue ${name} failed to connect`,
          error: new Error(`RedisClient of queue ${name} is closed`),
          data: client,
        },
      };
    }

    abortSignal.addEventListener(
      "abort",
      () => {
        logger.debug(`Aborting queue ${name}`);
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
        logger.debug(`Queue ${name} is already closing`);
        await queue.closing;
        return {
          hasFailed: false,
        };
      }

      logger.debug(`Closing queue ${name}`);
      await queue.close();
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
    processJob,
  } = params;
  const abortController = new AbortController();
  const abortSignal = abortSignalParam
    ? AbortSignal.any([abortSignalParam, abortController.signal])
    : abortController.signal;

  const worker = new BullWorker(
    queue,
    async (job) => {
      logger.debug(`[${queue}] Processing job ${job.id}, job name ${job.name}`);
      const start = performance.now();
      const result = await processJob(job, {
        abortSignal,
      });
      const end = performance.now();
      logger.debug(
        `[${queue}] Job ${job.id} processed in ${
          end - start
        }ms, result: ${result}`
      );
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

  async function close(): ReturnType<Worker["close"]> {
    try {
      if (worker.closing) {
        logger.debug(`Worker ${name}:${worker.id} is closing`);
        await worker.closing;
        return {
          hasFailed: false,
        };
      }
      logger.debug(`Closing worker ${name}:${worker.id}`);
      await worker.close();
      logger.debug(`Worker ${name}:${worker.id} has been closed`);
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
      logger.debug(`Worker ${name} is closing`);
      return {
        hasFailed: true,
        error: {
          code: "failed_to_init_worker",
          message: `Worker ${name} is closing`,
          error: new Error(`Worker ${name} is closing`),
          data: undefined,
        },
      };
    }

    if (worker.isRunning()) {
      if (worker.isPaused()) {
        logger.debug(`Worker ${name} is already paused`);
        return {
          hasFailed: false,
        };
      }
      logger.debug(`Worker ${name} is already running`);
      return {
        hasFailed: false,
      };
    }

    const start = Date.now();
    logger.debug(`Starting worker ${name}:${worker.id}`);
    worker.run();
    while (!worker.isRunning()) {
      logger.debug(`Waiting for worker ${name}:${worker.id} to be ready`);
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      if (Date.now() - start > INIT_TIMEOUT) {
        return {
          hasFailed: true,
          error: {
            code: "failed_to_init_worker",
            message: `RedisClient of worker ${name}:${worker.id} failed to connect`,
            error: new Error(
              `RedisClient of worker ${name}:${worker.id} is not ready`
            ),
            data: undefined,
          },
        };
      }
    }
    if (worker.isPaused()) {
      logger.debug(`Worker ${name}:${worker.id} is paused`);
      worker.resume();
    }

    logger.debug(`Worker ${name}:${worker.id} initialized`);

    return {
      hasFailed: false,
    };
  }

  abortSignal.addEventListener(
    "abort",
    () => {
      logger.debug(`Aborting worker ${name}:${worker.id}`);
      close();
    },
    { once: true }
  );

  return {
    close,
    init,
  };
}

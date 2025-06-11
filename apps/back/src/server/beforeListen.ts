import { initMongoStorages } from "../entities/initMongoStorages.js";
import { initDefaultRedisClient } from "../lib/RedisClient/redisClient.js";
import { initUniqueJobs } from "../queues/uniqueJobs/initUniqueJobs.js";
import { processWorkflowJobQueue } from "./queue.js";

export async function beforeListen() {
	await Promise.all([initMongoStorages(), initDefaultRedisClient()]);
	await processWorkflowJobQueue.init();
	await initUniqueJobs(processWorkflowJobQueue.queue);
}

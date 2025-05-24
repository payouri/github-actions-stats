import { initMongoStorages } from "../entities/initMongoStorages.js";
import { initDefaultRedisClient } from "../lib/RedisClient/redisClient.js";
import { processWorkflowJobQueue } from "./queue.js";

export async function beforeListen() {
  await Promise.all([initMongoStorages(), initDefaultRedisClient()]);
  await processWorkflowJobQueue.init();
}

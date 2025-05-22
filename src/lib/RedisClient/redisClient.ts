import { Redis as RedisClient } from "ioredis";
import { config } from "../../config/config.js";
import logger from "../Logger/logger.js";
import { formatMs } from "../../helpers/format/formatMs.js";

export function createRedisClient(params: {
  redisURI?: string;
  redisClientName: string;
  keyPrefix?: string;
}) {
  const { redisURI = config.REDIS.uri, redisClientName, keyPrefix } = params;
  const parsedRedisURI = new URL(redisURI);
  if (
    typeof parsedRedisURI.port === "string" &&
    !Number.isInteger(
      Number(parsedRedisURI.port) ||
        !Number.isNaN(Number(parsedRedisURI.port)) ||
        Number(parsedRedisURI.port) === 0
    )
  ) {
    throw new Error(`Invalid Redis URI port ${parsedRedisURI.port}`);
  }

  const redisCLient = new RedisClient({
    port: Number(parsedRedisURI.port),
    host: parsedRedisURI.hostname,
    password: parsedRedisURI.password,
    username: parsedRedisURI.username,
    tls:
      parsedRedisURI.protocol === "rediss:"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
    keyPrefix,
    name: redisClientName,
    lazyConnect: true,
  });

  return redisCLient;
}

export const defaultRedisClient = createRedisClient({
  redisURI: config.REDIS.uri,
  redisClientName: "default",
  keyPrefix: "github-actions-stats",
});
defaultRedisClient.on("error", (error) => {
  logger.error(`Redis client error: ${error}`);
});

export async function initDefaultRedisClient() {
  logger.debug("Initializing Redis client");
  const start = performance.now();
  await defaultRedisClient.connect();
  logger.debug(
    `Redis client has been initialized in ${formatMs(
      performance.now() - start
    )}`
  );
  return defaultRedisClient;
}

export async function closeDefaultRedisClient() {
  logger.debug("Closing Redis client");
  const start = performance.now();
  await defaultRedisClient.quit();
  defaultRedisClient.removeAllListeners();
  logger.debug(
    `Redis client has been closed in ${formatMs(performance.now() - start)}`
  );
}

export { defaultRedisClient as redisClient };
export default defaultRedisClient;

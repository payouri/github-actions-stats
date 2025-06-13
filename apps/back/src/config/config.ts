import { config as configDotEnv } from "dotenv";
import { resolve } from "node:path";
import { ENV_CONFIG } from "./env.js";
import { FS_CONFIG } from "./fs.js";
import { GITHUB_CONFIG } from "./github.js";
import { MONGO_CONFIG } from "./mongo.js";
import { OPEN_TELEMETRY_CONFIG } from "./otel.js";
import { QUEUES_CONFIG } from "./queues.js";
import { REDIS_CONFIG } from "./redis.js";
import { SERVER_CONFIG } from "./server.js";

const DOT_ENV_FILE_PATH = resolve(process.cwd(), ".env");

configDotEnv({
	path: DOT_ENV_FILE_PATH,
});

export const config = {
	OTEL: OPEN_TELEMETRY_CONFIG,
	ENV: ENV_CONFIG,
	MONGO: MONGO_CONFIG,
	GITHUB: GITHUB_CONFIG,
	SERVER: SERVER_CONFIG,
	FS: FS_CONFIG,
	REDIS: REDIS_CONFIG,
	QUEUES: QUEUES_CONFIG,
};

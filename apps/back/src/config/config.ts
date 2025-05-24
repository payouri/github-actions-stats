import { config as configDotEnv } from "dotenv";
import { GITHUB_CONFIG } from "./github.js";
import { MONGO_CONFIG } from "./mongo.js";
import { SERVER_CONFIG } from "./server.js";
import { FS_CONFIG } from "./fs.js";
import { resolve } from "path";
import { REDIS_CONFIG } from "./redis.js";
import { ENV_CONFIG } from "./env.js";
import { OPEN_TELEMETRY_CONFIG } from "./otel.js";

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
};

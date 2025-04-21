import { config as configDotEnv } from "dotenv";
console.log(
  configDotEnv({
    // path: "../.env",
  })
);

import { GITHUB_CONFIG } from "./github.js";
import { MONGO_CONFIG } from "./mongo.js";
import { SERVER_CONFIG } from "./server.js";
import { FS_CONFIG } from "./fs.js";

export const config = {
  MONGO: MONGO_CONFIG,
  GITHUB: GITHUB_CONFIG,
  SERVER: SERVER_CONFIG,
  FS: FS_CONFIG,
};

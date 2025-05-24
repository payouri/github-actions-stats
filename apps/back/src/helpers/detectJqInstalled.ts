import { exec } from "node:child_process";
import { promisify } from "node:util";
import logger from "../lib/Logger/logger.js";

const execPromise = promisify(exec);

const jqVersionRegex = /jq-(\d+\.\d+\.\d+)/;
let isJqInstalled: "unknown" | Promise<boolean> | boolean = "unknown";

export async function detectJqInstalled(): Promise<boolean> {
  if (isJqInstalled instanceof Promise) return isJqInstalled;
  if (isJqInstalled === "unknown") {
    isJqInstalled = execPromise("jq --version", {
      shell: "/bin/bash",
      cwd: process.cwd(),
    })
      .then((r) => {
        const version = r.stdout.match(jqVersionRegex)?.[1];
        logger.debug(`jq version is ${version}`);
        return !!version;
      })
      .catch(() => {
        return false;
      });
    await isJqInstalled;
  }
  return isJqInstalled;
}

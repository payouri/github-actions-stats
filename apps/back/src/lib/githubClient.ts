import { Octokit } from "octokit";
import { config } from "../config/config.js";

function createGithubClient() {
  if (!config.GITHUB.token) {
    throw new Error("GITHUB_TOKEN is not set");
  }
  return new Octokit({
    auth: config.GITHUB.token,
  });
}

export default createGithubClient();

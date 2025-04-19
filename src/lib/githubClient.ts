import { Octokit } from "octokit";
import { GITHUB_CONFIG } from "../config/github.js";

function createGithubClient() {
  if (!GITHUB_CONFIG.token) {
    throw new Error("GITHUB_TOKEN is not set");
  }
  return new Octokit({
    auth: GITHUB_CONFIG.token,
  });
}

export default createGithubClient();

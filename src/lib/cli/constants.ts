import type { CommandOption } from "./types.js";

export const GITHUB_TOKEN_OPTION = {
  name: "githubToken",
  description: "Github token",
  required: true,
  paramName: "github-token",
  shortName: "t",
} satisfies CommandOption;

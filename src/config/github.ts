export const GITHUB_CONFIG = {
  get token() {
    return process.env.GITHUB_TOKEN;
  },
} as const;

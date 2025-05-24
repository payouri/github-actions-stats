export const GITHUB_CONFIG = {
  get token() {
    return process.env.GITHUB_TOKEN;
  },
  get webhookSecret() {
    return process.env.GITHUB_WEBHOOK_SECRET;
  },
} as const;

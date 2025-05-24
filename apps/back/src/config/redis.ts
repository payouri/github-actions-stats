export const REDIS_CONFIG = {
  uri: process.env.REDIS_URI || "redis://127.0.0.1:6379/0",
  testUri: process.env.TEST_REDIS_URI || "redis://127.0.0.1:6379/0",
};

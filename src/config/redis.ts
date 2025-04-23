export const REDIS_CONFIG = {
  uri: process.env.REDIS_URI || "redis://localhost:6379",
  testUri: process.env.TEST_REDIS_URI || "redis://localhost:6379",
};

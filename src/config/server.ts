const DEFAULT_PORT = 3000;

export const SERVER_CONFIG = {
  port: Number.isInteger(process.env.PORT)
    ? Number(process.env.PORT)
    : DEFAULT_PORT,
} as const;

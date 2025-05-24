import { join } from "path";

export const FS_CONFIG = {
  directory: process.env.FS_DIRECTORY || join(process.cwd(), "data"),
} as const;

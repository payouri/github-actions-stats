import { access } from "node:fs/promises";

export const isExistingPath = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch (error) {
    return false;
  }
};

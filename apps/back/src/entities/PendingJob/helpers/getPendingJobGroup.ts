import { DEFAULT_PENDING_JOB_GROUP } from "../constants.js";

export function getPendingJobGroup(
  group: string | undefined
): `user_${string}` | typeof DEFAULT_PENDING_JOB_GROUP {
  if (!group) return DEFAULT_PENDING_JOB_GROUP;

  return `user_${group}`;
}

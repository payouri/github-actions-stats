import type { Logger } from "winston";
import type { MongoStorageQueryMethod } from "../types.js";
import defaultLogger from "../../../lib/Logger/logger.js";
import dayjs from "dayjs";
import type { Document, Model } from "mongoose";

export function buildQuery<Result>(dependencies: {
  logger?: Logger;
  model: Model<Result & { key: string } & Document>;
}) {
  const { logger = defaultLogger, model } = dependencies;

  return async function query(
    params: Parameters<MongoStorageQueryMethod<Result>>[0],
    options?: Parameters<MongoStorageQueryMethod<Result>>[1]
  ): ReturnType<MongoStorageQueryMethod<Result>> {
    const {
      workflowName,
      repositoryName,
      repositoryOwner,
      branchName,
      status,
    } = params;
    const { min = dayjs().subtract(1, "year").toDate(), max = new Date() } =
      params.ranAt ?? {};
    const { limit } = options ?? {};
    logger.debug(
      `Querying data for workflow ${workflowName} in repository ${repositoryName} by ${repositoryOwner}`
    );
    const time = performance.now();

    const result = await model
      .find({
        workflowName,
        repositoryName,
        repositoryOwner,
        ...(status ? { status } : {}),
        ...(min || max ? { runAt: { $gte: min, $lte: max } } : {}),
        ...(branchName ? { branchName } : {}),
      })
      .setOptions({ limit })
      .lean()
      .exec();
    const endTime = performance.now();
    logger.debug(
      `Data for workflow ${workflowName} in repository ${repositoryName} by ${repositoryOwner} has been queried in ${
        endTime - time
      }ms`
    );

    return result as Awaited<ReturnType<MongoStorageQueryMethod<Result>>>;
  };
}

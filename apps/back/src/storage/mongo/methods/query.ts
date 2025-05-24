import type { Logger } from "winston";
import type { MongoStorageQueryMethod } from "../types.js";
import defaultLogger from "../../../lib/Logger/logger.js";
import dayjs from "dayjs";
import type { Document, Model } from "mongoose";
import { formatMs } from "../../../helpers/format/formatMs.js";
import { generateWorkflowKey } from "../../../helpers/generateWorkflowKey.js";

export function buildQuery<Result>(dependencies: {
  logger?: Logger;
  model: Model<Result & { key: string } & Document>;
}) {
  const { logger = defaultLogger, model } = dependencies;

  return async function query(
    ...args: Parameters<MongoStorageQueryMethod<Result>>
  ): ReturnType<MongoStorageQueryMethod<Result>> {
    const [params, options] = args;
    const { min = dayjs().subtract(1, "year").toDate(), max = new Date() } =
      params.ranAt ?? {};
    const { limit, sort, projection, session, start } = options ?? {};
    logger.debug(
      "workflowName" in params
        ? `Querying data for workflow ${params.workflowName} in repository ${params.repositoryName} by ${params.repositoryOwner}`
        : `Querying data in collection ${model.modelName}`
    );
    const time = performance.now();

    const result = await model
      .find(
        "workflowName" in params &&
          "repositoryName" in params &&
          "repositoryOwner" in params
          ? {
              workflowKey: generateWorkflowKey({
                workflowName: params.workflowName,
                workflowParams: {
                  owner: params.repositoryOwner,
                  repo: params.repositoryName,
                },
              }),
              ...(params.status ? { status: params.status } : {}),
              ...(min || max ? { runAt: { $gte: min, $lte: max } } : {}),
              ...(params.branchName ? { branchName: params.branchName } : {}),
            }
          : params
      )
      .setOptions({ skip: start, limit, sort, session, projection })
      .lean()
      .exec();
    const endTime = performance.now();
    logger.debug(
      "workflowName" in params
        ? `Data for workflow ${params.workflowName} in repository ${
            params.repositoryName
          } by ${params.repositoryOwner} has been queried in ${formatMs(
            endTime - time
          )}ms`
        : `Data for collection ${
            model.modelName
          } has been queried in ${formatMs(endTime - time)}ms`
    );

    return result as Awaited<ReturnType<MongoStorageQueryMethod<Result>>>;
  };
}

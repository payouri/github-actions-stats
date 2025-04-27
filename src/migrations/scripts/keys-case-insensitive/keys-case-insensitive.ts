import {
  generateWorkflowKey,
  generateWorkflowRunKey,
} from "../../../cli/entities/RetrievedWorkflowData/methods/generateKey.js";
import {
  workflowRunsStorage,
  workflowStorage,
} from "../../../entities/FormattedWorkflow/storage.js";
import logger from "../../../lib/Logger/logger.js";
import {
  generateOldWorkflowKey,
  generateOldWorkflowRunKey,
} from "./snapshot.js";

async function keysCaseInsensitive() {
  logger.info("Running keys-case-insensitive migration script");
  try {
    await Promise.all([workflowStorage.init(), workflowRunsStorage.init()]);

    let updatedCount = 0;
    let updatedRunsCount = 0;
    for await (const workflow of workflowStorage.iterate(
      {},
      {
        projection: { key: 1, workflowName: 1, workflowParams: 1 },
      }
    )) {
      const oldKey = generateOldWorkflowKey(workflow);

      if (workflow.key === oldKey) {
        logger.debug(`Updating workflow key for ${workflow.key}`);
        const { modifiedCount } = await workflowStorage.model.updateOne(
          { key: workflow.key },
          {
            $set: {
              key: generateWorkflowKey(workflow),
            },
          }
        );
        updatedCount += modifiedCount;
      }
      for await (const run of workflowRunsStorage.iterate(
        {
          repositoryName: workflow.workflowParams.repo,
          repositoryOwner: workflow.workflowParams.owner,
          workflowName: workflow.workflowName,
        },
        {
          projection: { key: 1, runId: 1, workflowId: 1 },
        }
      )) {
        const oldKey = generateOldWorkflowRunKey(run);
        const bugKey = `${run.workflowId}_${run.runId}`;

        if (run.key === oldKey || run.key === bugKey) {
          logger.debug(`Updating workflow run key for ${run.key}`);
          const { modifiedCount } = await workflowRunsStorage.model.updateOne(
            { key: run.key },
            {
              $set: {
                key: generateWorkflowRunKey({
                  runId: run.runId,
                  repositoryName: workflow.workflowParams.repo,
                  repositoryOwner: workflow.workflowParams.owner,
                  workflowName: workflow.workflowName,
                  branchName: workflow.workflowParams.branchName,
                }),
              },
            }
          );
          updatedRunsCount += modifiedCount;
        }
        if (updatedRunsCount % 100 === 0) {
          logger.debug(
            `Migration script finished successfully, updated ${updatedCount} workflows and ${updatedRunsCount} workflow runs`
          );
        }
      }
      if (updatedCount % 100 === 0) {
        logger.debug(
          `Migration script finished successfully, updated ${updatedCount} workflows and ${updatedRunsCount} workflow runs`
        );
      }
    }

    logger.info(
      `Migration script finished successfully, updated ${updatedCount} workflows and ${updatedRunsCount} workflow runs`
    );
  } catch (error) {
    logger.error("Migration script failed", error);
    process.exit(1);
  } finally {
    await Promise.all([workflowStorage.close(), workflowRunsStorage.close()]);
  }

  process.exit(0);
}

keysCaseInsensitive();

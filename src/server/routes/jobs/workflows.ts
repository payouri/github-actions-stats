import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createWorkflowInstance } from "../../../entities/RetrievedWorkflowData/methods/createWorkflowInstance.js";
import { getFeaturesModule } from "../../../features/index.js";
import { buildGithubRequests } from "../../../lib/RequestsManager/requests/buildRequests.js";
import githubClient from "../../../lib/githubClient.js";

export function buildJobsWorkflowsRoutes<
  Env extends Record<string, unknown>
>(dependencies: { app: Hono<Env> }) {
  const { app } = dependencies;
  const { getWorkflowInstance, loadWorkflowData, saveWorkflowData } =
    getFeaturesModule();

  app.post("/jobs/workflows", async (c) => {
    const { getRepoWorkflowData } = buildGithubRequests({
      octokit: githubClient.rest,
    });
    const workflowDataResponse = await loadWorkflowData({
      repositoryName: "havresac",
      repositoryOwner: "Waapi-Pro",
      workflowName: "Continous Integration",
    });
    if (workflowDataResponse.hasFailed) {
      const workflowData = await getRepoWorkflowData({
        repositoryName: "havresac",
        repositoryOwner: "Waapi-Pro",
        workflowName: "Continous Integration",
      });
      if (workflowData.hasFailed) {
        const errCode =
          workflowData.error.code === "workflow_not_found" ||
          workflowData.error.code === "repo_not_found"
            ? 404
            : 500;
        throw new HTTPException(errCode, {
          res: new Response(
            errCode === 404 ? "Not Found" : "Internal Server Error",
            {
              status: errCode,
              statusText:
                errCode === 404 ? "Not Found" : "Internal Server Error",
            }
          ),
        });
      }
      await saveWorkflowData({
        repositoryName: workflowData.data.repository.name,
        repositoryOwner: workflowData.data.repository.owner.login,
        workflowName: workflowData.data.workflows.workflow.name,
        workflowData: createWorkflowInstance({
          lastRunAt: new Date(),
          oldestRunAt: new Date(),
          lastUpdatedAt: new Date(),
          totalWorkflowRuns: 0,
          workflowId: workflowData.data.workflows.workflow.id,
          workflowName: workflowData.data.workflows.workflow.name,
          workflowParams: {
            owner: workflowData.data.repository.owner.login,
            repo: workflowData.data.repository.name,
            branchName: workflowData.data.repository.default_branch,
          },
          workflowWeekRunsMap: {},
        }),
      });
    }

    setImmediate(async () => {
      try {
        console.log(
          "getWorkflowInstance",
          await getWorkflowInstance(
            {
              repositoryName: "havresac",
              repositoryOwner: "Waapi-Pro",
              workflowName: "Continous Integration",
            },
            {
              withoutUpdate: false,
            }
          )
        );
        const requests = buildGithubRequests({
          octokit: githubClient.rest,
        });
        // const workflowDataResponse = await requests.getRunData({
        //   owner: "Waapi-Pro",
        //   repo: "havresac",
        //   workflowRunId: 14536034667,
        // });
        // const workflowRunsUsageResponse = buildGetWorkflowRunsUsageRequest({
        //   githubClient: githubClient.rest,
        // });
        // console.log(workflowDataResponse);
        // const a = await workflowRunsUsageResponse({
        //   owner: "Waapi-Pro",
        //   repo: "havresac",
        //   workflowRunIds: [14536034667],
        // });
        // if (a["hasFailed"]) {
        //   console.error(a.error);
        //   return;
        // }
        // console.log(
        //   (
        //     await requests.getWorkflowRunJobs({
        //       owner: "Waapi-Pro",
        //       repo: "havresac",
        //       workflowRunId: 14532652157,
        //     })
        //     // @ts-expect-error lsqkmldqks
        //   ).data.jobs.find((job) => job.id === 40775230137)
        // );
        // console.log(a.data.usage[14536034667].billable.UBUNTU);
      } catch (error) {
        console.error(error);
      }
    });

    return c.json({ message: "Process Started" });
  });
}

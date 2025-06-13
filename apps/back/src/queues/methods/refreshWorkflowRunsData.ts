import { DB } from "../../entities/db.js";
import { AbortError } from "../../errors/AbortError.js";
import githubClient from "../../lib/githubClient.js";
import type {
    DefaultJob,
    DefaultJobDefinition,
} from "../../lib/Queue/types.js";
import type { MethodResult } from "../../types/MethodResult.js";
import { formatRunData } from "../sequenceJobs/populateRunAndCreateStat/format.js";
import { getAllJobs } from "../sequenceJobs/populateRunAndCreateStat/getAllJobs.request.js";

export const REFRESH_WORKFLOW_RUNS_DATA_JOB_NAME = "refresh-workflow-runs-data" as const;

export type RefreshWorkflowRunsDataJobJobName = typeof REFRESH_WORKFLOW_RUNS_DATA_JOB_NAME;
export type RefreshWorkflowRunsDataJobError = "failed_to_refresh_workflow_runs_data" | "abort_signal_aborted" | "failed_to_update_run_data"

export interface RefreshWorkflowRunsData extends DefaultJobDefinition {
    jobName: RefreshWorkflowRunsDataJobJobName;
    jobData: {
        workflowKey: string;
        processedRuns?: number;
    };
    // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
    jobResult: void;
    jobErrorCode: RefreshWorkflowRunsDataJobError
}

export async function refreshWorkflowRunsData(
    params: DefaultJob<RefreshWorkflowRunsData>,
    options?: { abortSignal?: AbortSignal },
): Promise<
    MethodResult<RefreshWorkflowRunsData["jobResult"], RefreshWorkflowRunsData["jobErrorCode"]>
> {
    const { workflowKey, processedRuns: startProcessedRuns = 0 } = params.data;
    const { abortSignal } = options ?? {};

    let processedRuns = startProcessedRuns;
    let hasMoreRuns = true;

    do {
        if (abortSignal?.aborted) {
            return {
                hasFailed: true,
                error: {
                    code: "abort_signal_aborted",
                    message: "Aborted",
                    error: new AbortError({
                        message: "Batch aggregation aborted",
                        signal: abortSignal,
                        abortReason:
                            typeof abortSignal.reason === "string"
                                ? abortSignal.reason
                                : JSON.stringify(abortSignal.reason),
                    }),
                    data: undefined,
                },
            };
        }

        const runs = await DB.queries.getRuns({ workflowKey }, {
            start: processedRuns,
            count: 5,
            sort: {
                type: "startedAt",
                order: "desc",
            },
        })
        if (!runs.length) {
            hasMoreRuns = false;
            continue;
        }

        for (const run of runs) {
            const { runId, repositoryOwner, repositoryName, workflowKey } = run;

            const [allGithubJobs, runUsageDataResponse] = await Promise.all([
                getAllJobs(
                    {
                        repositoryName,
                        repositoryOwner,
                        runId,
                    },
                    { abortSignal },
                ),
                githubClient.rest.actions.getWorkflowRunUsage({
                    owner: repositoryOwner,
                    repo: repositoryName,
                    run_id: runId,
                }),
            ]);

            const addWorkflowRunResult = await DB.mutations.addWorkflowRun({
                workflowKey,
                workflowRun: formatRunData({
                    run,
                    jobs: allGithubJobs,
                    usageData: runUsageDataResponse.data,
                }),
            });

            if (addWorkflowRunResult.hasFailed) {
                return {
                    hasFailed: true,
                    error: {
                        code: "failed_to_update_run_data",
                        message: addWorkflowRunResult.error.code,
                        error: addWorkflowRunResult.error.error,
                        data: addWorkflowRunResult.error.data,
                    },
                };
            }

            return {
                hasFailed: false,
            };
        }

        processedRuns += runs.length;
        await params.updateData({
            workflowKey,
            processedRuns
        })
    } while (hasMoreRuns);


    return {
        hasFailed: false,
    };
}


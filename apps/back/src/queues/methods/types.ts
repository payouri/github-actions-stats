import type {
	PopulateRunAndCreateStat,
	PopulateRunAndCreateStatJobName,
} from "../sequenceJobs/populateRunAndCreateStat/populateRunAndCreateStat.job.js";
import type {
	RetrieveNewRuns,
	RetrieveNewRunsJobJobName,
} from "./retrieveNewRuns.js";
import type {
	RetrieveOldRuns,
	RetrieveOldRunsJobJobName,
} from "./retrieveOldRuns.js";
import type {
	RetrieveWorkflowUpdates,
	RetrieveWorkflowUpdatesJobJobName,
} from "./retrieveWorkflowUpdates.js";

export type JobsMap = {
	[Key in RetrieveNewRunsJobJobName]: RetrieveNewRuns;
} & {
	[Key in RetrieveOldRunsJobJobName]: RetrieveOldRuns;
} & {
	[Key in RetrieveWorkflowUpdatesJobJobName]: RetrieveWorkflowUpdates;
} & {
	[Key in PopulateRunAndCreateStatJobName]: PopulateRunAndCreateStat;
};

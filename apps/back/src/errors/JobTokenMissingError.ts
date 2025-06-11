const JobTokenMissingErrorName = "JobTokenMissingError";

export class JobTokenMissingError extends Error {
	constructor(params: {
		message: string;
		methodName: string;
		jobName: string;
	}) {
		super(params.message);
		this.name = JobTokenMissingErrorName;
	}
}

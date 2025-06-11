const MoveToWaitErrorName = "MoveToWaitError" as const;

export class MoveToWaitError extends Error {
	public jobToken: string;
	public name = MoveToWaitErrorName;
	constructor(params: { message: string; jobToken: string }) {
		super(params.message);
		this.jobToken = params.jobToken;
	}
}

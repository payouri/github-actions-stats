const ReprocessLaterErrorName = "ReprocessLaterError";

export class ReprocessLaterError extends Error {
	public delayMs: number;
	public jobToken: string;

	constructor(params: { message: string; delayMs: number; jobToken: string }) {
		super(params.message);
		this.delayMs = params.delayMs;
		this.name = ReprocessLaterErrorName;
		this.jobToken = params.jobToken;
	}
}

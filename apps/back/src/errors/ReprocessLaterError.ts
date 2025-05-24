const ReprocessLaterErrorName = "ReprocessLaterError";

export class ReprocessLaterError extends Error {
  public delayMs: number;
  constructor(params: { message: string; delayMs: number }) {
    super(params.message);
    this.delayMs = params.delayMs;
    this.name = ReprocessLaterErrorName;
  }
}

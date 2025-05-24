const AbortErrorName = "AbortError";

type AbortErrorReason =
  | "SIGINT"
  | "SIGTERM"
  | "max_duration_reached"
  | "max_data_reached"
  | "signal_aborted"
  | (string & {});

export class AbortError extends Error {
  public readonly signal?: AbortSignal;
  public readonly abortReason: AbortErrorReason;
  constructor(params: {
    message: string;
    signal?: AbortSignal;
    abortReason?: string;
  }) {
    super(params.message);
    this.name = AbortErrorName;
    this.abortReason = params.abortReason || "unknown_reason";
    this.signal = params.signal;
  }
}

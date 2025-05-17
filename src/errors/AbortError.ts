const AbortErrorName = "AbortError";

export class AbortError extends Error {
  constructor(params: {
    message: string;
    signal?: AbortSignal;
    abortReason?: string;
  }) {
    super(params.message);
    this.name = AbortErrorName;
  }
}

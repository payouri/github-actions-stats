export type MethodSuccessResult<Data = void> = Data extends undefined | void
  ? {
      hasFailed: false;
    }
  : {
      hasFailed: false;
      data: Data;
    };

export type MethodErrorResult<
  ErrorCode extends string = string,
  ErrorResult extends Error = Error,
  ErrorData = unknown
> = {
  hasFailed: true;
  error: {
    code: ErrorCode;
    message: string;
    error: ErrorResult;
    data: ErrorData;
  };
};

export type MethodResult<
  Data,
  ErrorCode extends string,
  ErrorResult extends Error = Error,
  ErrorData = unknown
> =
  | MethodSuccessResult<Data>
  | MethodErrorResult<ErrorCode, ErrorResult, ErrorData>;

export type ExtractMethodResult<
  Result extends MethodResult<any, any, any, any>,
  HasFailed extends boolean
> = Result extends MethodResult<any, any, any, any>
  ? Extract<Result, { hasFailed: HasFailed }>
  : never;

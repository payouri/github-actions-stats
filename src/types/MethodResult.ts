export type MethodSucessResult<Data = void> = Data extends undefined | void
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
  | MethodSucessResult<Data>
  | MethodErrorResult<ErrorCode, ErrorResult, ErrorData>;

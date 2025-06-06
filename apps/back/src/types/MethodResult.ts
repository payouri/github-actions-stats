// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
export type MethodSuccessResult<Data> = Data extends undefined | void
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
	ErrorData = unknown,
> = {
	hasFailed: true;
	// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
	error: ErrorData extends undefined | void | unknown
		? {
				code: ErrorCode;
				message: string;
				error: ErrorResult;
				data?: ErrorData;
			}
		: { code: ErrorCode; message: string; error: ErrorResult; data: ErrorData };
};

export type MethodResult<
	Data,
	ErrorCode extends string,
	ErrorResult extends Error = Error,
	ErrorData = unknown,
> =
	| MethodSuccessResult<Data>
	| MethodErrorResult<ErrorCode, ErrorResult, ErrorData>;

export type ExtractMethodResult<
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	Result extends MethodResult<any, any, any, any>,
	HasFailed extends boolean,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
> = Result extends MethodResult<any, any, any, any>
	? Extract<Result, { hasFailed: HasFailed }>
	: never;

import type { initTRPC } from "@trpc/server";

export type TRPCBuilder = typeof initTRPC;

export type ProcedureError<
	Error extends {
		message: string;
		code: string;
		translationKey?: string;
		data?: Record<string | number, unknown>;
	},
> = {
	hasFailed: true;
} & Error;

export type ProcedureSuccess<
	Data extends Record<string | number, unknown> | undefined,
> = Data extends undefined
	? {
			hasFailed: false;
		}
	: {
			hasFailed: false;
			data: Data;
		};

export type AsyncProcedureResponse<
	Data extends Record<string | number, unknown> | undefined,
	Error extends {
		message: string;
		code: string;
		translationKey?: string;
		data?: Record<string | number, unknown>;
	},
> = Promise<ProcedureSuccess<Data> | ProcedureError<Error>>;

export type ProcedureResponse<
	Data extends Record<string | number, unknown> | undefined,
	Error extends {
		message: string;
		code: string;
		translationKey?: string;
		data?: Record<string | number, unknown>;
	},
> = ProcedureSuccess<Data> | ProcedureError<Error>;

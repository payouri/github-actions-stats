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

export type ProcedureSuccess<Data extends unknown | undefined> =
	// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
	Data extends undefined | void
		? {
				hasFailed: false;
			}
		: {
				hasFailed: false;
				data: Data;
			};

export type AsyncProcedureResponse<
	Data extends unknown | undefined,
	Error extends {
		message: string;
		code: string;
		translationKey?: string;
		data?: Record<string | number, unknown>;
	},
> = Promise<ProcedureSuccess<Data> | ProcedureError<Error>>;

export type ProcedureResponse<
	Data extends unknown | undefined,
	Error extends {
		message: string;
		code: string;
		translationKey?: string;
		data?: Record<string | number, unknown>;
	},
> = ProcedureSuccess<Data> | ProcedureError<Error>;

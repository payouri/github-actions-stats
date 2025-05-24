import type { Octokit } from "octokit";
import type { components } from "@octokit/openapi-types";
import type { MethodResult } from "../../../types/MethodResult.js";

export type BuildGetRateLimitRequestDependencies = {
	githubClient: Octokit["rest"];
	onBeforeRequest?: () => Promise<void> | void;
	onAfterRequest?: () => Promise<void> | void;
};
// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
export type GetRateLimitRequestParams = void;
export type GetRateLimitRequestResponse = MethodResult<
	components["schemas"]["rate-limit"],
	"failed_to_get_rate_limit"
>;
export type GetRateLimitRequest = (
	params: GetRateLimitRequestParams,
) => Promise<GetRateLimitRequestResponse>;

export function buildGetRateLimit(
	dependencies: BuildGetRateLimitRequestDependencies,
) {
	const { githubClient, onAfterRequest, onBeforeRequest } = dependencies;
	return async function getRateLimit(
		_: GetRateLimitRequestParams,
	): Promise<GetRateLimitRequestResponse> {
		try {
			await onBeforeRequest?.();
			const response = await githubClient.rateLimit.get();
			await onAfterRequest?.();

			return {
				hasFailed: false,
				data: response.data.rate,
			};
		} catch (err) {
			return {
				hasFailed: true,
				error: {
					code: "failed_to_get_rate_limit",
					message: "Failed to get rate limit",
					error:
						err instanceof Error
							? err
							: new Error("Failed to get rate limit", {
									cause: err,
								}),
					data: undefined,
				},
			};
		}
	};
}

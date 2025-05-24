import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
	{
		root: "apps/**/vitest.config.ts",
		test: {
			globals: true,
		},
	},
	{
		root: "libs/**/vitest.config.ts",
		test: {
			globals: true,
		},
	},
]);

// import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { workspaceRoot } from "@nx/devkit";
import tailwindcssPlugin from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { join } from "node:path";
import { normalizePath } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig({
	root: join(workspaceRoot, "apps/front"),
	plugins: [
		nodePolyfills(),
		react(),
		tailwindcssPlugin(),
		// TanStackRouterVite(),
		viteStaticCopy({
			targets: [
				{
					src: normalizePath(
						join(workspaceRoot, "apps/front/src/assets/locales"),
					),
					dest: normalizePath(join(workspaceRoot, "dist/apps/front")),
				},
			],
		}),
	],
	resolve: {
		alias: {
			"@github-actions-stats/workflow-entity": normalizePath(
				join(workspaceRoot, "libs/entities/Workflow/src/index.ts"),
			),
			"@github-actions-stats/pending-job-entity": normalizePath(
				join(workspaceRoot, "libs/entities/PendingJob/src/index.ts"),
			),
		},
	},
	server: {
		host: "localhost",
		// strictPort: true,
		port: 3000,
		warmup: {
			clientFiles: ["src/**/*.{js,mjs,jsx,ts,tsx}"],
		},
	},
});

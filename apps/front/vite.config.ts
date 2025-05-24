// import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import path, { join } from "node:path";
import { normalizePath } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from "vitest/config";
import tailwindcssPlugin from "@tailwindcss/vite";
import { workspaceRoot } from "@nx/devkit";

// https://vitejs.dev/config/
export default defineConfig({
	root: join(workspaceRoot, "apps/front"),
	plugins: [
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

import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "e2e",
	fullyParallel: false,
	workers: 1,
	timeout: 60_000,
	use: {
		baseURL: "http://localhost:3000",
	},
	webServer: {
		// Invoke vite-node directly instead of `pnpm dev`. pnpm runs the
		// script in its own process group, so Playwright's process-group kill
		// on teardown misses the server and esbuild; they keep the inherited
		// stdout/stderr pipes open and Playwright hangs forever waiting for
		// `close`. Running the binary directly keeps everything in the group
		// Playwright kills.
		command: "node_modules/.bin/vite-node server/index.ts",
		url: "http://localhost:3000",
		reuseExistingServer: true,
		env: { PORT: "3000" },
	},
});

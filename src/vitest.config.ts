import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
	test: {
		globals: true,
		setupFiles: ["./vitest.setup.ts"],
		watch: false,
		reporters: ["dot"],
		silent: true,
		testTimeout: 20_000,
		hookTimeout: 20_000,
	},
	resolve: {
		alias: {
			vscode: path.resolve(__dirname, "./__mocks__/vscode.js"),
			"@blues-code/types": path.resolve(__dirname, "../packages/types/src"),
			"@blues-code/telemetry": path.resolve(__dirname, "../packages/telemetry/src"),
			"@blues-code/cloud": path.resolve(__dirname, "../packages/cloud/src"),
			"@blues-code/build": path.resolve(__dirname, "../packages/build/src"),
		},
	},
})

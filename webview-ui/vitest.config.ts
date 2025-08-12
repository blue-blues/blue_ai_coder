import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		setupFiles: ["./vitest.setup.ts"],
		watch: false,
		reporters: ["dot"],
		silent: true,
		environment: "jsdom",
		include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@src": path.resolve(__dirname, "./src"),
			"@blues": path.resolve(__dirname, "../src/shared"),
			"@blues-code/types": path.resolve(__dirname, "../packages/types/src/index.ts"),
			"@blues-code/telemetry": path.resolve(__dirname, "../packages/telemetry/src/index.ts"),
			"@blues-code/cloud": path.resolve(__dirname, "../packages/cloud/src/index.ts"),
			"@blues-code/ipc": path.resolve(__dirname, "../packages/ipc/src/index.ts"),
		},
	},
})

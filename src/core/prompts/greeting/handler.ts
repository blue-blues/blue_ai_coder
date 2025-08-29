import * as vscode from "vscode"
import type { GreetingContext, GreetingResponse } from "./types"
import type { ModeConfig } from "@blues-code/types"
import { GreetingDetector } from "./detector"
import { GreetingResponseGenerator } from "./response-generator"
import { getModeBySlug } from "../../../shared/modes"
import * as path from "path"

/**
 * Detects greetings and generates contextual responses
 * @param input The user input to analyze
 * @param mode The current mode
 * @param customModes Optional custom modes
 * @param workspacePath Optional workspace path for context
 * @returns GreetingResponse with contextual welcome message if greeting detected
 */
export function detectAndHandleGreeting(
	input: string,
	mode: string,
	customModes?: ModeConfig[],
	workspacePath?: string,
): GreetingResponse {
	// First, detect if this is a greeting
	const detection = GreetingDetector.detect(input)

	if (!detection.isGreeting) {
		return detection
	}

	// Get mode configuration
	const modeConfig = getModeBySlug(mode, customModes)
	if (!modeConfig) {
		return { isGreeting: false, confidence: 0 }
	}

	// Build greeting context
	const context = buildGreetingContext(mode, modeConfig, customModes, workspacePath)

	// Generate contextual response
	const response = GreetingResponseGenerator.generateResponse(context)

	return {
		isGreeting: true,
		confidence: detection.confidence,
		response,
		shouldBypassAI: true,
	}
}

/**
 * Builds greeting context from available information
 */
function buildGreetingContext(
	mode: string,
	modeConfig: ModeConfig,
	customModes?: ModeConfig[],
	workspacePath?: string,
): GreetingContext {
	const context: GreetingContext = {
		mode,
		modeConfig,
		customModes,
	}

	// Add workspace context if available
	if (workspacePath) {
		context.workspacePath = workspacePath
		context.projectName = getProjectName(workspacePath)
		context.projectType = detectProjectType(workspacePath)
		context.hasFiles = checkForFiles(workspacePath)
	}

	return context
}

/**
 * Extracts project name from workspace path
 */
function getProjectName(workspacePath: string): string | undefined {
	try {
		return path.basename(workspacePath)
	} catch {
		return undefined
	}
}

/**
 * Attempts to detect project type based on files in workspace
 */
function detectProjectType(workspacePath: string): string | undefined {
	try {
		// Check for common project files to determine type
		const fs = require("fs")

		if (fs.existsSync(path.join(workspacePath, "package.json"))) {
			const packageJson = JSON.parse(fs.readFileSync(path.join(workspacePath, "package.json"), "utf8"))

			// Check for common frameworks/tools
			const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }

			if (dependencies.react || dependencies["@types/react"]) {
				return "React project"
			}
			if (dependencies.vue || dependencies["@vue/cli"]) {
				return "Vue.js project"
			}
			if (dependencies.angular || dependencies["@angular/core"]) {
				return "Angular project"
			}
			if (dependencies.next || dependencies["next"]) {
				return "Next.js project"
			}
			if (dependencies.express) {
				return "Node.js/Express project"
			}
			if (dependencies.typescript || dependencies["@types/node"]) {
				return "TypeScript project"
			}

			return "Node.js project"
		}

		if (
			fs.existsSync(path.join(workspacePath, "requirements.txt")) ||
			fs.existsSync(path.join(workspacePath, "pyproject.toml"))
		) {
			return "Python project"
		}

		if (fs.existsSync(path.join(workspacePath, "Cargo.toml"))) {
			return "Rust project"
		}

		if (fs.existsSync(path.join(workspacePath, "go.mod"))) {
			return "Go project"
		}

		if (
			fs.existsSync(path.join(workspacePath, "pom.xml")) ||
			fs.existsSync(path.join(workspacePath, "build.gradle"))
		) {
			return "Java project"
		}

		if (fs.existsSync(path.join(workspacePath, "Gemfile"))) {
			return "Ruby project"
		}

		if (fs.existsSync(path.join(workspacePath, "composer.json"))) {
			return "PHP project"
		}

		return undefined
	} catch {
		return undefined
	}
}

/**
 * Checks if the workspace has files (not empty)
 */
function checkForFiles(workspacePath: string): boolean {
	try {
		const fs = require("fs")
		const files = fs.readdirSync(workspacePath)

		// Filter out hidden files and common non-project files
		const projectFiles = files.filter(
			(file: string) =>
				!file.startsWith(".") &&
				file !== "node_modules" &&
				file !== "__pycache__" &&
				file !== "target" &&
				file !== "build" &&
				file !== "dist",
		)

		return projectFiles.length > 0
	} catch {
		return false
	}
}

/**
 * Helper function to get workspace context from VSCode
 */
export function getWorkspaceContext(): string | undefined {
	const workspaceFolders = vscode.workspace.workspaceFolders
	if (workspaceFolders && workspaceFolders.length > 0) {
		return workspaceFolders[0].uri.fsPath
	}
	return undefined
}

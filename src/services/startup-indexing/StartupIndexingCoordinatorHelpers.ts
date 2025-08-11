import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs/promises"
import { BackgroundIndexingService } from "../code-index/BackgroundIndexingService"
import { SchematicAnalyzer } from "../code-index/SchematicAnalyzer"
import { StartupIndexingResult, StartupWorkspaceAnalysis, StartupPhase } from "./StartupIndexingCoordinator"

/**
 * Helper methods for StartupIndexingCoordinator
 */
export class StartupIndexingHelpers {
	/**
	 * Gets all indexable files in a workspace
	 */
	static async getWorkspaceFiles(workspacePath: string): Promise<string[]> {
		const files: string[] = []

		try {
			const entries = await fs.readdir(workspacePath, { withFileTypes: true })

			for (const entry of entries) {
				const fullPath = path.join(workspacePath, entry.name)

				// Skip common ignore patterns
				if (this.shouldIgnoreFile(entry.name)) {
					continue
				}

				if (entry.isDirectory()) {
					const subFiles = await this.getWorkspaceFiles(fullPath)
					files.push(...subFiles)
				} else if (entry.isFile() && this.isIndexableFile(entry.name)) {
					files.push(fullPath)
				}
			}
		} catch (error) {
			console.warn(`Failed to read directory ${workspacePath}:`, error)
		}

		return files
	}

	/**
	 * Checks if a file should be ignored during indexing
	 */
	private static shouldIgnoreFile(fileName: string): boolean {
		const ignorePatterns = [
			"node_modules",
			".git",
			".vscode",
			"dist",
			"build",
			"out",
			".next",
			"coverage",
			".nyc_output",
			"__pycache__",
			".pytest_cache",
			"target",
			"bin",
			"obj",
		]

		return ignorePatterns.some((pattern) => fileName.includes(pattern))
	}

	/**
	 * Checks if a file is indexable based on extension
	 */
	private static isIndexableFile(fileName: string): boolean {
		const indexableExtensions = [
			".ts",
			".tsx",
			".js",
			".jsx",
			".py",
			".java",
			".cpp",
			".c",
			".h",
			".cs",
			".go",
			".rs",
			".php",
			".rb",
			".swift",
			".kt",
			".scala",
			".clj",
			".hs",
			".ml",
			".fs",
			".vb",
			".sql",
			".html",
			".css",
			".scss",
			".less",
			".vue",
			".svelte",
			".md",
			".json",
			".yaml",
			".yml",
		]

		const ext = path.extname(fileName).toLowerCase()
		return indexableExtensions.includes(ext)
	}

	/**
	 * Estimates indexing time for a set of files
	 */
	static async estimateIndexingTime(files: string[], analyzer: SchematicAnalyzer): Promise<number> {
		let totalTime = 0

		// Sample a subset of files for estimation to avoid performance issues
		const sampleSize = Math.min(files.length, 50)
		const sampleFiles = files.slice(0, sampleSize)

		for (const filePath of sampleFiles) {
			try {
				const estimatedTime = await analyzer.estimateProcessingTime(filePath)
				totalTime += estimatedTime
			} catch (error) {
				// Use default estimate on error
				totalTime += 200 // 200ms default
			}
		}

		// Extrapolate to all files
		if (sampleSize < files.length) {
			const averageTime = totalTime / sampleSize
			totalTime = averageTime * files.length
		}

		return Math.round(totalTime)
	}

	/**
	 * Determines workspace complexity based on file count and structure
	 */
	static determineComplexity(
		totalFiles: number,
		processingOrder: { critical: string[]; high: string[]; medium: string[]; low: string[]; minimal: string[] },
	): "low" | "medium" | "high" {
		const criticalCount = processingOrder.critical.length
		const highCount = processingOrder.high.length

		if (totalFiles > 5000 || criticalCount > 50 || highCount > 200) {
			return "high"
		} else if (totalFiles > 1000 || criticalCount > 10 || highCount > 50) {
			return "medium"
		} else {
			return "low"
		}
	}

	/**
	 * Determines indexing recommendation based on workspace characteristics
	 */
	static determineRecommendation(
		totalFiles: number,
		complexity: "low" | "medium" | "high",
		estimatedTime: number,
	): "skip" | "optional" | "recommended" | "mandatory" {
		// Skip for very small workspaces
		if (totalFiles < 10) {
			return "skip"
		}

		// Mandatory for large complex workspaces
		if (complexity === "high" && totalFiles > 2000) {
			return "mandatory"
		}

		// Recommended for medium to large workspaces
		if (totalFiles > 100 || complexity === "medium") {
			return "recommended"
		}

		// Optional for small workspaces
		return "optional"
	}

	/**
	 * Waits for specific jobs to complete with timeout
	 */
	static async waitForJobsCompletion(
		service: BackgroundIndexingService,
		jobIds: string[],
		timeout: number,
	): Promise<boolean> {
		const startTime = Date.now()
		const checkInterval = 500 // Check every 500ms

		return new Promise((resolve) => {
			const checkCompletion = () => {
				const elapsed = Date.now() - startTime

				if (elapsed >= timeout) {
					resolve(false) // Timeout
					return
				}

				// Check if all jobs are completed
				const allCompleted = jobIds.every((jobId) => {
					const job = service.getJob(jobId)
					return job && (job.completedAt !== undefined || job.error !== undefined)
				})

				if (allCompleted) {
					resolve(true)
				} else {
					setTimeout(checkCompletion, checkInterval)
				}
			}

			checkCompletion()
		})
	}

	/**
	 * Compiles final results from indexing phases
	 */
	static compileResults(
		criticalResults: Map<string, boolean>,
		highPriorityResults: Map<string, boolean>,
	): StartupIndexingResult[] {
		const results: StartupIndexingResult[] = []

		// Combine results from both phases
		const allWorkspaces = new Set([...criticalResults.keys(), ...highPriorityResults.keys()])

		for (const workspacePath of allWorkspaces) {
			const criticalSuccess = criticalResults.get(workspacePath) ?? true
			const highPrioritySuccess = highPriorityResults.get(workspacePath) ?? true

			results.push({
				success: criticalSuccess && highPrioritySuccess,
				phase: StartupPhase.COMPLETED,
				indexingCompleted: criticalSuccess && highPrioritySuccess,
				criticalFilesIndexed: criticalSuccess,
				highPriorityFilesIndexed: highPrioritySuccess,
				totalFilesProcessed: 0, // Will be updated by actual processing
				duration: 0, // Will be calculated by coordinator
			})
		}

		return results
	}

	/**
	 * Loads configuration from VSCode settings
	 */
	static loadConfigFromSettings(): Partial<any> {
		const config = vscode.workspace.getConfiguration("bluesCode.startupIndexing")

		return {
			enabled: config.get("enabled", true),
			mandatoryForLargeWorkspaces: config.get("mandatoryForLargeWorkspaces", true),
			maxWorkspaceSizeForAutoStart: config.get("maxWorkspaceSizeForAutoStart", 1000),
			criticalFilesTimeout: config.get("criticalFilesTimeout", 30000),
			highPriorityTimeout: config.get("highPriorityTimeout", 60000),
			showProgressUI: config.get("showProgressUI", true),
			allowSkipAfterTimeout: config.get("allowSkipAfterTimeout", 45000),
			enablePerformanceOptimizations: config.get("enablePerformanceOptimizations", true),
		}
	}

	/**
	 * Logs completion statistics
	 */
	static logCompletionStats(
		results: StartupIndexingResult[],
		outputChannel: vscode.OutputChannel,
		startTime: number,
	): void {
		const totalDuration = Date.now() - startTime
		const successCount = results.filter((r) => r.success).length
		const totalWorkspaces = results.length

		outputChannel.appendLine(
			`[StartupIndexing] Completion stats: ${successCount}/${totalWorkspaces} workspaces indexed successfully in ${totalDuration}ms`,
		)

		for (const result of results) {
			outputChannel.appendLine(
				`[StartupIndexing] Workspace result: success=${result.success}, ` +
					`critical=${result.criticalFilesIndexed}, high=${result.highPriorityFilesIndexed}`,
			)
		}
	}
}

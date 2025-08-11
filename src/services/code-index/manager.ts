import * as vscode from "vscode"
import { getWorkspacePath } from "../../utils/path"
import { ContextProxy } from "../../core/config/ContextProxy"
import { VectorStoreSearchResult } from "./interfaces"
import { IndexingState } from "./interfaces/manager"
import { CodeIndexConfigManager } from "./config-manager"
import { CodeIndexStateManager } from "./state-manager"
import { CodeIndexServiceFactory } from "./service-factory"
import { CodeIndexSearchService } from "./search-service"
import { CodeIndexOrchestrator } from "./orchestrator"
import { CacheManager } from "./cache-manager"
import fs from "fs/promises"
import ignore from "ignore"
import path from "path"
import { t } from "../../i18n"
import { TelemetryService } from "@roo-code/telemetry"
import { TelemetryEventName } from "@roo-code/types"
import {
	IndexRecommendation,
	IndexingEstimate,
	IndexHealthStatus,
	VALIDATION_CONSTANTS,
	INDEXING_PRIORITIES,
	ValidationError,
	ERROR_CODES,
} from "../../types/indexing-validation"

export class CodeIndexManager {
	// --- Singleton Implementation ---
	private static instances = new Map<string, CodeIndexManager>() // Map workspace path to instance

	// Specialized class instances
	private _configManager: CodeIndexConfigManager | undefined
	private readonly _stateManager: CodeIndexStateManager
	private _serviceFactory: CodeIndexServiceFactory | undefined
	private _orchestrator: CodeIndexOrchestrator | undefined
	private _searchService: CodeIndexSearchService | undefined
	private _cacheManager: CacheManager | undefined

	// Flag to prevent race conditions during error recovery
	private _isRecoveringFromError = false

	public static getInstance(context: vscode.ExtensionContext, workspacePath?: string): CodeIndexManager | undefined {
		// If workspacePath is not provided, try to get it from the active editor or first workspace folder
		if (!workspacePath) {
			const activeEditor = vscode.window.activeTextEditor
			if (activeEditor) {
				const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri)
				workspacePath = workspaceFolder?.uri.fsPath
			}

			if (!workspacePath) {
				const workspaceFolders = vscode.workspace.workspaceFolders
				if (!workspaceFolders || workspaceFolders.length === 0) {
					return undefined
				}
				// Use the first workspace folder as fallback
				workspacePath = workspaceFolders[0].uri.fsPath
			}
		}

		if (!CodeIndexManager.instances.has(workspacePath)) {
			CodeIndexManager.instances.set(workspacePath, new CodeIndexManager(workspacePath, context))
		}
		return CodeIndexManager.instances.get(workspacePath)!
	}

	public static disposeAll(): void {
		for (const instance of CodeIndexManager.instances.values()) {
			instance.dispose()
		}
		CodeIndexManager.instances.clear()
	}

	private readonly workspacePath: string
	private readonly context: vscode.ExtensionContext

	// Private constructor for singleton pattern
	private constructor(workspacePath: string, context: vscode.ExtensionContext) {
		this.workspacePath = workspacePath
		this.context = context
		this._stateManager = new CodeIndexStateManager()
	}

	// --- Public API ---

	public get onProgressUpdate() {
		return this._stateManager.onProgressUpdate
	}

	private assertInitialized() {
		if (!this._configManager || !this._orchestrator || !this._searchService || !this._cacheManager) {
			throw new Error("CodeIndexManager not initialized. Call initialize() first.")
		}
	}

	public get state(): IndexingState {
		if (!this.isFeatureEnabled) {
			return "Standby"
		}
		this.assertInitialized()
		return this._orchestrator!.state
	}

	public get isFeatureEnabled(): boolean {
		return this._configManager?.isFeatureEnabled ?? false
	}

	public get isFeatureConfigured(): boolean {
		return this._configManager?.isFeatureConfigured ?? false
	}

	public get isInitialized(): boolean {
		try {
			this.assertInitialized()
			return true
		} catch (error) {
			return false
		}
	}

	/**
	 * Initializes the manager with configuration and dependent services.
	 * Must be called before using any other methods.
	 * @returns Object indicating if a restart is needed
	 */
	public async initialize(contextProxy: ContextProxy): Promise<{ requiresRestart: boolean }> {
		// 1. ConfigManager Initialization and Configuration Loading
		if (!this._configManager) {
			this._configManager = new CodeIndexConfigManager(contextProxy)
		}
		// Load configuration once to get current state and restart requirements
		const { requiresRestart } = await this._configManager.loadConfiguration()

		// 2. Check if feature is enabled
		if (!this.isFeatureEnabled) {
			if (this._orchestrator) {
				this._orchestrator.stopWatcher()
			}
			return { requiresRestart }
		}

		// 3. Check if workspace is available
		const workspacePath = getWorkspacePath()
		if (!workspacePath) {
			this._stateManager.setSystemState("Standby", "No workspace folder open")
			return { requiresRestart }
		}

		// 4. CacheManager Initialization
		if (!this._cacheManager) {
			this._cacheManager = new CacheManager(this.context, this.workspacePath)
			await this._cacheManager.initialize()
		}

		// 4. Determine if Core Services Need Recreation
		const needsServiceRecreation = !this._serviceFactory || requiresRestart

		if (needsServiceRecreation) {
			await this._recreateServices()
		}

		// 5. Handle Indexing Start/Restart
		// The enhanced vectorStore.initialize() in startIndexing() now handles dimension changes automatically
		// by detecting incompatible collections and recreating them, so we rely on that for dimension changes
		const shouldStartOrRestartIndexing =
			requiresRestart ||
			(needsServiceRecreation && (!this._orchestrator || this._orchestrator.state !== "Indexing"))

		if (shouldStartOrRestartIndexing) {
			this._orchestrator?.startIndexing() // This method is async, but we don't await it here
		}

		return { requiresRestart }
	}

	/**
	 * Initiates the indexing process (initial scan and starts watcher).
	 * Automatically recovers from error state if needed before starting.
	 *
	 * @important This method should NEVER be awaited as it starts a long-running background process.
	 * The indexing will continue asynchronously and progress will be reported through events.
	 */
	public async startIndexing(): Promise<void> {
		if (!this.isFeatureEnabled) {
			return
		}

		// Check if we're in error state and recover if needed
		const currentStatus = this.getCurrentStatus()
		if (currentStatus.systemStatus === "Error") {
			await this.recoverFromError()

			// After recovery, we need to reinitialize since recoverFromError clears all services
			// This will be handled by the caller (webviewMessageHandler) checking isInitialized
			return
		}

		this.assertInitialized()
		await this._orchestrator!.startIndexing()
	}

	/**
	 * Starts enhanced indexing with intelligent prioritization and background processing
	 */
	public async startEnhancedIndexing(): Promise<void> {
		if (!this.isFeatureEnabled) {
			return
		}

		// Check if we're in error state and recover if needed
		const currentStatus = this.getCurrentStatus()
		if (currentStatus.systemStatus === "Error") {
			await this.recoverFromError()
			return
		}

		this.assertInitialized()

		// Use enhanced indexing if available, otherwise fall back to standard
		if (typeof this._orchestrator!.startIndexingWithPrioritization === "function") {
			await this._orchestrator!.startIndexingWithPrioritization()
		} else {
			await this._orchestrator!.startIndexing()
		}
	}

	/**
	 * Gets enhanced indexing statistics including performance metrics
	 */
	public getEnhancedIndexingStats(): any {
		if (!this.isInitialized) {
			return null
		}

		if (typeof this._orchestrator!.getEnhancedStats === "function") {
			return this._orchestrator!.getEnhancedStats()
		}

		return null
	}

	/**
	 * Optimizes indexing performance based on current metrics
	 */
	public optimizeIndexingPerformance(): void {
		if (!this.isInitialized) {
			return
		}

		if (typeof this._orchestrator!.optimizeIndexingPerformance === "function") {
			this._orchestrator!.optimizeIndexingPerformance()
		}
	}

	/**
	 * Pauses background processing
	 */
	public pauseBackgroundProcessing(): void {
		if (!this.isInitialized) {
			return
		}

		if (typeof this._orchestrator!.pauseBackgroundProcessing === "function") {
			this._orchestrator!.pauseBackgroundProcessing()
		}
	}

	/**
	 * Resumes background processing
	 */
	public resumeBackgroundProcessing(): void {
		if (!this.isInitialized) {
			return
		}

		if (typeof this._orchestrator!.resumeBackgroundProcessing === "function") {
			this._orchestrator!.resumeBackgroundProcessing()
		}
	}

	/**
	 * Gets background processing status
	 */
	public getBackgroundProcessingStatus(): any {
		if (!this.isInitialized) {
			return {
				isEnabled: false,
				isProcessing: false,
				queueSize: 0,
			}
		}

		if (typeof this._orchestrator!.getBackgroundProcessingStatus === "function") {
			return this._orchestrator!.getBackgroundProcessingStatus()
		}

		return {
			isEnabled: false,
			isProcessing: false,
			queueSize: 0,
		}
	}

	/**
	 * Adds a file to the background processing queue
	 */
	public async addFileToBackgroundQueue(filePath: string, content?: string): Promise<string | null> {
		if (!this.isInitialized) {
			return null
		}

		if (typeof this._orchestrator!.addFileToBackgroundQueue === "function") {
			return await this._orchestrator!.addFileToBackgroundQueue(filePath, content)
		}

		return null
	}

	/**
	 * Stops the file watcher and potentially cleans up resources.
	 */
	public stopWatcher(): void {
		if (!this.isFeatureEnabled) {
			return
		}
		if (this._orchestrator) {
			this._orchestrator.stopWatcher()
		}
	}

	/**
	 * Recovers from error state by clearing the error and resetting internal state.
	 * This allows the manager to be re-initialized after a recoverable error.
	 *
	 * This method clears all service instances (configManager, serviceFactory, orchestrator, searchService)
	 * to force a complete re-initialization on the next operation. This ensures a clean slate
	 * after recovering from errors such as network failures or configuration issues.
	 *
	 * @remarks
	 * - Safe to call even when not in error state (idempotent)
	 * - Does not restart indexing automatically - call initialize() after recovery
	 * - Service instances will be recreated on next initialize() call
	 * - Prevents race conditions from multiple concurrent recovery attempts
	 */
	public async recoverFromError(): Promise<void> {
		// Prevent race conditions from multiple rapid recovery attempts
		if (this._isRecoveringFromError) {
			return
		}

		this._isRecoveringFromError = true
		try {
			// Clear error state
			this._stateManager.setSystemState("Standby", "")
		} catch (error) {
			// Log error but continue with recovery - clearing service instances is more important
			console.error("Failed to clear error state during recovery:", error)
		} finally {
			// Force re-initialization by clearing service instances
			// This ensures a clean slate even if state update failed
			this._configManager = undefined
			this._serviceFactory = undefined
			this._orchestrator = undefined
			this._searchService = undefined

			// Reset the flag after recovery is complete
			this._isRecoveringFromError = false
		}
	}

	/**
	 * Cleans up the manager instance.
	 */
	public dispose(): void {
		if (this._orchestrator) {
			this.stopWatcher()

			// Dispose enhanced services if available
			if (typeof this._orchestrator.dispose === "function") {
				this._orchestrator.dispose()
			}
		}
		this._stateManager.dispose()
	}

	/**
	 * Clears all index data by stopping the watcher, clearing the Qdrant collection,
	 * and deleting the cache file.
	 */
	public async clearIndexData(): Promise<void> {
		if (!this.isFeatureEnabled) {
			return
		}
		this.assertInitialized()
		await this._orchestrator!.clearIndexData()
		await this._cacheManager!.clearCacheFile()
	}

	// --- Indexing Validation Methods ---

	/**
	 * Checks if indexing is recommended for the current workspace
	 * @returns Promise<IndexRecommendation>
	 */
	public async getIndexingRecommendation(): Promise<IndexRecommendation> {
		try {
			const workspaceStats = await this._getWorkspaceStats()
			const currentStatus = this.getCurrentStatus()

			// Determine if indexing should be recommended
			const shouldIndex = this._shouldRecommendIndexing(workspaceStats, currentStatus)

			return {
				shouldIndex,
				reason: this._getRecommendationReason(shouldIndex, workspaceStats, currentStatus),
				priority: this._getRecommendationPriority(workspaceStats, currentStatus),
				workspaceSize: workspaceStats.totalSizeBytes,
				fileCount: workspaceStats.totalFiles,
			}
		} catch (error) {
			throw new ValidationError(
				`Failed to generate indexing recommendation: ${error instanceof Error ? error.message : String(error)}`,
				ERROR_CODES.WORKSPACE_NOT_FOUND,
				{ workspacePath: this.workspacePath },
			)
		}
	}

	/**
	 * Estimates indexing time based on workspace size
	 * @returns Promise<IndexingEstimate>
	 */
	public async estimateIndexingTime(): Promise<IndexingEstimate> {
		try {
			const workspaceStats = await this._getWorkspaceStats()

			// Base estimation: ~100 files per second, with size adjustments
			const baseFilesPerSecond = 100
			const sizeAdjustmentFactor = Math.max(0.5, Math.min(2.0, workspaceStats.averageFileSize / 10000))
			const adjustedFilesPerSecond = baseFilesPerSecond * sizeAdjustmentFactor

			const estimatedTimeMs = (workspaceStats.indexableFiles / adjustedFilesPerSecond) * 1000

			// Confidence decreases for very large or very small workspaces
			let confidence = 0.8
			if (workspaceStats.indexableFiles < 10) confidence = 0.6
			if (workspaceStats.indexableFiles > 10000) confidence = 0.5

			return {
				estimatedTimeMs: Math.max(1000, estimatedTimeMs), // Minimum 1 second
				estimatedFiles: workspaceStats.indexableFiles,
				confidence,
			}
		} catch (error) {
			throw new ValidationError(
				`Failed to estimate indexing time: ${error instanceof Error ? error.message : String(error)}`,
				ERROR_CODES.WORKSPACE_NOT_FOUND,
				{ workspacePath: this.workspacePath },
			)
		}
	}

	/**
	 * Validates current index health and completeness
	 * @returns Promise<IndexHealthStatus>
	 */
	public async validateIndexHealth(): Promise<IndexHealthStatus> {
		try {
			if (!this.isFeatureEnabled || !this.isInitialized) {
				return {
					isHealthy: false,
					completeness: 0,
					issues: ["Indexing feature is not enabled or initialized"],
				}
			}

			const currentStatus = this.getCurrentStatus()
			const workspaceStats = await this._getWorkspaceStats()

			// Check if we have cache data to determine completeness
			let completeness = 0
			let lastIndexed: Date | undefined
			const issues: string[] = []

			if (this._cacheManager) {
				try {
					const cacheStats = await this._cacheManager.getCacheStats()
					if (cacheStats) {
						completeness = Math.min(1.0, cacheStats.totalEntries / workspaceStats.indexableFiles)
						lastIndexed = cacheStats.lastModified
					}
				} catch (error) {
					issues.push("Unable to read cache statistics")
				}
			}

			// Determine health based on status and completeness
			const isHealthy =
				currentStatus.systemStatus === "Indexed" &&
				completeness >= VALIDATION_CONSTANTS.MIN_INDEX_COMPLETENESS &&
				issues.length === 0

			// Add issues based on current state
			if (currentStatus.systemStatus === "Error") {
				issues.push(`Indexing error: ${currentStatus.systemMessage}`)
			}

			if (completeness < VALIDATION_CONSTANTS.MIN_INDEX_COMPLETENESS) {
				issues.push(`Index completeness below threshold: ${Math.round(completeness * 100)}%`)
			}

			return {
				isHealthy,
				completeness,
				lastIndexed,
				issues: issues.length > 0 ? issues : undefined,
			}
		} catch (error) {
			return {
				isHealthy: false,
				completeness: 0,
				issues: [`Health validation failed: ${error instanceof Error ? error.message : String(error)}`],
			}
		}
	}

	// --- Private Validation Helpers ---

	private async _getWorkspaceStats() {
		const workspacePath = getWorkspacePath()
		if (!workspacePath) {
			throw new Error("No workspace path available")
		}

		let totalFiles = 0
		let indexableFiles = 0
		let totalSizeBytes = 0
		const fileSizes: number[] = []

		// Create ignore instance for filtering
		const ignoreInstance = ignore()
		const ignorePath = path.join(workspacePath, ".gitignore")

		try {
			const content = await fs.readFile(ignorePath, "utf8")
			ignoreInstance.add(content)
			ignoreInstance.add(".gitignore")
		} catch (error) {
			// .gitignore doesn't exist, continue without it
		}

		// Recursively scan workspace
		await this._scanDirectory(workspacePath, workspacePath, ignoreInstance, (filePath, stats) => {
			totalFiles++
			totalSizeBytes += stats.size
			fileSizes.push(stats.size)

			// Check if file would be indexed (basic heuristic)
			const ext = path.extname(filePath).toLowerCase()
			const indexableExtensions = [
				".ts",
				".js",
				".tsx",
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
				".txt",
				".json",
				".xml",
				".yaml",
				".yml",
				".toml",
				".ini",
				".cfg",
				".conf",
			]

			if (indexableExtensions.includes(ext) && stats.size < 1024 * 1024) {
				// Skip files > 1MB
				indexableFiles++
			}
		})

		const averageFileSize = fileSizes.length > 0 ? fileSizes.reduce((a, b) => a + b, 0) / fileSizes.length : 0

		return {
			totalFiles,
			indexableFiles,
			totalSizeBytes,
			averageFileSize,
		}
	}

	private async _scanDirectory(
		dirPath: string,
		workspacePath: string,
		ignoreInstance: any,
		onFile: (filePath: string, stats: any) => void,
	): Promise<void> {
		try {
			const entries = await fs.readdir(dirPath, { withFileTypes: true })

			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry.name)
				const relativePath = path.relative(workspacePath, fullPath)

				// Skip if ignored
				if (ignoreInstance.ignores(relativePath)) {
					continue
				}

				if (entry.isDirectory()) {
					// Skip common non-source directories
					if (
						["node_modules", ".git", "dist", "build", ".next", ".nuxt", "target", "bin", "obj"].includes(
							entry.name,
						)
					) {
						continue
					}
					await this._scanDirectory(fullPath, workspacePath, ignoreInstance, onFile)
				} else if (entry.isFile()) {
					const stats = await fs.stat(fullPath)
					onFile(fullPath, stats)
				}
			}
		} catch (error) {
			// Skip directories we can't read
			console.warn(`Unable to scan directory ${dirPath}:`, error)
		}
	}

	private _shouldRecommendIndexing(workspaceStats: any, currentStatus: any): boolean {
		// Don't recommend if already indexed and healthy
		if (currentStatus.systemStatus === "Indexed") {
			return false
		}

		// Don't recommend if currently indexing
		if (currentStatus.systemStatus === "Indexing") {
			return false
		}

		// Recommend if workspace has a reasonable number of indexable files
		return workspaceStats.indexableFiles >= 10
	}

	private _getRecommendationReason(shouldIndex: boolean, workspaceStats: any, currentStatus: any): string {
		if (!shouldIndex) {
			if (currentStatus.systemStatus === "Indexed") {
				return "Workspace is already indexed and ready for enhanced search capabilities"
			}
			if (currentStatus.systemStatus === "Indexing") {
				return "Indexing is currently in progress"
			}
			if (workspaceStats.indexableFiles < 10) {
				return "Workspace has too few files to benefit significantly from indexing"
			}
		}

		if (workspaceStats.indexableFiles > VALIDATION_CONSTANTS.LARGE_WORKSPACE_THRESHOLD) {
			return `Large workspace with ${workspaceStats.indexableFiles} files will benefit greatly from indexing for faster code search`
		}

		return `Workspace with ${workspaceStats.indexableFiles} files will benefit from indexing for enhanced AI assistance`
	}

	private _getRecommendationPriority(workspaceStats: any, currentStatus: any): "high" | "medium" | "low" {
		if (currentStatus.systemStatus === "Indexed") {
			return "low"
		}

		if (workspaceStats.indexableFiles > VALIDATION_CONSTANTS.LARGE_WORKSPACE_THRESHOLD) {
			return "high"
		}

		if (workspaceStats.indexableFiles > 100) {
			return "medium"
		}

		return "low"
	}

	// --- Private Helpers ---

	public getCurrentStatus() {
		const status = this._stateManager.getCurrentStatus()
		return {
			...status,
			workspacePath: this.workspacePath,
		}
	}

	public async searchIndex(query: string, directoryPrefix?: string): Promise<VectorStoreSearchResult[]> {
		if (!this.isFeatureEnabled) {
			return []
		}
		this.assertInitialized()
		return this._searchService!.searchIndex(query, directoryPrefix)
	}

	/**
	 * Private helper method to recreate services with current configuration.
	 * Used by both initialize() and handleSettingsChange().
	 */
	private async _recreateServices(): Promise<void> {
		// Stop watcher if it exists
		if (this._orchestrator) {
			this.stopWatcher()
		}
		// Clear existing services to ensure clean state
		this._orchestrator = undefined
		this._searchService = undefined

		// (Re)Initialize service factory
		this._serviceFactory = new CodeIndexServiceFactory(
			this._configManager!,
			this.workspacePath,
			this._cacheManager!,
		)

		const ignoreInstance = ignore()
		const workspacePath = getWorkspacePath()

		if (!workspacePath) {
			this._stateManager.setSystemState("Standby", "")
			return
		}

		const ignorePath = path.join(workspacePath, ".gitignore")
		try {
			const content = await fs.readFile(ignorePath, "utf8")
			ignoreInstance.add(content)
			ignoreInstance.add(".gitignore")
		} catch (error) {
			// Should never happen: reading file failed even though it exists
			console.error("Unexpected error loading .gitignore:", error)
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "_recreateServices",
			})
		}

		// (Re)Create shared service instances
		const { embedder, vectorStore, parser, scanner, fileWatcher } = this._serviceFactory.createServices(
			this.context,
			this._cacheManager!,
			ignoreInstance,
		)

		// Validate embedder configuration before proceeding
		const validationResult = await this._serviceFactory.validateEmbedder(embedder)
		if (!validationResult.valid) {
			const errorMessage = validationResult.error || "Embedder configuration validation failed"
			this._stateManager.setSystemState("Error", errorMessage)
			throw new Error(errorMessage)
		}

		// (Re)Initialize orchestrator with enhanced services
		this._orchestrator = new CodeIndexOrchestrator(
			this._configManager!,
			this._stateManager,
			this.workspacePath,
			this._cacheManager!,
			vectorStore,
			scanner,
			fileWatcher,
			parser, // Pass code parser for enhanced services
			embedder, // Pass embedder for enhanced services
		)

		// (Re)Initialize search service
		this._searchService = new CodeIndexSearchService(
			this._configManager!,
			this._stateManager,
			embedder,
			vectorStore,
		)

		// Clear any error state after successful recreation
		this._stateManager.setSystemState("Standby", "")
	}

	/**
	 * Handle code index settings changes.
	 * This method should be called when code index settings are updated
	 * to ensure the CodeIndexConfigManager picks up the new configuration.
	 * If the configuration changes require a restart, the service will be restarted.
	 */
	public async handleSettingsChange(): Promise<void> {
		if (this._configManager) {
			const { requiresRestart } = await this._configManager.loadConfiguration()

			const isFeatureEnabled = this.isFeatureEnabled
			const isFeatureConfigured = this.isFeatureConfigured

			// If feature is disabled, stop the service
			if (!isFeatureEnabled) {
				// Stop the orchestrator if it exists
				if (this._orchestrator) {
					this._orchestrator.stopWatcher()
				}
				// Set state to indicate service is disabled
				this._stateManager.setSystemState("Standby", "Code indexing is disabled")
				return
			}

			if (requiresRestart && isFeatureEnabled && isFeatureConfigured) {
				try {
					// Ensure cacheManager is initialized before recreating services
					if (!this._cacheManager) {
						this._cacheManager = new CacheManager(this.context, this.workspacePath)
						await this._cacheManager.initialize()
					}

					// Recreate services with new configuration
					await this._recreateServices()
				} catch (error) {
					// Error state already set in _recreateServices
					console.error("Failed to recreate services:", error)
					TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
						error: error instanceof Error ? error.message : String(error),
						stack: error instanceof Error ? error.stack : undefined,
						location: "handleSettingsChange",
					})
					// Re-throw the error so the caller knows validation failed
					throw error
				}
			}
		}
	}
}

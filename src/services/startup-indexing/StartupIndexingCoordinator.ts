import * as vscode from "vscode"
import { EventEmitter } from "events"
import * as path from "path"
import * as fs from "fs/promises"
import { CodeIndexManager } from "../code-index/manager"
import { SchematicAnalyzer, ImportanceLevel } from "../code-index/SchematicAnalyzer"
import { BackgroundIndexingService, ProcessingPriority } from "../code-index/BackgroundIndexingService"
import { PerformanceMonitor } from "../code-index/PerformanceMonitor"
import { TelemetryService } from "@blues-code/telemetry"
import { TelemetryEventName } from "@blues-code/types"
import { StartupIndexingHelpers } from "./StartupIndexingCoordinatorHelpers"
import { StartupIndexingErrorHandler, StartupIndexingErrorContext } from "./StartupIndexingErrorHandler"
import { StartupIndexingMonitor, StartupIndexingMetrics } from "./StartupIndexingMonitor"

/**
 * Startup indexing phases
 */
export enum StartupPhase {
	INITIALIZING = "initializing",
	ANALYZING_WORKSPACE = "analyzing_workspace",
	INDEXING_CRITICAL = "indexing_critical",
	INDEXING_HIGH_PRIORITY = "indexing_high_priority",
	ENABLING_INTERACTION = "enabling_interaction",
	BACKGROUND_COMPLETION = "background_completion",
	COMPLETED = "completed",
	ERROR = "error",
}

/**
 * Startup indexing configuration
 */
export interface StartupIndexingConfig {
	enabled: boolean
	mandatoryForLargeWorkspaces: boolean
	maxWorkspaceSizeForAutoStart: number // files
	criticalFilesTimeout: number // ms
	highPriorityTimeout: number // ms
	showProgressUI: boolean
	allowSkipAfterTimeout: number // ms
	enablePerformanceOptimizations: boolean
}

/**
 * Workspace analysis result for startup decisions
 */
export interface StartupWorkspaceAnalysis {
	totalFiles: number
	estimatedIndexingTime: number
	requiresMandatoryIndexing: boolean
	criticalFiles: string[]
	highPriorityFiles: string[]
	complexity: "low" | "medium" | "high"
	recommendation: "skip" | "optional" | "recommended" | "mandatory"
}

/**
 * Startup indexing progress information
 */
export interface StartupProgress {
	phase: StartupPhase
	overallProgress: number // 0-100
	currentFile?: string
	filesProcessed: number
	totalFiles: number
	estimatedTimeRemaining: number
	canSkip: boolean
	canCancel: boolean
	message: string
}

/**
 * Startup indexing result
 */
export interface StartupIndexingResult {
	success: boolean
	phase: StartupPhase
	indexingCompleted: boolean
	criticalFilesIndexed: boolean
	highPriorityFilesIndexed: boolean
	totalFilesProcessed: number
	duration: number
	error?: Error
}

/**
 * Default startup indexing configuration
 */
const DEFAULT_CONFIG: StartupIndexingConfig = {
	enabled: true,
	mandatoryForLargeWorkspaces: true,
	maxWorkspaceSizeForAutoStart: 1000,
	criticalFilesTimeout: 30000, // 30 seconds
	highPriorityTimeout: 60000, // 1 minute
	showProgressUI: true,
	allowSkipAfterTimeout: 45000, // 45 seconds
	enablePerformanceOptimizations: true,
}

/**
 * StartupIndexingCoordinator manages the complete startup indexing lifecycle
 * ensuring maximum context is available before user interaction
 */
export class StartupIndexingCoordinator extends EventEmitter {
	private config: StartupIndexingConfig
	private currentPhase: StartupPhase = StartupPhase.INITIALIZING
	private startTime: number = 0
	private workspaceAnalysis: Map<string, StartupWorkspaceAnalysis> = new Map()
	private indexingResults: Map<string, StartupIndexingResult> = new Map()
	private progressTimer: NodeJS.Timeout | null = null
	private isBlocking: boolean = false
	private errorHandler: StartupIndexingErrorHandler
	private monitor: StartupIndexingMonitor
	private retryCount: number = 0

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly outputChannel: vscode.OutputChannel,
		config?: Partial<StartupIndexingConfig>,
	) {
		super()
		this.config = { ...DEFAULT_CONFIG, ...config }
		this.errorHandler = new StartupIndexingErrorHandler(outputChannel)
		this.monitor = new StartupIndexingMonitor(outputChannel)
		this.loadConfigFromSettings()
	}

	/**
	 * Main entry point for startup indexing coordination
	 */
	async coordinateStartupIndexing(
		codeIndexManagers: CodeIndexManager[],
		schematicAnalyzers: SchematicAnalyzer[],
		backgroundIndexingServices: BackgroundIndexingService[],
	): Promise<StartupIndexingResult[]> {
		this.startTime = Date.now()
		this.outputChannel.appendLine("[StartupIndexing] Beginning startup indexing coordination")

		try {
			// Phase 1: Analyze all workspaces
			await this.setPhase(StartupPhase.ANALYZING_WORKSPACE)
			const workspaceAnalyses = await this.analyzeWorkspaces(codeIndexManagers, schematicAnalyzers)

			// Start monitoring
			this.monitor.startMonitoring(this.config, workspaceAnalyses)

			// Determine if we need to block user interaction
			const requiresBlocking = this.shouldBlockUserInteraction(workspaceAnalyses)

			if (requiresBlocking) {
				this.isBlocking = true
				this.emit("blockingStarted", workspaceAnalyses)
			}

			// Phase 2: Index critical files first
			await this.setPhase(StartupPhase.INDEXING_CRITICAL)
			const criticalResults = await this.indexCriticalFiles(
				codeIndexManagers,
				backgroundIndexingServices,
				workspaceAnalyses,
			)

			// Phase 3: Index high priority files
			await this.setPhase(StartupPhase.INDEXING_HIGH_PRIORITY)
			const highPriorityResults = await this.indexHighPriorityFiles(
				codeIndexManagers,
				backgroundIndexingServices,
				workspaceAnalyses,
			)

			// Phase 4: Enable user interaction
			await this.setPhase(StartupPhase.ENABLING_INTERACTION)
			this.isBlocking = false
			this.emit("interactionEnabled", {
				criticalCompleted: true,
				highPriorityCompleted: true,
				backgroundContinuing: true,
			})

			// Phase 5: Continue background indexing
			await this.setPhase(StartupPhase.BACKGROUND_COMPLETION)
			this.startBackgroundCompletion(backgroundIndexingServices)

			// Phase 6: Mark as completed
			await this.setPhase(StartupPhase.COMPLETED)

			const results = StartupIndexingHelpers.compileResults(criticalResults, highPriorityResults)
			StartupIndexingHelpers.logCompletionStats(results, this.outputChannel, this.startTime)

			// Complete monitoring and get final metrics
			const finalMetrics = this.monitor.completeMonitoring(results)
			this.emit("monitoringCompleted", finalMetrics)

			return results
		} catch (error) {
			await this.setPhase(StartupPhase.ERROR)

			// Create error context for recovery
			const errorContext: StartupIndexingErrorContext = {
				phase: this.currentPhase,
				elapsedTime: Date.now() - this.startTime,
				retryCount: this.retryCount,
				config: this.config,
				systemInfo: await this.getSystemInfo(),
			}

			// Record error in monitoring
			this.monitor.onError(error, this.currentPhase, true)

			// Attempt error recovery
			const recoveryResult = await this.errorHandler.handleError(error, errorContext)

			if (recoveryResult.success && recoveryResult.shouldContinue) {
				// Apply any configuration modifications
				if (recoveryResult.modifiedConfig) {
					this.updateConfig(recoveryResult.modifiedConfig)
				}

				// Retry if appropriate
				if (recoveryResult.strategy === "retry_with_backoff" && this.retryCount < 3) {
					this.retryCount++
					this.outputChannel.appendLine(
						`[StartupIndexing] Retrying coordination (attempt ${this.retryCount})`,
					)
					return this.coordinateStartupIndexing(
						codeIndexManagers,
						schematicAnalyzers,
						backgroundIndexingServices,
					)
				}
			}

			this.outputChannel.appendLine(`[StartupIndexing] Error during coordination: ${error.message}`)

			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error.message,
				phase: this.currentPhase,
				duration: Date.now() - this.startTime,
				recoveryStrategy: recoveryResult.strategy,
				recoverySuccess: recoveryResult.success,
			})

			// Enable interaction even on error
			this.isBlocking = false
			this.emit("interactionEnabled", {
				criticalCompleted: false,
				highPriorityCompleted: false,
				backgroundContinuing: false,
				error: error.message,
				recoveryApplied: recoveryResult.success,
			})

			// Only throw if recovery failed completely
			if (!recoveryResult.success) {
				throw error
			}

			// Return partial results if recovery succeeded
			return []
		} finally {
			this.cleanup()
		}
	}

	/**
	 * Analyzes all workspaces to determine indexing requirements
	 */
	private async analyzeWorkspaces(
		codeIndexManagers: CodeIndexManager[],
		schematicAnalyzers: SchematicAnalyzer[],
	): Promise<StartupWorkspaceAnalysis[]> {
		const analyses: StartupWorkspaceAnalysis[] = []

		for (let i = 0; i < codeIndexManagers.length; i++) {
			const manager = codeIndexManagers[i]
			const analyzer = schematicAnalyzers[i]

			try {
				const analysis = await this.analyzeWorkspace(manager, analyzer)
				analyses.push(analysis)
				this.workspaceAnalysis.set(manager.workspacePath, analysis)

				this.outputChannel.appendLine(
					`[StartupIndexing] Workspace analysis for ${manager.workspacePath}: ` +
						`${analysis.totalFiles} files, ${analysis.recommendation} indexing`,
				)
			} catch (error) {
				this.outputChannel.appendLine(
					`[StartupIndexing] Failed to analyze workspace ${manager.workspacePath}: ${error.message}`,
				)
			}
		}

		return analyses
	}

	/**
	 * Analyzes a single workspace for startup indexing requirements
	 */
	private async analyzeWorkspace(
		manager: CodeIndexManager,
		analyzer: SchematicAnalyzer,
	): Promise<StartupWorkspaceAnalysis> {
		// Get current index status
		const currentStatus = manager.getCurrentStatus()
		const isIndexed = currentStatus.systemStatus === "Indexed"

		// If already indexed and healthy, minimal work needed
		if (isIndexed) {
			return {
				totalFiles: 0,
				estimatedIndexingTime: 0,
				requiresMandatoryIndexing: false,
				criticalFiles: [],
				highPriorityFiles: [],
				complexity: "low",
				recommendation: "skip",
			}
		}

		// Get workspace files for analysis
		const workspaceFiles = await StartupIndexingHelpers.getWorkspaceFiles(manager.workspacePath)
		const totalFiles = workspaceFiles.length

		// Analyze file priorities using SchematicAnalyzer
		const processingOrder = await analyzer.getOptimalProcessingOrder(workspaceFiles)

		// Estimate indexing time
		const estimatedTime = await StartupIndexingHelpers.estimateIndexingTime(workspaceFiles, analyzer)

		// Determine complexity and recommendation
		const complexity = StartupIndexingHelpers.determineComplexity(totalFiles, processingOrder)
		const recommendation = StartupIndexingHelpers.determineRecommendation(totalFiles, complexity, estimatedTime)

		return {
			totalFiles,
			estimatedIndexingTime: estimatedTime,
			requiresMandatoryIndexing: recommendation === "mandatory",
			criticalFiles: processingOrder.critical,
			highPriorityFiles: processingOrder.high,
			complexity,
			recommendation,
		}
	}

	/**
	 * Determines if user interaction should be blocked
	 */
	private shouldBlockUserInteraction(analyses: StartupWorkspaceAnalysis[]): boolean {
		if (!this.config.enabled) return false

		return analyses.some((analysis) => {
			// Always block for mandatory indexing
			if (analysis.requiresMandatoryIndexing) return true

			// Block for large workspaces if configured
			if (
				this.config.mandatoryForLargeWorkspaces &&
				analysis.totalFiles > this.config.maxWorkspaceSizeForAutoStart
			) {
				return true
			}

			// Block if we have critical files that need indexing
			return analysis.criticalFiles.length > 0 && analysis.recommendation !== "skip"
		})
	}

	/**
	 * Indexes critical files with high priority
	 */
	private async indexCriticalFiles(
		managers: CodeIndexManager[],
		backgroundServices: BackgroundIndexingService[],
		analyses: StartupWorkspaceAnalysis[],
	): Promise<Map<string, boolean>> {
		const results = new Map<string, boolean>()
		const timeout = this.config.criticalFilesTimeout

		for (let i = 0; i < managers.length; i++) {
			const manager = managers[i]
			const service = backgroundServices[i]
			const analysis = analyses[i]

			if (analysis.criticalFiles.length === 0) {
				results.set(manager.workspacePath, true)
				continue
			}

			try {
				this.outputChannel.appendLine(
					`[StartupIndexing] Indexing ${analysis.criticalFiles.length} critical files for ${manager.workspacePath}`,
				)

				// Add critical files to queue with immediate priority
				const jobIds = await service.addBatchToQueue(analysis.criticalFiles, ProcessingPriority.IMMEDIATE)

				// Wait for completion with timeout
				const completed = await StartupIndexingHelpers.waitForJobsCompletion(service, jobIds, timeout)
				results.set(manager.workspacePath, completed)

				if (completed) {
					this.outputChannel.appendLine(
						`[StartupIndexing] Critical files indexing completed for ${manager.workspacePath}`,
					)
				} else {
					this.outputChannel.appendLine(
						`[StartupIndexing] Critical files indexing timed out for ${manager.workspacePath}`,
					)
				}
			} catch (error) {
				this.outputChannel.appendLine(
					`[StartupIndexing] Error indexing critical files for ${manager.workspacePath}: ${error.message}`,
				)
				results.set(manager.workspacePath, false)
			}
		}

		return results
	}

	/**
	 * Indexes high priority files
	 */
	private async indexHighPriorityFiles(
		managers: CodeIndexManager[],
		backgroundServices: BackgroundIndexingService[],
		analyses: StartupWorkspaceAnalysis[],
	): Promise<Map<string, boolean>> {
		const results = new Map<string, boolean>()
		const timeout = this.config.highPriorityTimeout

		for (let i = 0; i < managers.length; i++) {
			const manager = managers[i]
			const service = backgroundServices[i]
			const analysis = analyses[i]

			if (analysis.highPriorityFiles.length === 0) {
				results.set(manager.workspacePath, true)
				continue
			}

			try {
				this.outputChannel.appendLine(
					`[StartupIndexing] Indexing ${analysis.highPriorityFiles.length} high priority files for ${manager.workspacePath}`,
				)

				// Add high priority files to queue
				const jobIds = await service.addBatchToQueue(analysis.highPriorityFiles, ProcessingPriority.HIGH)

				// Wait for completion with timeout
				const completed = await StartupIndexingHelpers.waitForJobsCompletion(service, jobIds, timeout)
				results.set(manager.workspacePath, completed)

				if (completed) {
					this.outputChannel.appendLine(
						`[StartupIndexing] High priority files indexing completed for ${manager.workspacePath}`,
					)
				} else {
					this.outputChannel.appendLine(
						`[StartupIndexing] High priority files indexing timed out for ${manager.workspacePath}`,
					)
				}
			} catch (error) {
				this.outputChannel.appendLine(
					`[StartupIndexing] Error indexing high priority files for ${manager.workspacePath}: ${error.message}`,
				)
				results.set(manager.workspacePath, false)
			}
		}

		return results
	}

	/**
	 * Starts background completion of remaining files
	 */
	private startBackgroundCompletion(backgroundServices: BackgroundIndexingService[]): void {
		for (const service of backgroundServices) {
			// Background services will continue processing remaining files
			// at normal and low priorities
			service.resumeProcessing()
		}

		this.outputChannel.appendLine("[StartupIndexing] Background indexing completion started")
	}

	/**
	 * Sets the current phase and emits progress updates
	 */
	private async setPhase(phase: StartupPhase): Promise<void> {
		// Complete previous phase monitoring
		if (this.currentPhase !== StartupPhase.INITIALIZING) {
			this.monitor.onPhaseComplete(this.currentPhase)
		}

		this.currentPhase = phase
		this.outputChannel.appendLine(`[StartupIndexing] Phase: ${phase}`)

		// Start new phase monitoring
		this.monitor.onPhaseStart(phase)

		const progress = this.calculateProgress()
		this.emit("phaseChanged", phase, progress)

		// Emit telemetry for phase changes
		TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_PROGRESS, {
			phase,
			progress: progress.overallProgress,
			duration: Date.now() - this.startTime,
		})
	}

	/**
	 * Calculates current progress based on phase
	 */
	private calculateProgress(): StartupProgress {
		const elapsed = Date.now() - this.startTime
		let overallProgress = 0
		let message = ""
		let canSkip = false
		let canCancel = true

		switch (this.currentPhase) {
			case StartupPhase.INITIALIZING:
				overallProgress = 5
				message = "Initializing startup indexing..."
				break
			case StartupPhase.ANALYZING_WORKSPACE:
				overallProgress = 15
				message = "Analyzing workspace structure..."
				break
			case StartupPhase.INDEXING_CRITICAL:
				overallProgress = 40
				message = "Indexing critical files..."
				canSkip = elapsed > this.config.allowSkipAfterTimeout
				break
			case StartupPhase.INDEXING_HIGH_PRIORITY:
				overallProgress = 70
				message = "Indexing high priority files..."
				canSkip = true
				break
			case StartupPhase.ENABLING_INTERACTION:
				overallProgress = 90
				message = "Enabling user interaction..."
				canSkip = false
				canCancel = false
				break
			case StartupPhase.BACKGROUND_COMPLETION:
				overallProgress = 95
				message = "Completing background indexing..."
				canSkip = false
				canCancel = false
				break
			case StartupPhase.COMPLETED:
				overallProgress = 100
				message = "Startup indexing completed"
				canSkip = false
				canCancel = false
				break
			case StartupPhase.ERROR:
				overallProgress = 0
				message = "Startup indexing encountered an error"
				canSkip = true
				canCancel = true
				break
		}

		return {
			phase: this.currentPhase,
			overallProgress,
			currentFile: undefined,
			filesProcessed: 0,
			totalFiles: 0,
			estimatedTimeRemaining: this.estimateTimeRemaining(overallProgress),
			canSkip,
			canCancel,
			message,
		}
	}

	/**
	 * Estimates remaining time based on current progress
	 */
	private estimateTimeRemaining(progress: number): number {
		if (progress >= 100) return 0

		const elapsed = Date.now() - this.startTime
		const estimatedTotal = elapsed / (progress / 100)
		return Math.max(0, estimatedTotal - elapsed)
	}

	/**
	 * Loads configuration from VSCode settings
	 */
	private loadConfigFromSettings(): void {
		const settingsConfig = StartupIndexingHelpers.loadConfigFromSettings()
		this.config = { ...this.config, ...settingsConfig }
	}

	/**
	 * Cleans up resources and timers
	 */
	private cleanup(): void {
		if (this.progressTimer) {
			clearTimeout(this.progressTimer)
			this.progressTimer = null
		}

		this.removeAllListeners()
	}

	/**
	 * Gets current startup indexing status
	 */
	public getStatus(): {
		phase: StartupPhase
		isBlocking: boolean
		progress: StartupProgress
		config: StartupIndexingConfig
	} {
		return {
			phase: this.currentPhase,
			isBlocking: this.isBlocking,
			progress: this.calculateProgress(),
			config: { ...this.config },
		}
	}

	/**
	 * Allows external components to request skip
	 */
	public requestSkip(): boolean {
		const progress = this.calculateProgress()
		if (!progress.canSkip) {
			return false
		}

		this.outputChannel.appendLine("[StartupIndexing] Skip requested by user")
		this.isBlocking = false
		this.emit("skipRequested")

		TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_PROGRESS, {
			action: "skip_requested",
			phase: this.currentPhase,
			duration: Date.now() - this.startTime,
		})

		return true
	}

	/**
	 * Allows external components to request cancel
	 */
	public requestCancel(): boolean {
		const progress = this.calculateProgress()
		if (!progress.canCancel) {
			return false
		}

		this.outputChannel.appendLine("[StartupIndexing] Cancel requested by user")
		this.isBlocking = false
		this.emit("cancelRequested")

		TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_PROGRESS, {
			action: "cancel_requested",
			phase: this.currentPhase,
			duration: Date.now() - this.startTime,
		})

		return true
	}

	/**
	 * Updates configuration at runtime
	 */
	public updateConfig(newConfig: Partial<StartupIndexingConfig>): void {
		this.config = { ...this.config, ...newConfig }
		this.outputChannel.appendLine("[StartupIndexing] Configuration updated")
		this.emit("configUpdated", this.config)
	}

	/**
	 * Gets workspace analysis results
	 */
	public getWorkspaceAnalysis(): Map<string, StartupWorkspaceAnalysis> {
		return new Map(this.workspaceAnalysis)
	}

	/**
	 * Checks if startup indexing is currently blocking user interaction
	 */
	public isBlockingUserInteraction(): boolean {
		return this.isBlocking
	}

	/**
	 * Gets estimated completion time for all workspaces
	 */
	public getEstimatedCompletionTime(): number {
		let totalTime = 0
		for (const analysis of this.workspaceAnalysis.values()) {
			totalTime += analysis.estimatedIndexingTime
		}
		return totalTime
	}

	/**
	 * Gets system information for error context
	 */
	private async getSystemInfo(): Promise<{ availableMemory: number; cpuUsage: number; diskSpace: number }> {
		try {
			// Get memory info (in MB)
			const memInfo = process.memoryUsage()
			const availableMemory = Math.round((memInfo.heapTotal - memInfo.heapUsed) / 1024 / 1024)

			// CPU usage is harder to get synchronously, use a simple approximation
			const cpuUsage = process.cpuUsage()
			const cpuPercent = Math.round((cpuUsage.user + cpuUsage.system) / 1000000) // Convert to percentage approximation

			// Disk space is complex to get cross-platform, use a placeholder
			const diskSpace = 1000 // MB placeholder

			return {
				availableMemory,
				cpuUsage: Math.min(cpuPercent, 100),
				diskSpace,
			}
		} catch (error) {
			// Return defaults if system info gathering fails
			return {
				availableMemory: 512,
				cpuUsage: 50,
				diskSpace: 1000,
			}
		}
	}

	/**
	 * Gets error handler statistics for monitoring
	 */
	public getErrorStatistics() {
		return this.errorHandler.getErrorStatistics()
	}

	/**
	 * Gets current monitoring metrics
	 */
	public getCurrentMetrics(): StartupIndexingMetrics {
		return this.monitor.getCurrentMetrics()
	}

	/**
	 * Gets monitoring health status
	 */
	public getHealthStatus() {
		return this.monitor.getHealthStatus()
	}

	/**
	 * Gets performance trends
	 */
	public getPerformanceTrends() {
		return this.monitor.getPerformanceTrends()
	}

	/**
	 * Checks if the startup indexing system is healthy
	 */
	public isHealthy(): boolean {
		return this.errorHandler.isHealthy() && this.monitor.getHealthStatus().status !== "unhealthy"
	}

	/**
	 * Disposes of the coordinator and cleans up resources
	 */
	public dispose(): void {
		this.cleanup()
		this.monitor.dispose()
		this.outputChannel.appendLine("[StartupIndexing] Coordinator disposed")
	}
}

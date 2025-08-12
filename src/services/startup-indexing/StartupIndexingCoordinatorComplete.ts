import * as vscode from "vscode"
import { EventEmitter } from "events"
import { CodeIndexManager } from "../code-index/manager"
import { SchematicAnalyzer } from "../code-index/SchematicAnalyzer"
import { BackgroundIndexingService, ProcessingPriority } from "../code-index/BackgroundIndexingService"
import { TelemetryService } from "@blues-code/telemetry"
import { TelemetryEventName } from "@blues-code/types"
import { StartupIndexingHelpers } from "./StartupIndexingCoordinatorHelpers"
import {
	StartupPhase,
	StartupIndexingConfig,
	StartupWorkspaceAnalysis,
	StartupProgress,
	StartupIndexingResult,
} from "./StartupIndexingCoordinator"

/**
 * Completion methods for StartupIndexingCoordinator
 */
export class StartupIndexingCoordinatorComplete extends EventEmitter {
	private config: StartupIndexingConfig
	private currentPhase: StartupPhase = StartupPhase.INITIALIZING
	private startTime: number = 0
	private workspaceAnalysis: Map<string, StartupWorkspaceAnalysis> = new Map()
	private progressTimer: NodeJS.Timeout | null = null
	private isBlocking: boolean = false

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly outputChannel: vscode.OutputChannel,
		config?: Partial<StartupIndexingConfig>,
	) {
		super()
		this.config = {
			enabled: true,
			mandatoryForLargeWorkspaces: true,
			maxWorkspaceSizeForAutoStart: 1000,
			criticalFilesTimeout: 30000,
			highPriorityTimeout: 60000,
			showProgressUI: true,
			allowSkipAfterTimeout: 45000,
			enablePerformanceOptimizations: true,
			...config,
		}
		this.loadConfigFromSettings()
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
		this.currentPhase = phase
		this.outputChannel.appendLine(`[StartupIndexing] Phase: ${phase}`)

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
	 * Disposes of the coordinator and cleans up resources
	 */
	public dispose(): void {
		this.cleanup()
		this.outputChannel.appendLine("[StartupIndexing] Coordinator disposed")
	}
}

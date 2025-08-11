import * as vscode from "vscode"
import { TelemetryService } from "@roo-code/telemetry"
import { TelemetryEventName } from "@roo-code/types"
import {
	StartupPhase,
	StartupIndexingConfig,
	StartupWorkspaceAnalysis,
	StartupIndexingResult,
} from "./StartupIndexingCoordinator"

/**
 * Performance metrics for startup indexing
 */
export interface StartupIndexingMetrics {
	totalDuration: number
	phaseTimings: Map<StartupPhase, number>
	filesProcessed: number
	averageFileProcessingTime: number
	memoryUsage: {
		initial: number
		peak: number
		final: number
	}
	cpuUsage: {
		average: number
		peak: number
	}
	errorCount: number
	recoveryAttempts: number
	successRate: number
	workspaceCount: number
	totalFileCount: number
}

/**
 * Health status for startup indexing system
 */
export interface StartupIndexingHealth {
	status: "healthy" | "degraded" | "unhealthy"
	score: number // 0-100
	issues: string[]
	recommendations: string[]
	lastUpdated: number
}

/**
 * Monitoring and telemetry for startup indexing
 */
export class StartupIndexingMonitor {
	private metrics: StartupIndexingMetrics
	private phaseStartTimes: Map<StartupPhase, number> = new Map()
	private startTime: number = 0
	private memorySnapshots: number[] = []
	private cpuSnapshots: number[] = []
	private monitoringTimer: NodeJS.Timeout | null = null
	private healthHistory: StartupIndexingHealth[] = []

	constructor(private readonly outputChannel: vscode.OutputChannel) {
		this.resetMetrics()
	}

	/**
	 * Starts monitoring a startup indexing session
	 */
	public startMonitoring(config: StartupIndexingConfig, workspaceAnalyses: StartupWorkspaceAnalysis[]): void {
		this.startTime = Date.now()
		this.resetMetrics()

		// Initialize metrics with session data
		this.metrics.workspaceCount = workspaceAnalyses.length
		this.metrics.totalFileCount = workspaceAnalyses.reduce((sum, analysis) => sum + analysis.totalFiles, 0)

		// Start periodic monitoring
		this.startPeriodicMonitoring()

		// Log session start
		this.outputChannel.appendLine(
			`[StartupIndexing] Monitoring started for ${this.metrics.workspaceCount} workspaces`,
		)

		// Capture telemetry
		TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_PROGRESS, {
			event: "monitoring_started",
			workspaceCount: this.metrics.workspaceCount,
			totalFiles: this.metrics.totalFileCount,
			config: this.sanitizeConfig(config),
		})
	}

	/**
	 * Records the start of a phase
	 */
	public onPhaseStart(phase: StartupPhase): void {
		const now = Date.now()
		this.phaseStartTimes.set(phase, now)

		this.outputChannel.appendLine(`[StartupIndexing] Phase started: ${phase}`)

		TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_PROGRESS, {
			event: "phase_started",
			phase,
			elapsedTime: now - this.startTime,
		})
	}

	/**
	 * Records the completion of a phase
	 */
	public onPhaseComplete(phase: StartupPhase): void {
		const now = Date.now()
		const startTime = this.phaseStartTimes.get(phase)

		if (startTime) {
			const duration = now - startTime
			this.metrics.phaseTimings.set(phase, duration)

			this.outputChannel.appendLine(`[StartupIndexing] Phase completed: ${phase} (${duration}ms)`)

			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_PROGRESS, {
				event: "phase_completed",
				phase,
				duration,
				elapsedTime: now - this.startTime,
			})
		}
	}

	/**
	 * Records file processing metrics
	 */
	public onFilesProcessed(count: number, totalTime: number): void {
		this.metrics.filesProcessed += count

		if (count > 0) {
			const avgTime = totalTime / count
			// Update running average
			const totalProcessed = this.metrics.filesProcessed
			this.metrics.averageFileProcessingTime =
				(this.metrics.averageFileProcessingTime * (totalProcessed - count) + totalTime) / totalProcessed
		}

		TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_PROGRESS, {
			event: "files_processed",
			count,
			averageTime: this.metrics.averageFileProcessingTime,
			totalProcessed: this.metrics.filesProcessed,
		})
	}

	/**
	 * Records an error occurrence
	 */
	public onError(error: Error, phase: StartupPhase, recoveryAttempted: boolean): void {
		this.metrics.errorCount++
		if (recoveryAttempted) {
			this.metrics.recoveryAttempts++
		}

		this.outputChannel.appendLine(`[StartupIndexing] Error recorded: ${error.message} (phase: ${phase})`)

		TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
			error: error.message,
			phase,
			errorCount: this.metrics.errorCount,
			recoveryAttempted,
			elapsedTime: Date.now() - this.startTime,
		})
	}

	/**
	 * Completes monitoring and finalizes metrics
	 */
	public completeMonitoring(results: StartupIndexingResult[]): StartupIndexingMetrics {
		this.stopPeriodicMonitoring()

		// Finalize metrics
		this.metrics.totalDuration = Date.now() - this.startTime

		// Calculate success rate
		const successfulResults = results.filter((r) => r.success).length
		this.metrics.successRate = results.length > 0 ? successfulResults / results.length : 0

		// Finalize memory and CPU metrics
		if (this.memorySnapshots.length > 0) {
			this.metrics.memoryUsage.final = this.memorySnapshots[this.memorySnapshots.length - 1]
			this.metrics.memoryUsage.peak = Math.max(...this.memorySnapshots)
		}

		if (this.cpuSnapshots.length > 0) {
			this.metrics.cpuUsage.average =
				this.cpuSnapshots.reduce((sum, val) => sum + val, 0) / this.cpuSnapshots.length
			this.metrics.cpuUsage.peak = Math.max(...this.cpuSnapshots)
		}

		this.outputChannel.appendLine(
			`[StartupIndexing] Monitoring completed: ${this.metrics.totalDuration}ms, ` +
				`${this.metrics.filesProcessed} files, ${Math.round(this.metrics.successRate * 100)}% success rate`,
		)

		// Capture final telemetry
		TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_PROGRESS, {
			event: "monitoring_completed",
			...this.sanitizeMetrics(this.metrics),
		})

		// Update health status
		this.updateHealthStatus()

		return { ...this.metrics }
	}

	/**
	 * Gets current metrics snapshot
	 */
	public getCurrentMetrics(): StartupIndexingMetrics {
		const currentMetrics = { ...this.metrics }
		currentMetrics.totalDuration = Date.now() - this.startTime
		return currentMetrics
	}

	/**
	 * Gets health status of the startup indexing system
	 */
	public getHealthStatus(): StartupIndexingHealth {
		if (this.healthHistory.length === 0) {
			return {
				status: "healthy",
				score: 100,
				issues: [],
				recommendations: [],
				lastUpdated: Date.now(),
			}
		}

		return this.healthHistory[this.healthHistory.length - 1]
	}

	/**
	 * Gets performance trends over time
	 */
	public getPerformanceTrends(): {
		averageDuration: number
		averageSuccessRate: number
		errorTrend: "improving" | "stable" | "degrading"
		performanceTrend: "improving" | "stable" | "degrading"
	} {
		// This would typically analyze historical data
		// For now, return current session data
		return {
			averageDuration: this.metrics.totalDuration,
			averageSuccessRate: this.metrics.successRate,
			errorTrend: "stable",
			performanceTrend: "stable",
		}
	}

	/**
	 * Starts periodic monitoring of system resources
	 */
	private startPeriodicMonitoring(): void {
		// Take initial memory snapshot
		this.takeMemorySnapshot()
		this.takeCpuSnapshot()

		this.monitoringTimer = setInterval(() => {
			this.takeMemorySnapshot()
			this.takeCpuSnapshot()
		}, 5000) // Every 5 seconds
	}

	/**
	 * Stops periodic monitoring
	 */
	private stopPeriodicMonitoring(): void {
		if (this.monitoringTimer) {
			clearInterval(this.monitoringTimer)
			this.monitoringTimer = null
		}
	}

	/**
	 * Takes a memory usage snapshot
	 */
	private takeMemorySnapshot(): void {
		try {
			const memInfo = process.memoryUsage()
			const memoryMB = Math.round(memInfo.heapUsed / 1024 / 1024)
			this.memorySnapshots.push(memoryMB)

			// Keep only last 100 snapshots
			if (this.memorySnapshots.length > 100) {
				this.memorySnapshots = this.memorySnapshots.slice(-100)
			}

			// Set initial memory if not set
			if (this.metrics.memoryUsage.initial === 0) {
				this.metrics.memoryUsage.initial = memoryMB
			}
		} catch (error) {
			// Ignore memory snapshot errors
		}
	}

	/**
	 * Takes a CPU usage snapshot
	 */
	private takeCpuSnapshot(): void {
		try {
			const cpuUsage = process.cpuUsage()
			// Simple approximation of CPU percentage
			const cpuPercent = Math.min((cpuUsage.user + cpuUsage.system) / 10000, 100)
			this.cpuSnapshots.push(cpuPercent)

			// Keep only last 100 snapshots
			if (this.cpuSnapshots.length > 100) {
				this.cpuSnapshots = this.cpuSnapshots.slice(-100)
			}
		} catch (error) {
			// Ignore CPU snapshot errors
		}
	}

	/**
	 * Updates health status based on current metrics
	 */
	private updateHealthStatus(): void {
		const health: StartupIndexingHealth = {
			status: "healthy",
			score: 100,
			issues: [],
			recommendations: [],
			lastUpdated: Date.now(),
		}

		// Check success rate
		if (this.metrics.successRate < 0.5) {
			health.status = "unhealthy"
			health.score -= 40
			health.issues.push("Low success rate (< 50%)")
			health.recommendations.push("Review error logs and consider reducing scope")
		} else if (this.metrics.successRate < 0.8) {
			health.status = "degraded"
			health.score -= 20
			health.issues.push("Moderate success rate (< 80%)")
			health.recommendations.push("Monitor for recurring errors")
		}

		// Check error rate
		const errorRate = this.metrics.filesProcessed > 0 ? this.metrics.errorCount / this.metrics.filesProcessed : 0
		if (errorRate > 0.1) {
			health.status = "unhealthy"
			health.score -= 30
			health.issues.push("High error rate (> 10%)")
			health.recommendations.push("Investigate common error patterns")
		}

		// Check performance
		const avgFileTime = this.metrics.averageFileProcessingTime
		if (avgFileTime > 1000) {
			// > 1 second per file
			health.status = "degraded"
			health.score -= 15
			health.issues.push("Slow file processing (> 1s per file)")
			health.recommendations.push("Consider performance optimizations")
		}

		// Check memory usage
		if (this.metrics.memoryUsage.peak > 1000) {
			// > 1GB
			health.score -= 10
			health.issues.push("High memory usage detected")
			health.recommendations.push("Monitor memory consumption")
		}

		// Ensure score doesn't go below 0
		health.score = Math.max(0, health.score)

		// Update status based on final score
		if (health.score < 50) {
			health.status = "unhealthy"
		} else if (health.score < 80) {
			health.status = "degraded"
		}

		this.healthHistory.push(health)

		// Keep only last 10 health records
		if (this.healthHistory.length > 10) {
			this.healthHistory = this.healthHistory.slice(-10)
		}

		this.outputChannel.appendLine(`[StartupIndexing] Health status: ${health.status} (score: ${health.score})`)
	}

	/**
	 * Resets metrics for a new session
	 */
	private resetMetrics(): void {
		this.metrics = {
			totalDuration: 0,
			phaseTimings: new Map(),
			filesProcessed: 0,
			averageFileProcessingTime: 0,
			memoryUsage: {
				initial: 0,
				peak: 0,
				final: 0,
			},
			cpuUsage: {
				average: 0,
				peak: 0,
			},
			errorCount: 0,
			recoveryAttempts: 0,
			successRate: 0,
			workspaceCount: 0,
			totalFileCount: 0,
		}

		this.phaseStartTimes.clear()
		this.memorySnapshots = []
		this.cpuSnapshots = []
	}

	/**
	 * Sanitizes configuration for telemetry
	 */
	private sanitizeConfig(config: StartupIndexingConfig): any {
		return {
			enabled: config.enabled,
			mandatoryForLargeWorkspaces: config.mandatoryForLargeWorkspaces,
			maxWorkspaceSizeForAutoStart: config.maxWorkspaceSizeForAutoStart,
			showProgressUI: config.showProgressUI,
			enablePerformanceOptimizations: config.enablePerformanceOptimizations,
			// Exclude timeout values for privacy
		}
	}

	/**
	 * Sanitizes metrics for telemetry
	 */
	private sanitizeMetrics(metrics: StartupIndexingMetrics): any {
		return {
			totalDuration: metrics.totalDuration,
			filesProcessed: metrics.filesProcessed,
			averageFileProcessingTime: metrics.averageFileProcessingTime,
			errorCount: metrics.errorCount,
			recoveryAttempts: metrics.recoveryAttempts,
			successRate: metrics.successRate,
			workspaceCount: metrics.workspaceCount,
			totalFileCount: metrics.totalFileCount,
			memoryPeak: metrics.memoryUsage.peak,
			cpuAverage: metrics.cpuUsage.average,
		}
	}

	/**
	 * Disposes of the monitor and cleans up resources
	 */
	public dispose(): void {
		this.stopPeriodicMonitoring()
		this.outputChannel.appendLine("[StartupIndexing] Monitor disposed")
	}
}

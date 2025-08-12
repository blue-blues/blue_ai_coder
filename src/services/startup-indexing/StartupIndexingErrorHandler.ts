import * as vscode from "vscode"
import { TelemetryService } from "@blues-code/telemetry"
import { TelemetryEventName } from "@blues-code/types"
import { StartupPhase, StartupIndexingConfig } from "./StartupIndexingCoordinator"

/**
 * Error types for startup indexing
 */
export enum StartupIndexingErrorType {
	WORKSPACE_ANALYSIS_FAILED = "workspace_analysis_failed",
	CRITICAL_FILES_TIMEOUT = "critical_files_timeout",
	HIGH_PRIORITY_TIMEOUT = "high_priority_timeout",
	SERVICE_UNAVAILABLE = "service_unavailable",
	CONFIGURATION_ERROR = "configuration_error",
	RESOURCE_EXHAUSTION = "resource_exhaustion",
	PERMISSION_DENIED = "permission_denied",
	NETWORK_ERROR = "network_error",
	UNKNOWN_ERROR = "unknown_error",
}

/**
 * Recovery strategies for different error types
 */
export enum RecoveryStrategy {
	RETRY_WITH_BACKOFF = "retry_with_backoff",
	FALLBACK_TO_BASIC = "fallback_to_basic",
	SKIP_WORKSPACE = "skip_workspace",
	REDUCE_SCOPE = "reduce_scope",
	DISABLE_FEATURE = "disable_feature",
	USER_INTERVENTION = "user_intervention",
}

/**
 * Error context information
 */
export interface StartupIndexingErrorContext {
	phase: StartupPhase
	workspacePath?: string
	fileCount?: number
	elapsedTime: number
	retryCount: number
	config: StartupIndexingConfig
	systemInfo: {
		availableMemory: number
		cpuUsage: number
		diskSpace: number
	}
}

/**
 * Recovery action result
 */
export interface RecoveryResult {
	success: boolean
	strategy: RecoveryStrategy
	message: string
	shouldContinue: boolean
	modifiedConfig?: Partial<StartupIndexingConfig>
}

/**
 * Comprehensive error handling and recovery for startup indexing
 */
export class StartupIndexingErrorHandler {
	private readonly maxRetries = 3
	private readonly retryDelays = [1000, 2000, 5000] // Progressive backoff
	private errorCounts = new Map<StartupIndexingErrorType, number>()
	private recoveryHistory: Array<{ error: StartupIndexingErrorType; strategy: RecoveryStrategy; success: boolean }> =
		[]

	constructor(private readonly outputChannel: vscode.OutputChannel) {}

	/**
	 * Handles startup indexing errors with appropriate recovery strategies
	 */
	async handleError(error: Error, context: StartupIndexingErrorContext): Promise<RecoveryResult> {
		const errorType = this.classifyError(error, context)
		const errorCount = this.incrementErrorCount(errorType)

		this.outputChannel.appendLine(
			`[StartupIndexing] Error handled: ${errorType} (count: ${errorCount}) - ${error.message}`,
		)

		// Log error telemetry
		this.logErrorTelemetry(error, errorType, context)

		// Determine recovery strategy
		const strategy = this.determineRecoveryStrategy(errorType, errorCount, context)

		// Execute recovery
		const result = await this.executeRecovery(error, errorType, strategy, context)

		// Record recovery attempt
		this.recordRecoveryAttempt(errorType, strategy, result.success)

		return result
	}

	/**
	 * Classifies errors into specific types for targeted recovery
	 */
	private classifyError(error: Error, context: StartupIndexingErrorContext): StartupIndexingErrorType {
		const message = error.message.toLowerCase()

		// Timeout errors
		if (message.includes("timeout") || message.includes("timed out")) {
			if (context.phase === StartupPhase.INDEXING_CRITICAL) {
				return StartupIndexingErrorType.CRITICAL_FILES_TIMEOUT
			} else if (context.phase === StartupPhase.INDEXING_HIGH_PRIORITY) {
				return StartupIndexingErrorType.HIGH_PRIORITY_TIMEOUT
			}
		}

		// Permission errors
		if (message.includes("permission") || message.includes("access denied") || message.includes("eacces")) {
			return StartupIndexingErrorType.PERMISSION_DENIED
		}

		// Resource exhaustion
		if (message.includes("memory") || message.includes("out of space") || message.includes("enospc")) {
			return StartupIndexingErrorType.RESOURCE_EXHAUSTION
		}

		// Network errors
		if (message.includes("network") || message.includes("connection") || message.includes("enotfound")) {
			return StartupIndexingErrorType.NETWORK_ERROR
		}

		// Service availability
		if (message.includes("service") || message.includes("unavailable") || message.includes("not initialized")) {
			return StartupIndexingErrorType.SERVICE_UNAVAILABLE
		}

		// Configuration errors
		if (message.includes("config") || message.includes("setting") || message.includes("invalid")) {
			return StartupIndexingErrorType.CONFIGURATION_ERROR
		}

		// Workspace analysis errors
		if (context.phase === StartupPhase.ANALYZING_WORKSPACE) {
			return StartupIndexingErrorType.WORKSPACE_ANALYSIS_FAILED
		}

		return StartupIndexingErrorType.UNKNOWN_ERROR
	}

	/**
	 * Determines the best recovery strategy for the error type and context
	 */
	private determineRecoveryStrategy(
		errorType: StartupIndexingErrorType,
		errorCount: number,
		context: StartupIndexingErrorContext,
	): RecoveryStrategy {
		// If we've exceeded max retries, use fallback strategies
		if (errorCount > this.maxRetries) {
			switch (errorType) {
				case StartupIndexingErrorType.CRITICAL_FILES_TIMEOUT:
				case StartupIndexingErrorType.HIGH_PRIORITY_TIMEOUT:
					return RecoveryStrategy.REDUCE_SCOPE
				case StartupIndexingErrorType.RESOURCE_EXHAUSTION:
					return RecoveryStrategy.FALLBACK_TO_BASIC
				case StartupIndexingErrorType.PERMISSION_DENIED:
					return RecoveryStrategy.SKIP_WORKSPACE
				case StartupIndexingErrorType.SERVICE_UNAVAILABLE:
					return RecoveryStrategy.DISABLE_FEATURE
				default:
					return RecoveryStrategy.FALLBACK_TO_BASIC
			}
		}

		// First-time error strategies
		switch (errorType) {
			case StartupIndexingErrorType.CRITICAL_FILES_TIMEOUT:
			case StartupIndexingErrorType.HIGH_PRIORITY_TIMEOUT:
				return errorCount === 1 ? RecoveryStrategy.RETRY_WITH_BACKOFF : RecoveryStrategy.REDUCE_SCOPE

			case StartupIndexingErrorType.WORKSPACE_ANALYSIS_FAILED:
				return RecoveryStrategy.RETRY_WITH_BACKOFF

			case StartupIndexingErrorType.SERVICE_UNAVAILABLE:
				return RecoveryStrategy.RETRY_WITH_BACKOFF

			case StartupIndexingErrorType.RESOURCE_EXHAUSTION:
				return RecoveryStrategy.REDUCE_SCOPE

			case StartupIndexingErrorType.PERMISSION_DENIED:
				return RecoveryStrategy.SKIP_WORKSPACE

			case StartupIndexingErrorType.CONFIGURATION_ERROR:
				return RecoveryStrategy.FALLBACK_TO_BASIC

			case StartupIndexingErrorType.NETWORK_ERROR:
				return RecoveryStrategy.RETRY_WITH_BACKOFF

			default:
				return RecoveryStrategy.RETRY_WITH_BACKOFF
		}
	}

	/**
	 * Executes the recovery strategy
	 */
	private async executeRecovery(
		error: Error,
		errorType: StartupIndexingErrorType,
		strategy: RecoveryStrategy,
		context: StartupIndexingErrorContext,
	): Promise<RecoveryResult> {
		this.outputChannel.appendLine(`[StartupIndexing] Executing recovery strategy: ${strategy}`)

		switch (strategy) {
			case RecoveryStrategy.RETRY_WITH_BACKOFF:
				return this.retryWithBackoff(context)

			case RecoveryStrategy.FALLBACK_TO_BASIC:
				return this.fallbackToBasic(context)

			case RecoveryStrategy.SKIP_WORKSPACE:
				return this.skipWorkspace(context)

			case RecoveryStrategy.REDUCE_SCOPE:
				return this.reduceScope(context)

			case RecoveryStrategy.DISABLE_FEATURE:
				return this.disableFeature(context)

			case RecoveryStrategy.USER_INTERVENTION:
				return this.requestUserIntervention(error, context)

			default:
				return {
					success: false,
					strategy,
					message: `Unknown recovery strategy: ${strategy}`,
					shouldContinue: false,
				}
		}
	}

	/**
	 * Retry with exponential backoff
	 */
	private async retryWithBackoff(context: StartupIndexingErrorContext): Promise<RecoveryResult> {
		const delay = this.retryDelays[Math.min(context.retryCount, this.retryDelays.length - 1)]

		this.outputChannel.appendLine(`[StartupIndexing] Retrying after ${delay}ms delay`)

		await new Promise((resolve) => setTimeout(resolve, delay))

		return {
			success: true,
			strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
			message: `Retrying after ${delay}ms delay`,
			shouldContinue: true,
		}
	}

	/**
	 * Fallback to basic indexing without advanced features
	 */
	private fallbackToBasic(context: StartupIndexingErrorContext): RecoveryResult {
		const modifiedConfig: Partial<StartupIndexingConfig> = {
			enablePerformanceOptimizations: false,
			criticalFilesTimeout: context.config.criticalFilesTimeout * 2,
			highPriorityTimeout: context.config.highPriorityTimeout * 2,
			showProgressUI: false,
		}

		return {
			success: true,
			strategy: RecoveryStrategy.FALLBACK_TO_BASIC,
			message: "Falling back to basic indexing mode",
			shouldContinue: true,
			modifiedConfig,
		}
	}

	/**
	 * Skip the problematic workspace
	 */
	private skipWorkspace(context: StartupIndexingErrorContext): RecoveryResult {
		return {
			success: true,
			strategy: RecoveryStrategy.SKIP_WORKSPACE,
			message: `Skipping workspace: ${context.workspacePath}`,
			shouldContinue: true,
		}
	}

	/**
	 * Reduce the scope of indexing
	 */
	private reduceScope(context: StartupIndexingErrorContext): RecoveryResult {
		const modifiedConfig: Partial<StartupIndexingConfig> = {
			criticalFilesTimeout: Math.max(context.config.criticalFilesTimeout / 2, 10000),
			highPriorityTimeout: Math.max(context.config.highPriorityTimeout / 2, 20000),
			maxWorkspaceSizeForAutoStart: Math.max(context.config.maxWorkspaceSizeForAutoStart / 2, 100),
		}

		return {
			success: true,
			strategy: RecoveryStrategy.REDUCE_SCOPE,
			message: "Reducing indexing scope to improve reliability",
			shouldContinue: true,
			modifiedConfig,
		}
	}

	/**
	 * Disable the startup indexing feature
	 */
	private disableFeature(context: StartupIndexingErrorContext): RecoveryResult {
		const modifiedConfig: Partial<StartupIndexingConfig> = {
			enabled: false,
		}

		return {
			success: true,
			strategy: RecoveryStrategy.DISABLE_FEATURE,
			message: "Disabling startup indexing due to persistent errors",
			shouldContinue: false,
			modifiedConfig,
		}
	}

	/**
	 * Request user intervention
	 */
	private async requestUserIntervention(error: Error, context: StartupIndexingErrorContext): Promise<RecoveryResult> {
		const message = `Startup indexing encountered an error: ${error.message}. Would you like to continue with reduced functionality?`

		const choice = await vscode.window.showErrorMessage(
			message,
			{ modal: true },
			"Continue with Basic Mode",
			"Skip This Workspace",
			"Disable Startup Indexing",
		)

		switch (choice) {
			case "Continue with Basic Mode":
				return this.fallbackToBasic(context)
			case "Skip This Workspace":
				return this.skipWorkspace(context)
			case "Disable Startup Indexing":
				return this.disableFeature(context)
			default:
				return {
					success: false,
					strategy: RecoveryStrategy.USER_INTERVENTION,
					message: "User cancelled operation",
					shouldContinue: false,
				}
		}
	}

	/**
	 * Increments error count for the given type
	 */
	private incrementErrorCount(errorType: StartupIndexingErrorType): number {
		const current = this.errorCounts.get(errorType) || 0
		const newCount = current + 1
		this.errorCounts.set(errorType, newCount)
		return newCount
	}

	/**
	 * Records recovery attempt for analysis
	 */
	private recordRecoveryAttempt(
		errorType: StartupIndexingErrorType,
		strategy: RecoveryStrategy,
		success: boolean,
	): void {
		this.recoveryHistory.push({ error: errorType, strategy, success })

		// Keep only last 100 entries
		if (this.recoveryHistory.length > 100) {
			this.recoveryHistory = this.recoveryHistory.slice(-100)
		}
	}

	/**
	 * Logs error telemetry for monitoring and improvement
	 */
	private logErrorTelemetry(
		error: Error,
		errorType: StartupIndexingErrorType,
		context: StartupIndexingErrorContext,
	): void {
		TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
			errorType,
			errorMessage: error.message,
			phase: context.phase,
			workspacePath: context.workspacePath,
			fileCount: context.fileCount,
			elapsedTime: context.elapsedTime,
			retryCount: context.retryCount,
			availableMemory: context.systemInfo.availableMemory,
			cpuUsage: context.systemInfo.cpuUsage,
			diskSpace: context.systemInfo.diskSpace,
		})
	}

	/**
	 * Gets error statistics for monitoring
	 */
	public getErrorStatistics(): {
		errorCounts: Map<StartupIndexingErrorType, number>
		recoveryHistory: Array<{ error: StartupIndexingErrorType; strategy: RecoveryStrategy; success: boolean }>
		successRate: number
	} {
		const totalAttempts = this.recoveryHistory.length
		const successfulAttempts = this.recoveryHistory.filter((attempt) => attempt.success).length
		const successRate = totalAttempts > 0 ? successfulAttempts / totalAttempts : 0

		return {
			errorCounts: new Map(this.errorCounts),
			recoveryHistory: [...this.recoveryHistory],
			successRate,
		}
	}

	/**
	 * Resets error tracking (useful for testing or fresh starts)
	 */
	public reset(): void {
		this.errorCounts.clear()
		this.recoveryHistory = []
	}

	/**
	 * Checks if the system is in a healthy state
	 */
	public isHealthy(): boolean {
		const stats = this.getErrorStatistics()

		// Consider unhealthy if success rate is below 70% and we have significant attempts
		if (stats.recoveryHistory.length > 10 && stats.successRate < 0.7) {
			return false
		}

		// Check for excessive errors of critical types
		const criticalErrors = [
			StartupIndexingErrorType.RESOURCE_EXHAUSTION,
			StartupIndexingErrorType.SERVICE_UNAVAILABLE,
		]

		for (const errorType of criticalErrors) {
			const count = this.errorCounts.get(errorType) || 0
			if (count > 5) {
				return false
			}
		}

		return true
	}
}

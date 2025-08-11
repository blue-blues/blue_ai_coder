import { CodeIndexManager } from "../code-index/manager"
import {
	IndexValidationResult,
	IndexRecommendation,
	IndexingEstimate,
	IndexHealthStatus,
	IndexingContext,
	ValidationError,
	ERROR_CODES,
	VALIDATION_CONSTANTS,
} from "../../types/indexing-validation"

/**
 * Centralized utility class for indexing validation operations.
 * Provides a clean interface for validating indexing state and generating recommendations.
 */
export class IndexingValidator {
	private codeIndexManager: CodeIndexManager

	constructor(codeIndexManager: CodeIndexManager) {
		this.codeIndexManager = codeIndexManager
	}

	/**
	 * Performs comprehensive indexing validation
	 * @returns Promise<IndexValidationResult>
	 */
	async validateIndexingState(): Promise<IndexValidationResult> {
		const startTime = Date.now()

		try {
			// Check if feature is enabled and configured
			if (!this.codeIndexManager.isFeatureEnabled || !this.codeIndexManager.isFeatureConfigured) {
				return {
					isValid: false,
					status: "Standby",
					recommendation: {
						shouldIndex: false,
						reason: "Code indexing is not enabled or configured",
						priority: "low",
						workspaceSize: 0,
						fileCount: 0,
					},
				}
			}

			// Get current status and recommendation
			const currentStatus = this.codeIndexManager.getCurrentStatus()
			const recommendation = await this.codeIndexManager.getIndexingRecommendation()
			const estimate = await this.codeIndexManager.estimateIndexingTime()

			// Determine if current state is valid for task execution
			const isValid =
				currentStatus.systemStatus === "Indexed" ||
				!recommendation.shouldIndex ||
				currentStatus.systemStatus === "Indexing"

			const result: IndexValidationResult = {
				isValid,
				status: currentStatus.systemStatus,
				recommendation,
				estimate,
				error: currentStatus.systemStatus === "Error" ? currentStatus.systemMessage : undefined,
			}

			// Performance check
			const duration = Date.now() - startTime
			if (duration > VALIDATION_CONSTANTS.PERFORMANCE_TARGET_MS) {
				console.warn(
					`Indexing validation took ${duration}ms (target: ${VALIDATION_CONSTANTS.PERFORMANCE_TARGET_MS}ms)`,
				)
			}

			return result
		} catch (error) {
			return {
				isValid: false,
				status: "Error",
				recommendation: {
					shouldIndex: false,
					reason: "Validation failed",
					priority: "low",
					workspaceSize: 0,
					fileCount: 0,
				},
				error: error instanceof Error ? error.message : String(error),
			}
		}
	}

	/**
	 * Gets indexing recommendation for the current workspace
	 * @returns Promise<IndexRecommendation>
	 */
	async getIndexingRecommendation(): Promise<IndexRecommendation> {
		return this.codeIndexManager.getIndexingRecommendation()
	}

	/**
	 * Estimates indexing time based on workspace size
	 * @returns Promise<IndexingEstimate>
	 */
	async estimateIndexingTime(): Promise<IndexingEstimate> {
		return this.codeIndexManager.estimateIndexingTime()
	}

	/**
	 * Validates current index health and completeness
	 * @returns Promise<IndexHealthStatus>
	 */
	async validateIndexHealth(): Promise<IndexHealthStatus> {
		return this.codeIndexManager.validateIndexHealth()
	}

	/**
	 * Creates an indexing context for task initialization
	 * @param userChoice - The user's choice regarding indexing
	 * @param validationTimestamp - When the validation occurred
	 * @returns IndexingContext
	 */
	createIndexingContext(
		userChoice: "start" | "skip" | "wait" | "cancel",
		validationTimestamp: number,
	): IndexingContext {
		const currentStatus = this.codeIndexManager.getCurrentStatus()
		const hasIndex = currentStatus.systemStatus === "Indexed"

		// Calculate index quality based on completeness
		let indexQuality = 0
		if (hasIndex) {
			// This is a simplified quality calculation
			// In a real implementation, you might want to check cache stats
			indexQuality = 0.8 // Assume good quality if indexed
		}

		return {
			hasIndex,
			indexQuality,
			userChoice,
			validationTimestamp,
		}
	}

	/**
	 * Checks if indexing validation should be skipped
	 * @param isSubtask - Whether this is a subtask
	 * @param skipValidation - Whether validation is explicitly disabled
	 * @returns boolean
	 */
	shouldSkipValidation(isSubtask: boolean, skipValidation: boolean): boolean {
		return isSubtask || skipValidation || !this.codeIndexManager.isFeatureEnabled
	}

	/**
	 * Waits for indexing to complete with timeout
	 * @param timeoutMs - Timeout in milliseconds
	 * @returns Promise<boolean> - true if completed, false if timed out
	 */
	async waitForIndexingCompletion(
		timeoutMs: number = VALIDATION_CONSTANTS.DEFAULT_VALIDATION_TIMEOUT,
	): Promise<boolean> {
		return new Promise((resolve) => {
			const startTime = Date.now()

			const checkStatus = () => {
				const status = this.codeIndexManager.getCurrentStatus()
				const elapsed = Date.now() - startTime

				if (status.systemStatus === "Indexed") {
					resolve(true)
				} else if (status.systemStatus === "Error" || elapsed >= timeoutMs) {
					resolve(false)
				} else {
					setTimeout(checkStatus, 1000) // Check every second
				}
			}

			checkStatus()
		})
	}

	/**
	 * Starts indexing and returns immediately
	 * @returns Promise<void>
	 */
	async startIndexing(): Promise<void> {
		if (!this.codeIndexManager.isFeatureEnabled) {
			throw new ValidationError("Code indexing is not enabled", ERROR_CODES.CONFIGURATION_ERROR)
		}

		if (!this.codeIndexManager.isInitialized) {
			throw new ValidationError("Code index manager is not initialized", ERROR_CODES.INDEX_MANAGER_UNAVAILABLE)
		}

		await this.codeIndexManager.startIndexing()
	}

	/**
	 * Starts enhanced indexing with intelligent prioritization
	 * @returns Promise<void>
	 */
	async startEnhancedIndexing(): Promise<void> {
		if (!this.codeIndexManager.isFeatureEnabled) {
			throw new ValidationError("Code indexing is not enabled", ERROR_CODES.CONFIGURATION_ERROR)
		}

		if (!this.codeIndexManager.isInitialized) {
			throw new ValidationError("Code index manager is not initialized", ERROR_CODES.INDEX_MANAGER_UNAVAILABLE)
		}

		// Use enhanced indexing if available
		if (typeof this.codeIndexManager.startEnhancedIndexing === "function") {
			await this.codeIndexManager.startEnhancedIndexing()
		} else {
			await this.codeIndexManager.startIndexing()
		}
	}

	/**
	 * Gets enhanced indexing statistics including performance metrics
	 * @returns Enhanced stats or null if not available
	 */
	getEnhancedIndexingStats(): any {
		if (typeof this.codeIndexManager.getEnhancedIndexingStats === "function") {
			return this.codeIndexManager.getEnhancedIndexingStats()
		}
		return null
	}

	/**
	 * Gets background processing status
	 * @returns Background processing status
	 */
	getBackgroundProcessingStatus(): any {
		if (typeof this.codeIndexManager.getBackgroundProcessingStatus === "function") {
			return this.codeIndexManager.getBackgroundProcessingStatus()
		}
		return {
			isEnabled: false,
			isProcessing: false,
			queueSize: 0,
		}
	}

	/**
	 * Pauses background processing
	 */
	pauseBackgroundProcessing(): void {
		if (typeof this.codeIndexManager.pauseBackgroundProcessing === "function") {
			this.codeIndexManager.pauseBackgroundProcessing()
		}
	}

	/**
	 * Resumes background processing
	 */
	resumeBackgroundProcessing(): void {
		if (typeof this.codeIndexManager.resumeBackgroundProcessing === "function") {
			this.codeIndexManager.resumeBackgroundProcessing()
		}
	}

	/**
	 * Optimizes indexing performance
	 */
	optimizeIndexingPerformance(): void {
		if (typeof this.codeIndexManager.optimizeIndexingPerformance === "function") {
			this.codeIndexManager.optimizeIndexingPerformance()
		}
	}

	/**
	 * Adds a file to the background processing queue
	 * @param filePath - Path to the file
	 * @param content - Optional file content
	 * @returns Promise<string | null> - Job ID or null if not supported
	 */
	async addFileToBackgroundQueue(filePath: string, content?: string): Promise<string | null> {
		if (typeof this.codeIndexManager.addFileToBackgroundQueue === "function") {
			return await this.codeIndexManager.addFileToBackgroundQueue(filePath, content)
		}
		return null
	}

	/**
	 * Enhanced validation that includes background processing status
	 * @returns Promise<IndexValidationResult & { backgroundStatus?: any }>
	 */
	async validateIndexingStateEnhanced(): Promise<IndexValidationResult & { backgroundStatus?: any }> {
		const baseResult = await this.validateIndexingState()

		// Add background processing status if available
		const backgroundStatus = this.getBackgroundProcessingStatus()

		return {
			...baseResult,
			backgroundStatus,
		}
	}

	/**
	 * Validates that the enhanced services are working correctly
	 * @returns Promise<{ isValid: boolean; issues: string[]; capabilities: string[] }>
	 */
	async validateEnhancedServices(): Promise<{
		isValid: boolean
		issues: string[]
		capabilities: string[]
	}> {
		const issues: string[] = []
		const capabilities: string[] = []

		try {
			// Check if enhanced indexing is available
			if (typeof this.codeIndexManager.startEnhancedIndexing === "function") {
				capabilities.push("Enhanced Indexing with Prioritization")
			} else {
				issues.push("Enhanced indexing not available - falling back to standard indexing")
			}

			// Check if background processing is available
			const backgroundStatus = this.getBackgroundProcessingStatus()
			if (backgroundStatus.isEnabled) {
				capabilities.push("Background Processing Queue")
				capabilities.push(`Queue Size: ${backgroundStatus.queueSize}`)
				capabilities.push(`Processing: ${backgroundStatus.isProcessing ? "Active" : "Idle"}`)
			} else {
				issues.push("Background processing not available")
			}

			// Check if performance monitoring is available
			const enhancedStats = this.getEnhancedIndexingStats()
			if (enhancedStats) {
				capabilities.push("Performance Monitoring")
				if (enhancedStats.performance) {
					capabilities.push(`Files Processed: ${enhancedStats.performance.totalFilesProcessed}`)
					capabilities.push(
						`Avg Processing Time: ${Math.round(enhancedStats.performance.averageProcessingTime)}ms`,
					)
					capabilities.push(`Efficiency: ${Math.round(enhancedStats.performance.indexingEfficiency * 100)}%`)
				}
			} else {
				issues.push("Enhanced performance monitoring not available")
			}

			// Check if optimization features are available
			if (typeof this.codeIndexManager.optimizeIndexingPerformance === "function") {
				capabilities.push("Performance Optimization")
			} else {
				issues.push("Performance optimization not available")
			}

			// Check if file queuing is available
			if (typeof this.codeIndexManager.addFileToBackgroundQueue === "function") {
				capabilities.push("Individual File Queuing")
			} else {
				issues.push("Individual file queuing not available")
			}

			const isValid = issues.length === 0 || capabilities.length > 0

			return {
				isValid,
				issues,
				capabilities,
			}
		} catch (error) {
			return {
				isValid: false,
				issues: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
				capabilities: [],
			}
		}
	}

	/**
	 * Gets the current indexing status
	 * @returns Current status object
	 */
	getCurrentStatus() {
		return this.codeIndexManager.getCurrentStatus()
	}

	/**
	 * Checks if the index manager is available and ready
	 * @returns boolean
	 */
	isAvailable(): boolean {
		return this.codeIndexManager.isFeatureEnabled && this.codeIndexManager.isFeatureConfigured
	}
}

/**
 * Type definitions for pre-chat indexing validation system
 * These types support the validation flow before task initialization
 */

export type IndexingStatus = "Standby" | "Indexing" | "Indexed" | "Error"

export type IndexingChoice = "start" | "skip" | "cancel" | "wait"

export interface IndexValidationResult {
	isValid: boolean
	status: IndexingStatus
	recommendation: IndexRecommendation
	estimate?: IndexingEstimate
	error?: string
}

export interface IndexRecommendation {
	shouldIndex: boolean
	reason: string
	priority: "high" | "medium" | "low"
	workspaceSize: number
	fileCount: number
}

export interface IndexingEstimate {
	estimatedTimeMs: number
	estimatedFiles: number
	confidence: number
}

export interface IndexHealthStatus {
	isHealthy: boolean
	completeness: number
	lastIndexed?: Date
	issues?: string[]
}

export interface PendingTaskData {
	text?: string
	images?: string[]
	parentTask?: any // Will be typed as Task when imported
	options?: any // Will be typed as Partial<TaskOptions> when imported
	timestamp: number
}

export interface IndexingContext {
	hasIndex: boolean
	indexQuality: number
	userChoice: IndexingChoice
	validationTimestamp: number
}

export interface IndexingCheckpoint {
	workspaceId: string
	lastIndexedFile: string
	completedFiles: string[]
	timestamp: Date
	totalFiles: number
}

export interface IndexingValidationConfig {
	enabled: boolean
	autoStartForSmallWorkspaces: boolean
	maxAutoIndexFiles: number
	showProgressDialog: boolean
	rememberUserChoice: boolean
	validationTimeout: number
}

export interface CachedIndexStatus {
	status: IndexingStatus
	timestamp: number
}

// WebView message types for indexing validation
export interface IndexingValidationMessage {
	type: "showIndexingValidation"
	validation: IndexValidationResult
	taskId: string
}

export interface IndexingChoiceMessage {
	type: "indexingChoice"
	choice: IndexingChoice
	taskId: string
}

export interface IndexingProgressMessage {
	type: "indexingProgress"
	progress: IndexProgressUpdate
	canSkip: boolean
	canCancel: boolean
}

export interface IndexingCompleteMessage {
	type: "indexingComplete"
	success: boolean
	taskId: string
	error?: string
}

export interface IndexProgressUpdate {
	filesProcessed: number
	totalFiles: number
	currentFile?: string
	elapsedTimeMs: number
	estimatedRemainingMs: number
	percentage: number
}

// Configuration for progressive indexing
export interface ProgressiveIndexingConfig {
	priorityPatterns: string[]
	batchSize: number
	pauseBetweenBatches: number
	maxConcurrentFiles: number
}

// Network-aware indexing configuration
export interface NetworkAwareIndexingConfig {
	checkConnectivity: boolean
	retryAttempts: number
	retryDelayMs: number
	offlineModeEnabled: boolean
}

// Memory management configuration
export interface MemoryAwareIndexingConfig {
	maxMemoryUsage: number
	monitoringInterval: number
	gcThreshold: number
	batchSizeAdjustment: boolean
}

// Telemetry interfaces
export interface ValidationTelemetryData {
	workspaceSize: number
	validationDuration: number
	userChoice: IndexingChoice
	indexingStatus: IndexingStatus
	errorType?: string
}

export interface IndexingTelemetryData {
	filesProcessed: number
	totalFiles: number
	duration: number
	success: boolean
	errorType?: string
	memoryUsage?: number
}

// Error types for validation
export class ValidationError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly context?: Record<string, any>,
	) {
		super(message)
		this.name = "ValidationError"
	}
}

export class IndexingError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly recoverable: boolean = true,
		public readonly context?: Record<string, any>,
	) {
		super(message)
		this.name = "IndexingError"
	}
}

// Constants for validation
export const VALIDATION_CONSTANTS = {
	DEFAULT_VALIDATION_TIMEOUT: 5000,
	MAX_AUTO_INDEX_FILES: 1000,
	CACHE_TTL_MS: 30000,
	MIN_INDEX_COMPLETENESS: 0.8,
	LARGE_WORKSPACE_THRESHOLD: 5000,
	PERFORMANCE_TARGET_MS: 100,
	MEMORY_LIMIT_MB: 50,
} as const

export const INDEXING_PRIORITIES = {
	HIGH: "high",
	MEDIUM: "medium",
	LOW: "low",
} as const

export const ERROR_CODES = {
	VALIDATION_TIMEOUT: "VALIDATION_TIMEOUT",
	INDEX_MANAGER_UNAVAILABLE: "INDEX_MANAGER_UNAVAILABLE",
	WORKSPACE_NOT_FOUND: "WORKSPACE_NOT_FOUND",
	CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
	NETWORK_ERROR: "NETWORK_ERROR",
	MEMORY_ERROR: "MEMORY_ERROR",
	FILE_ACCESS_ERROR: "FILE_ACCESS_ERROR",
	USER_CANCELLED: "USER_CANCELLED",
} as const

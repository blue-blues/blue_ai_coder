import type { IndexingStatus } from "@blues/ExtensionMessage"

// Base interfaces for indexing components
export interface IndexingProgressModalProps {
	isOpen: boolean
	onClose: () => void
	indexingStatus: IndexingStatus
	canSkip?: boolean
	canCancel?: boolean
	taskId?: string
	onUserChoice?: (choice: "wait" | "skip" | "cancel") => void
}

export interface IndexingStatusIndicatorProps {
	className?: string
	variant?: "compact" | "detailed" | "minimal"
	showProgress?: boolean
	onClick?: () => void
}

export interface IndexingError {
	code: string
	message: string
	details?: string
	stack?: string
	timestamp: number
	recoverable: boolean
	suggestions?: string[]
	configIssues?: string[]
	systemInfo?: {
		memoryUsage: number
		diskSpace: number
		nodeVersion: string
	}
}

export interface IndexingErrorDialogProps {
	isOpen: boolean
	onClose: () => void
	error: IndexingError | null
	onRetry?: () => void
	onConfigure?: () => void
}

export interface IndexingConfigurationPanelProps {
	className?: string
	onConfigChange?: (config: IndexingConfiguration) => void
}

export interface IndexingConfiguration {
	// Performance settings
	maxConcurrentFiles: number
	batchSize: number
	memoryLimit: number
	timeoutMs: number

	// Quality settings
	enableDeepAnalysis: boolean
	skipBinaryFiles: boolean
	skipLargeFiles: boolean
	maxFileSize: number

	// Optimization settings
	enableCaching: boolean
	cacheSize: number
	enableIncrementalIndexing: boolean
	enableParallelProcessing: boolean

	// Filter settings
	includePatterns: string[]
	excludePatterns: string[]
	fileExtensions: string[]

	// Advanced settings
	logLevel: "error" | "warn" | "info" | "debug"
	enableTelemetry: boolean
	autoOptimize: boolean
	retryAttempts: number
}

export interface PerformanceMetrics {
	// Throughput metrics
	filesPerSecond: number
	blocksPerSecond: number
	bytesPerSecond: number

	// Timing metrics
	averageFileProcessingTime: number
	averageBatchProcessingTime: number
	totalIndexingTime: number

	// Quality metrics
	successRate: number
	errorRate: number
	retryRate: number

	// Resource utilization
	memoryUsage: number
	cpuUsage: number
	diskIORate: number

	// Queue metrics
	averageQueueWaitTime: number
	queueEfficiency: number
	concurrencyUtilization: number

	// Optimization metrics
	cacheHitRate: number
	duplicateDetectionRate: number
	incrementalIndexingEfficiency: number
}

export interface OptimizationSuggestion {
	id: string
	type: "performance" | "resource" | "configuration"
	severity: "low" | "medium" | "high"
	title: string
	description: string
	impact: string
	action?: string
	actionType?: "setting" | "restart" | "config"
}

export interface PerformanceMetricsPanelProps {
	className?: string
	variant?: "compact" | "detailed"
	showOptimizations?: boolean
}

export interface FileAnalysis {
	path: string
	size: number
	lines: number
	language: string
	complexity: number
	priority: "high" | "medium" | "low"
	issues: string[]
	dependencies: string[]
	lastModified: number
}

export interface DirectoryAnalysis {
	path: string
	fileCount: number
	totalSize: number
	languages: Record<string, number>
	avgComplexity: number
	priority: "high" | "medium" | "low"
	subdirectories: DirectoryAnalysis[]
}

export interface WorkspaceAnalysis {
	totalFiles: number
	totalSize: number
	languages: Record<string, { count: number; size: number; complexity: number }>
	directories: DirectoryAnalysis[]
	highPriorityFiles: FileAnalysis[]
	recommendations: {
		type: "optimization" | "structure" | "quality"
		severity: "low" | "medium" | "high"
		title: string
		description: string
		files?: string[]
	}[]
	indexingEstimate: {
		estimatedTimeMs: number
		estimatedMemoryMB: number
		confidence: number
	}
	lastAnalyzed: number
}

export interface WorkspaceAnalysisDisplayProps {
	className?: string
	variant?: "compact" | "detailed"
	showRecommendations?: boolean
}

// Extended indexing status with additional fields
export interface ExtendedIndexingStatus extends IndexingStatus {
	isPaused?: boolean
	throughput?: number
	estimatedRemainingMs?: number
}

// Detailed progress information
export interface DetailedProgressInfo {
	currentFile?: string
	elapsedTimeMs: number
	estimatedRemainingMs: number
	filesPerSecond: number
	category?: string
	phase?: string
	errorCount?: number
	warningCount?: number
}

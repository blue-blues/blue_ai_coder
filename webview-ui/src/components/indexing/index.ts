// Indexing UI Components
export { IndexingProgressModal } from "./IndexingProgressModal"
export { IndexingStatusIndicator } from "./IndexingStatusIndicator"
export { IndexingErrorDialog } from "./IndexingErrorDialog"
export { IndexingConfigurationPanel } from "./IndexingConfigurationPanel"
export { PerformanceMetricsPanel } from "./PerformanceMetricsPanel"
export { WorkspaceAnalysisDisplay } from "./WorkspaceAnalysisDisplay"

// Integration Examples and Utilities
export { IndexingIntegrationExample, MinimalIndexingIntegration, useIndexingState } from "./IndexingIntegrationExample"

// Re-export types that might be useful for consumers
export type {
	IndexingProgressModalProps,
	IndexingStatusIndicatorProps,
	IndexingErrorDialogProps,
	IndexingConfigurationPanelProps,
	PerformanceMetricsPanelProps,
	WorkspaceAnalysisDisplayProps,
	IndexingError,
	IndexingConfiguration,
	PerformanceMetrics,
	OptimizationSuggestion,
	WorkspaceAnalysis,
	FileAnalysis,
	DirectoryAnalysis,
	ExtendedIndexingStatus,
	DetailedProgressInfo,
} from "./types"

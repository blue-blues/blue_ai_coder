import React, { useState, useEffect } from "react"
import { vscode } from "@src/utils/vscode"
import { useExtensionState } from "@src/context/ExtensionStateContext"
import {
	IndexingProgressModal,
	IndexingStatusIndicator,
	IndexingErrorDialog,
	IndexingConfigurationPanel,
	PerformanceMetricsPanel,
	WorkspaceAnalysisDisplay,
} from "./index"
import type { IndexingError } from "./types"
import type { IndexingStatus } from "@roo/ExtensionMessage"

/**
 * Comprehensive integration example showing how to use all indexing UI components
 * This demonstrates the complete indexing user experience flow
 */
export const IndexingIntegrationExample: React.FC = () => {
	// State management for all indexing UI components
	const [indexingStatus, setIndexingStatus] = useState<IndexingStatus>({
		systemStatus: "Standby",
		processedItems: 0,
		totalItems: 0,
		currentItemUnit: "files",
	})

	const [showProgressModal, setShowProgressModal] = useState(false)
	const [showConfigPanel, setShowConfigPanel] = useState(false)
	const [indexingError, setIndexingError] = useState<IndexingError | null>(null)
	const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)

	// Listen for indexing-related messages from the extension
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const { type, data } = event.data

			switch (type) {
				case "indexingStatusUpdate":
					setIndexingStatus(data.values)
					break

				case "showIndexingValidation":
					// Show validation dialog when indexing validation is needed
					setShowProgressModal(true)
					setCurrentTaskId(data.taskId)
					break

				case "indexingProgress":
					// Update progress during indexing
					setIndexingStatus((prev) => ({
						...prev,
						...data.progress,
					}))
					break

				case "indexingError":
					// Show error dialog when indexing fails
					setIndexingError(data.indexingError)
					break

				case "indexingComplete":
					// Handle indexing completion
					if (data.success) {
						setShowProgressModal(false)
						setCurrentTaskId(null)
					} else {
						setIndexingError(data.indexingError)
					}
					break
			}
		}

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [])

	// Handle user choices during indexing validation
	const handleUserChoice = (choice: "wait" | "skip" | "cancel") => {
		vscode.postMessage({
			type: "indexingChoice",
			indexingChoice: choice,
			taskId: currentTaskId || undefined,
		})

		if (choice === "wait") {
			// Keep modal open to show progress
			// Modal will close automatically when indexing completes
		} else {
			// Close modal for skip/cancel
			setShowProgressModal(false)
			setCurrentTaskId(null)
		}
	}

	// Handle error recovery actions
	const handleErrorRetry = () => {
		vscode.postMessage({
			type: "retryIndexing",
			strategy: "default",
		})
		setIndexingError(null)
	}

	const handleErrorConfigure = () => {
		setIndexingError(null)
		setShowConfigPanel(true)
	}

	// Handle configuration changes
	const handleConfigChange = (config: any) => {
		vscode.postMessage({
			type: "saveIndexingConfiguration",
			indexingConfig: config,
		})
	}

	return (
		<div className="space-y-6 p-4">
			{/* Header with Status Indicator */}
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-vscode-foreground">Indexing System</h2>
				<div className="flex items-center gap-4">
					{/* Compact Status Indicator */}
					<IndexingStatusIndicator variant="compact" onClick={() => setShowProgressModal(true)} />

					{/* Configuration Button */}
					<button
						onClick={() => setShowConfigPanel(!showConfigPanel)}
						className="px-3 py-1 text-sm bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground">
						Configure
					</button>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Left Column: Analysis and Performance */}
				<div className="space-y-6">
					{/* Workspace Analysis */}
					<WorkspaceAnalysisDisplay variant="detailed" showRecommendations={true} />

					{/* Performance Metrics (when indexing is active) */}
					{indexingStatus.systemStatus === "Indexing" && (
						<PerformanceMetricsPanel variant="detailed" showOptimizations={true} />
					)}
				</div>

				{/* Right Column: Configuration and Status */}
				<div className="space-y-6">
					{/* Detailed Status Indicator */}
					<IndexingStatusIndicator
						variant="detailed"
						showProgress={true}
						onClick={() => setShowProgressModal(true)}
					/>

					{/* Configuration Panel (when expanded) */}
					{showConfigPanel && <IndexingConfigurationPanel onConfigChange={handleConfigChange} />}

					{/* Performance Metrics Compact View (when not indexing) */}
					{indexingStatus.systemStatus !== "Indexing" && (
						<PerformanceMetricsPanel variant="compact" showOptimizations={false} />
					)}
				</div>
			</div>

			{/* Modal Dialogs */}

			{/* Progress Modal - Shows during indexing validation and progress */}
			<IndexingProgressModal
				isOpen={showProgressModal}
				onClose={() => setShowProgressModal(false)}
				indexingStatus={indexingStatus}
				canSkip={true}
				canCancel={true}
				taskId={currentTaskId || undefined}
				onUserChoice={handleUserChoice}
			/>

			{/* Error Dialog - Shows when indexing errors occur */}
			<IndexingErrorDialog
				isOpen={!!indexingError}
				onClose={() => setIndexingError(null)}
				error={indexingError}
				onRetry={handleErrorRetry}
				onConfigure={handleErrorConfigure}
			/>

			{/* Example Usage Instructions */}
			<div className="mt-8 p-4 bg-vscode-textCodeBlock-background rounded-lg border border-vscode-panel-border">
				<h3 className="text-sm font-medium text-vscode-foreground mb-2">Integration Guide</h3>
				<div className="text-xs text-vscode-descriptionForeground space-y-2">
					<p>
						<strong>Status Indicator:</strong> Click to view detailed progress or open configuration
					</p>
					<p>
						<strong>Progress Modal:</strong> Automatically opens during indexing validation and shows
						real-time progress
					</p>
					<p>
						<strong>Error Handling:</strong> Provides clear error messages with recovery options
					</p>
					<p>
						<strong>Configuration:</strong> Comprehensive settings panel with validation and real-time
						updates
					</p>
					<p>
						<strong>Performance Monitoring:</strong> Real-time metrics and optimization suggestions
					</p>
					<p>
						<strong>Workspace Analysis:</strong> Intelligent analysis with recommendations and estimates
					</p>
				</div>
			</div>
		</div>
	)
}

/**
 * Minimal integration example for basic indexing status display
 */
export const MinimalIndexingIntegration: React.FC = () => {
	const [indexingStatus, setIndexingStatus] = useState<IndexingStatus>({
		systemStatus: "Standby",
		processedItems: 0,
		totalItems: 0,
		currentItemUnit: "files",
	})

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "indexingStatusUpdate") {
				setIndexingStatus(event.data.values)
			}
		}

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [])

	return (
		<div className="flex items-center gap-2">
			<IndexingStatusIndicator
				variant="minimal"
				onClick={() => {
					// Handle click - could open detailed view, configuration, etc.
					vscode.postMessage({ type: "requestIndexingStatus" })
				}}
			/>
			<span className="text-xs text-vscode-descriptionForeground">{indexingStatus.systemStatus}</span>
		</div>
	)
}

/**
 * Hook for managing indexing state across components
 */
export const useIndexingState = () => {
	const [indexingStatus, setIndexingStatus] = useState<IndexingStatus>({
		systemStatus: "Standby",
		processedItems: 0,
		totalItems: 0,
		currentItemUnit: "files",
	})

	const [isIndexing, setIsIndexing] = useState(false)
	const [hasError, setHasError] = useState(false)

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "indexingStatusUpdate") {
				const status = event.data.values
				setIndexingStatus(status)
				setIsIndexing(status.systemStatus === "Indexing")
				setHasError(status.systemStatus === "Error")
			}
		}

		// Request initial status
		vscode.postMessage({ type: "requestIndexingStatus" })

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [])

	const startIndexing = () => {
		vscode.postMessage({ type: "startIndexing" })
	}

	const pauseIndexing = () => {
		vscode.postMessage({
			type: "indexingPauseResume",
			paused: true,
		})
	}

	const resumeIndexing = () => {
		vscode.postMessage({
			type: "indexingPauseResume",
			paused: false,
		})
	}

	const cancelIndexing = () => {
		vscode.postMessage({
			type: "indexingChoice",
			indexingChoice: "cancel",
		})
	}

	return {
		indexingStatus,
		isIndexing,
		hasError,
		startIndexing,
		pauseIndexing,
		resumeIndexing,
		cancelIndexing,
	}
}

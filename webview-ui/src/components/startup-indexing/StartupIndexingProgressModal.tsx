import React, { useState, useEffect, useCallback } from "react"
import { VSCodeButton, VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react"
import { vscode } from "../../utils/vscode"
import { useTranslation } from "react-i18next"

export interface StartupIndexingProgress {
	phase: string
	overallProgress: number
	currentFile?: string
	filesProcessed: number
	totalFiles: number
	estimatedTimeRemaining: number
	canSkip: boolean
	canCancel: boolean
	message: string
}

export interface StartupWorkspaceAnalysis {
	totalFiles: number
	estimatedIndexingTime: number
	requiresMandatoryIndexing: boolean
	criticalFiles: string[]
	highPriorityFiles: string[]
	complexity: "low" | "medium" | "high"
	recommendation: "skip" | "optional" | "recommended" | "mandatory"
}

interface StartupIndexingProgressModalProps {
	isVisible: boolean
	progress: StartupIndexingProgress
	workspaceAnalyses: StartupWorkspaceAnalysis[]
	onSkip?: () => void
	onCancel?: () => void
	onClose?: () => void
}

export const StartupIndexingProgressModal: React.FC<StartupIndexingProgressModalProps> = ({
	isVisible,
	progress,
	workspaceAnalyses,
	onSkip,
	onCancel,
	onClose,
}) => {
	const { t } = useTranslation()
	const [timeElapsed, setTimeElapsed] = useState(0)
	const [startTime] = useState(Date.now())

	// Update elapsed time every second
	useEffect(() => {
		if (!isVisible) return

		const timer = setInterval(() => {
			setTimeElapsed(Date.now() - startTime)
		}, 1000)

		return () => clearInterval(timer)
	}, [isVisible, startTime])

	const handleSkip = useCallback(() => {
		if (progress.canSkip && onSkip) {
			onSkip()
		}
		vscode.postMessage({
			type: "startIndexing",
		})
	}, [progress.canSkip, onSkip])

	const handleCancel = useCallback(() => {
		if (progress.canCancel && onCancel) {
			onCancel()
		}
		vscode.postMessage({
			type: "indexingChoice",
			indexingChoice: "cancel",
		})
	}, [progress.canCancel, onCancel])

	const formatTime = (ms: number): string => {
		const seconds = Math.floor(ms / 1000)
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60

		if (minutes > 0) {
			return `${minutes}m ${remainingSeconds}s`
		}
		return `${remainingSeconds}s`
	}

	const getPhaseDisplayName = (phase: string): string => {
		switch (phase) {
			case "initializing":
				return t("startupIndexing:phases.initializing")
			case "analyzing_workspace":
				return t("startupIndexing:phases.analyzingWorkspace")
			case "indexing_critical":
				return t("startupIndexing:phases.indexingCritical")
			case "indexing_high_priority":
				return t("startupIndexing:phases.indexingHighPriority")
			case "enabling_interaction":
				return t("startupIndexing:phases.enablingInteraction")
			case "background_completion":
				return t("startupIndexing:phases.backgroundCompletion")
			case "completed":
				return t("startupIndexing:phases.completed")
			case "error":
				return t("startupIndexing:phases.error")
			default:
				return phase
		}
	}

	const getComplexityColor = (complexity: "low" | "medium" | "high"): string => {
		switch (complexity) {
			case "low":
				return "var(--vscode-charts-green)"
			case "medium":
				return "var(--vscode-charts-yellow)"
			case "high":
				return "var(--vscode-charts-red)"
			default:
				return "var(--vscode-foreground)"
		}
	}

	const totalFiles = workspaceAnalyses.reduce((sum, analysis) => sum + analysis.totalFiles, 0)
	const totalEstimatedTime = workspaceAnalyses.reduce((sum, analysis) => sum + analysis.estimatedIndexingTime, 0)

	if (!isVisible) return null

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-vscode-editor-background border border-vscode-panel-border rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
				{/* Header */}
				<div className="flex items-center mb-4">
					<div className="mr-3">
						<VSCodeProgressRing />
					</div>
					<div>
						<h2 className="text-lg font-semibold text-vscode-foreground">{t("startupIndexing:title")}</h2>
						<p className="text-sm text-vscode-descriptionForeground">
							{getPhaseDisplayName(progress.phase)}
						</p>
					</div>
				</div>

				{/* Progress Information */}
				<div className="mb-4">
					<div className="flex justify-between items-center mb-2">
						<span className="text-sm text-vscode-foreground">{t("startupIndexing:progress")}</span>
						<span className="text-sm text-vscode-descriptionForeground">
							{Math.round(progress.overallProgress)}%
						</span>
					</div>

					{/* Progress Bar */}
					<div className="w-full bg-vscode-progressBar-background rounded-full h-2 mb-3">
						<div
							className="bg-vscode-progressBar-foreground h-2 rounded-full transition-all duration-300"
							style={{ width: `${progress.overallProgress}%` }}
						/>
					</div>

					{/* Current Status */}
					<p className="text-sm text-vscode-foreground mb-2">{progress.message}</p>

					{progress.currentFile && (
						<p className="text-xs text-vscode-descriptionForeground mb-2 truncate">
							{t("startupIndexing:currentFile")}: {progress.currentFile}
						</p>
					)}

					{/* Time Information */}
					<div className="flex justify-between text-xs text-vscode-descriptionForeground">
						<span>
							{t("startupIndexing:elapsed")}: {formatTime(timeElapsed)}
						</span>
						{progress.estimatedTimeRemaining > 0 && (
							<span>
								{t("startupIndexing:remaining")}: {formatTime(progress.estimatedTimeRemaining)}
							</span>
						)}
					</div>
				</div>

				{/* Workspace Summary */}
				{workspaceAnalyses.length > 0 && (
					<div className="mb-4 p-3 bg-vscode-textCodeBlock-background rounded border">
						<h3 className="text-sm font-medium text-vscode-foreground mb-2">
							{t("startupIndexing:workspaceSummary")}
						</h3>
						<div className="space-y-2">
							{workspaceAnalyses.map((analysis, index) => (
								<div key={index} className="flex justify-between items-center text-xs">
									<div className="flex items-center">
										<div
											className="w-2 h-2 rounded-full mr-2"
											style={{ backgroundColor: getComplexityColor(analysis.complexity) }}
										/>
										<span className="text-vscode-foreground">
											{analysis.totalFiles} {t("startupIndexing:files")}
										</span>
									</div>
									<span className="text-vscode-descriptionForeground">
										{analysis.complexity} {t("startupIndexing:complexity")}
									</span>
								</div>
							))}
						</div>

						{totalFiles > 0 && (
							<div className="mt-2 pt-2 border-t border-vscode-panel-border text-xs">
								<div className="flex justify-between">
									<span className="text-vscode-foreground">
										{t("startupIndexing:total")}: {totalFiles} {t("startupIndexing:files")}
									</span>
									<span className="text-vscode-descriptionForeground">
										~{formatTime(totalEstimatedTime)}
									</span>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Action Buttons */}
				<div className="flex gap-2 justify-end">
					{progress.canCancel && (
						<VSCodeButton appearance="secondary" onClick={handleCancel}>
							{t("startupIndexing:cancel")}
						</VSCodeButton>
					)}

					{progress.canSkip && (
						<VSCodeButton appearance="secondary" onClick={handleSkip}>
							{t("startupIndexing:skip")}
						</VSCodeButton>
					)}

					{progress.phase === "completed" && onClose && (
						<VSCodeButton appearance="primary" onClick={onClose}>
							{t("startupIndexing:continue")}
						</VSCodeButton>
					)}
				</div>

				{/* Help Text */}
				{progress.canSkip && (
					<div className="mt-3 p-2 bg-vscode-inputValidation-infoBackground rounded text-xs">
						<p className="text-vscode-inputValidation-infoForeground">{t("startupIndexing:skipHelp")}</p>
					</div>
				)}
			</div>
		</div>
	)
}

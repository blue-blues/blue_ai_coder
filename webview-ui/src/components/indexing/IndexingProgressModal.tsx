import React, { useState, useEffect, useMemo, useCallback } from "react"
import { X, Clock, FileText, Zap, AlertTriangle, CheckCircle, Pause, Play, Square } from "lucide-react"
import { cn } from "@src/lib/utils"
import { vscode } from "@src/utils/vscode"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { Modal } from "@src/components/common/Modal"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import type { IndexingStatus } from "@blues/ExtensionMessage"

interface IndexingProgressModalProps {
	isOpen: boolean
	onClose: () => void
	indexingStatus: IndexingStatus
	canSkip?: boolean
	canCancel?: boolean
	taskId?: string
	onUserChoice?: (choice: "wait" | "skip" | "cancel") => void
}

interface DetailedProgressInfo {
	currentFile?: string
	elapsedTimeMs: number
	estimatedRemainingMs: number
	filesPerSecond: number
	category?: string
	phase?: string
	errorCount?: number
	warningCount?: number
}

interface PerformanceMetrics {
	memoryUsage: number
	cpuUsage: number
	throughput: number
	cacheHitRate: number
}

export const IndexingProgressModal: React.FC<IndexingProgressModalProps> = ({
	isOpen,
	onClose,
	indexingStatus,
	canSkip = false,
	canCancel = false,
	taskId,
	onUserChoice,
}) => {
	const { t } = useAppTranslation()
	const [detailedProgress, setDetailedProgress] = useState<DetailedProgressInfo>({
		elapsedTimeMs: 0,
		estimatedRemainingMs: 0,
		filesPerSecond: 0,
	})
	const [_performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
		memoryUsage: 0,
		cpuUsage: 0,
		throughput: 0,
		cacheHitRate: 0,
	})
	const [isPaused, setIsPaused] = useState(false)
	const [showDetails, setShowDetails] = useState(false)
	const [recentFiles, setRecentFiles] = useState<string[]>([])

	// Calculate progress percentage
	const progressPercentage = useMemo(() => {
		if (indexingStatus.totalItems === 0) return 0
		return Math.round((indexingStatus.processedItems / indexingStatus.totalItems) * 100)
	}, [indexingStatus.processedItems, indexingStatus.totalItems])

	// Format time duration
	const formatDuration = useCallback((ms: number) => {
		const seconds = Math.floor(ms / 1000)
		const minutes = Math.floor(seconds / 60)
		const hours = Math.floor(minutes / 60)

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m ${seconds % 60}s`
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`
		} else {
			return `${seconds}s`
		}
	}, [])

	// Listen for detailed progress updates
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "indexingDetailedProgress") {
				const progress = event.data.progress
				setDetailedProgress((prev) => ({
					...prev,
					...progress,
				}))

				// Update recent files list
				if (progress.currentFile) {
					setRecentFiles((prev) => {
						const updated = [progress.currentFile, ...prev.slice(0, 4)]
						return Array.from(new Set(updated))
					})
				}
			} else if (event.data.type === "indexingPerformanceMetrics") {
				setPerformanceMetrics(event.data.metrics)
			}
		}

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [])

	// Handle user choice
	const handleUserChoice = useCallback(
		(choice: "wait" | "skip" | "cancel") => {
			if (onUserChoice) {
				onUserChoice(choice)
			}

			vscode.postMessage({
				type: "indexingChoice",
				indexingChoice: choice,
				taskId,
			})

			if (choice === "skip" || choice === "cancel") {
				onClose()
			}
		},
		[onUserChoice, taskId, onClose],
	)

	// Handle pause/resume
	const handlePauseResume = useCallback(() => {
		const newPausedState = !isPaused
		setIsPaused(newPausedState)

		vscode.postMessage({
			type: "indexingPauseResume",
			paused: newPausedState,
			taskId,
		})
	}, [isPaused, taskId])

	// Get status color and icon
	const getStatusInfo = () => {
		switch (indexingStatus.systemStatus) {
			case "Indexing":
				return {
					color: "text-yellow-500",
					bgColor: "bg-yellow-500/10",
					icon: isPaused ? Pause : Play,
					label: isPaused ? t("indexing:status.paused") : t("indexing:status.indexing"),
				}
			case "Indexed":
				return {
					color: "text-green-500",
					bgColor: "bg-green-500/10",
					icon: CheckCircle,
					label: t("indexing:status.completed"),
				}
			case "Error":
				return {
					color: "text-red-500",
					bgColor: "bg-red-500/10",
					icon: AlertTriangle,
					label: t("indexing:status.error"),
				}
			default:
				return {
					color: "text-gray-500",
					bgColor: "bg-gray-500/10",
					icon: Clock,
					label: t("indexing:status.standby"),
				}
		}
	}

	const statusInfo = getStatusInfo()
	const StatusIcon = statusInfo.icon

	if (!isOpen) return null

	return (
		<Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
			{/* Header */}
			<div className="flex items-center justify-between p-6 border-b border-vscode-panel-border">
				<div className="flex items-center gap-3">
					<div className={cn("p-2 rounded-lg", statusInfo.bgColor)}>
						<StatusIcon className={cn("w-6 h-6", statusInfo.color)} />
					</div>
					<div>
						<h2 className="text-lg font-semibold text-vscode-foreground">{t("indexing:modal.title")}</h2>
						<p className={cn("text-sm", statusInfo.color)}>{statusInfo.label}</p>
					</div>
				</div>
				<button
					onClick={onClose}
					className="p-2 hover:bg-vscode-toolbar-hoverBackground rounded-md transition-colors">
					<X className="w-5 h-5 text-vscode-foreground" />
				</button>
			</div>

			{/* Main Content */}
			<div className="p-6 space-y-6">
				{/* Progress Overview */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium text-vscode-foreground">
							{t("indexing:progress.overall")}
						</span>
						<span className="text-sm text-vscode-descriptionForeground">
							{indexingStatus.processedItems} / {indexingStatus.totalItems}{" "}
							{indexingStatus.currentItemUnit || "items"}
						</span>
					</div>

					<ProgressPrimitive.Root
						className="relative h-3 w-full overflow-hidden rounded-full bg-vscode-progressBar-background"
						value={progressPercentage}>
						<ProgressPrimitive.Indicator
							className="h-full w-full flex-1 bg-vscode-progressBar-foreground transition-transform duration-300 ease-in-out"
							style={{
								transform: `translateX(-${100 - progressPercentage}%)`,
							}}
						/>
					</ProgressPrimitive.Root>

					<div className="flex items-center justify-between text-sm text-vscode-descriptionForeground">
						<span>
							{progressPercentage}% {t("indexing:progress.complete")}
						</span>
						{detailedProgress.estimatedRemainingMs > 0 && (
							<span>
								{t("indexing:progress.remaining")}:{" "}
								{formatDuration(detailedProgress.estimatedRemainingMs)}
							</span>
						)}
					</div>
				</div>

				{/* Current Activity */}
				{detailedProgress.currentFile && (
					<div className="space-y-2">
						<h3 className="text-sm font-medium text-vscode-foreground">
							{t("indexing:progress.currentFile")}
						</h3>
						<div className="flex items-center gap-2 p-3 bg-vscode-editor-background rounded-lg">
							<FileText className="w-4 h-4 text-vscode-descriptionForeground flex-shrink-0" />
							<span className="text-sm text-vscode-foreground font-mono truncate">
								{detailedProgress.currentFile}
							</span>
						</div>
					</div>
				)}

				{/* Performance Metrics */}
				{showDetails && (
					<div className="space-y-4">
						<h3 className="text-sm font-medium text-vscode-foreground">
							{t("indexing:performance.title")}
						</h3>
						<div className="grid grid-cols-2 gap-4">
							<div className="p-3 bg-vscode-editor-background rounded-lg">
								<div className="flex items-center gap-2">
									<Zap className="w-4 h-4 text-blue-500" />
									<span className="text-xs text-vscode-descriptionForeground">
										{t("indexing:performance.throughput")}
									</span>
								</div>
								<span className="text-sm font-medium text-vscode-foreground">
									{detailedProgress.filesPerSecond.toFixed(1)} files/sec
								</span>
							</div>
							<div className="p-3 bg-vscode-editor-background rounded-lg">
								<div className="flex items-center gap-2">
									<Clock className="w-4 h-4 text-green-500" />
									<span className="text-xs text-vscode-descriptionForeground">
										{t("indexing:performance.elapsed")}
									</span>
								</div>
								<span className="text-sm font-medium text-vscode-foreground">
									{formatDuration(detailedProgress.elapsedTimeMs)}
								</span>
							</div>
						</div>

						{/* Recent Files */}
						{recentFiles.length > 0 && (
							<div className="space-y-2">
								<h4 className="text-xs font-medium text-vscode-descriptionForeground">
									{t("indexing:progress.recentFiles")}
								</h4>
								<div className="space-y-1">
									{recentFiles.map((file, index) => (
										<div
											key={file}
											className={cn(
												"text-xs font-mono text-vscode-descriptionForeground truncate",
												index === 0 && "text-vscode-foreground font-medium",
											)}>
											{file}
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}

				{/* Error/Warning Summary */}
				{(detailedProgress.errorCount || detailedProgress.warningCount) && (
					<div className="p-3 bg-vscode-inputValidation-warningBackground/10 border border-vscode-inputValidation-warningBorder rounded-lg">
						<div className="flex items-center gap-2">
							<AlertTriangle className="w-4 h-4 text-vscode-inputValidation-warningForeground" />
							<span className="text-sm text-vscode-foreground">
								{detailedProgress.errorCount || 0} {t("indexing:progress.errors")},{" "}
								{detailedProgress.warningCount || 0} {t("indexing:progress.warnings")}
							</span>
						</div>
					</div>
				)}

				{/* Message */}
				{indexingStatus.message && (
					<div className="p-3 bg-vscode-editor-background rounded-lg">
						<p className="text-sm text-vscode-descriptionForeground">{indexingStatus.message}</p>
					</div>
				)}
			</div>

			{/* Footer Actions */}
			<div className="flex items-center justify-between p-6 border-t border-vscode-panel-border">
				<div className="flex items-center gap-2">
					<button
						onClick={() => setShowDetails(!showDetails)}
						className="text-xs text-vscode-textLink-foreground hover:text-vscode-textLink-activeForeground">
						{showDetails ? t("indexing:modal.hideDetails") : t("indexing:modal.showDetails")}
					</button>
				</div>

				<div className="flex items-center gap-2">
					{indexingStatus.systemStatus === "Indexing" && (
						<VSCodeButton appearance="secondary" onClick={handlePauseResume}>
							{isPaused ? (
								<>
									<Play className="w-4 h-4 mr-2" />
									{t("indexing:actions.resume")}
								</>
							) : (
								<>
									<Pause className="w-4 h-4 mr-2" />
									{t("indexing:actions.pause")}
								</>
							)}
						</VSCodeButton>
					)}

					{canSkip && (
						<VSCodeButton appearance="secondary" onClick={() => handleUserChoice("skip")}>
							{t("indexing:actions.skip")}
						</VSCodeButton>
					)}

					{canCancel && (
						<VSCodeButton appearance="secondary" onClick={() => handleUserChoice("cancel")}>
							<Square className="w-4 h-4 mr-2" />
							{t("indexing:actions.cancel")}
						</VSCodeButton>
					)}

					<VSCodeButton onClick={() => handleUserChoice("wait")}>{t("indexing:actions.wait")}</VSCodeButton>
				</div>
			</div>
		</Modal>
	)
}

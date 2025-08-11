import React, { useState, useEffect, useMemo } from "react"
import { Database, AlertTriangle, CheckCircle, Clock, Zap, Pause } from "lucide-react"
import { cn } from "@src/lib/utils"
import { vscode } from "@src/utils/vscode"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { useExtensionState } from "@src/context/ExtensionStateContext"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import type { IndexingStatus } from "@roo/ExtensionMessage"

interface IndexingStatusIndicatorProps {
	className?: string
	variant?: "compact" | "detailed" | "minimal"
	showProgress?: boolean
	onClick?: () => void
}

interface ExtendedIndexingStatus extends IndexingStatus {
	isPaused?: boolean
	throughput?: number
	estimatedRemainingMs?: number
}

export const IndexingStatusIndicator: React.FC<IndexingStatusIndicatorProps> = ({
	className,
	variant = "compact",
	showProgress = true,
	onClick,
}) => {
	const { t } = useAppTranslation()
	const { cwd } = useExtensionState()
	const [indexingStatus, setIndexingStatus] = useState<ExtendedIndexingStatus>({
		systemStatus: "Standby",
		processedItems: 0,
		totalItems: 0,
		currentItemUnit: "items",
	})

	// Listen for indexing status updates
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "indexingStatusUpdate") {
				const status = event.data.values
				if (!status.workspacePath || status.workspacePath === cwd) {
					setIndexingStatus((prev) => ({
						...prev,
						...status,
					}))
				}
			} else if (event.data.type === "indexingDetailedProgress") {
				const progress = event.data.progress
				setIndexingStatus((prev) => ({
					...prev,
					throughput: progress.filesPerSecond,
					estimatedRemainingMs: progress.estimatedRemainingMs,
					isPaused: progress.isPaused,
				}))
			}
		}

		// Request initial status
		vscode.postMessage({ type: "requestIndexingStatus" })

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [cwd])

	// Calculate progress percentage
	const progressPercentage = useMemo(() => {
		if (indexingStatus.totalItems === 0) return 0
		return Math.round((indexingStatus.processedItems / indexingStatus.totalItems) * 100)
	}, [indexingStatus.processedItems, indexingStatus.totalItems])

	// Format time remaining
	const formatTimeRemaining = (ms: number) => {
		const seconds = Math.floor(ms / 1000)
		const minutes = Math.floor(seconds / 60)
		if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`
		}
		return `${seconds}s`
	}

	// Get status configuration
	const getStatusConfig = () => {
		const isPaused = indexingStatus.isPaused

		switch (indexingStatus.systemStatus) {
			case "Indexing":
				return {
					icon: isPaused ? Pause : Zap,
					color: isPaused ? "text-orange-500" : "text-yellow-500",
					bgColor: isPaused ? "bg-orange-500/10" : "bg-yellow-500/10",
					borderColor: isPaused ? "border-orange-500/20" : "border-yellow-500/20",
					label: isPaused ? t("indexing:status.paused") : t("indexing:status.indexing"),
					animate: !isPaused,
				}
			case "Indexed":
				return {
					icon: CheckCircle,
					color: "text-green-500",
					bgColor: "bg-green-500/10",
					borderColor: "border-green-500/20",
					label: t("indexing:status.completed"),
					animate: false,
				}
			case "Error":
				return {
					icon: AlertTriangle,
					color: "text-red-500",
					bgColor: "bg-red-500/10",
					borderColor: "border-red-500/20",
					label: t("indexing:status.error"),
					animate: false,
				}
			default:
				return {
					icon: Clock,
					color: "text-gray-500",
					bgColor: "bg-gray-500/10",
					borderColor: "border-gray-500/20",
					label: t("indexing:status.standby"),
					animate: false,
				}
		}
	}

	const statusConfig = getStatusConfig()
	const StatusIcon = statusConfig.icon

	// Render minimal variant
	if (variant === "minimal") {
		return (
			<button
				onClick={onClick}
				className={cn(
					"inline-flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200",
					statusConfig.bgColor,
					statusConfig.borderColor,
					"border hover:scale-110 focus:outline-none focus:ring-2 focus:ring-vscode-focusBorder",
					className,
				)}>
				<StatusIcon className={cn("w-3 h-3", statusConfig.color, statusConfig.animate && "animate-pulse")} />
			</button>
		)
	}

	// Render compact variant
	if (variant === "compact") {
		return (
			<button
				onClick={onClick}
				className={cn(
					"inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
					statusConfig.bgColor,
					statusConfig.borderColor,
					"border hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-vscode-focusBorder",
					className,
				)}>
				<StatusIcon className={cn("w-4 h-4", statusConfig.color, statusConfig.animate && "animate-pulse")} />
				<span className="text-sm font-medium text-vscode-foreground">{statusConfig.label}</span>
				{indexingStatus.systemStatus === "Indexing" && (
					<span className="text-xs text-vscode-descriptionForeground">{progressPercentage}%</span>
				)}
			</button>
		)
	}

	// Render detailed variant
	return (
		<div
			className={cn(
				"p-4 rounded-lg border transition-all duration-200",
				statusConfig.bgColor,
				statusConfig.borderColor,
				onClick && "cursor-pointer hover:bg-opacity-80",
				className,
			)}
			onClick={onClick}>
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<StatusIcon
						className={cn("w-5 h-5", statusConfig.color, statusConfig.animate && "animate-pulse")}
					/>
					<span className="font-medium text-vscode-foreground">{statusConfig.label}</span>
				</div>
				{indexingStatus.systemStatus === "Indexing" && (
					<span className="text-sm font-mono text-vscode-descriptionForeground">{progressPercentage}%</span>
				)}
			</div>

			{/* Progress Bar */}
			{showProgress && indexingStatus.systemStatus === "Indexing" && (
				<div className="mb-3">
					<ProgressPrimitive.Root
						className="relative h-2 w-full overflow-hidden rounded-full bg-vscode-progressBar-background"
						value={progressPercentage}>
						<ProgressPrimitive.Indicator
							className="h-full w-full flex-1 bg-vscode-progressBar-foreground transition-transform duration-300 ease-in-out"
							style={{
								transform: `translateX(-${100 - progressPercentage}%)`,
							}}
						/>
					</ProgressPrimitive.Root>
				</div>
			)}

			{/* Details */}
			<div className="space-y-1 text-xs text-vscode-descriptionForeground">
				{indexingStatus.systemStatus === "Indexing" && (
					<>
						<div className="flex justify-between">
							<span>
								{indexingStatus.processedItems} / {indexingStatus.totalItems}{" "}
								{indexingStatus.currentItemUnit}
							</span>
							{indexingStatus.throughput && <span>{indexingStatus.throughput.toFixed(1)} files/sec</span>}
						</div>
						{indexingStatus.estimatedRemainingMs && (
							<div className="flex justify-between">
								<span>{t("indexing:progress.remaining")}:</span>
								<span>{formatTimeRemaining(indexingStatus.estimatedRemainingMs)}</span>
							</div>
						)}
					</>
				)}

				{indexingStatus.message && (
					<div className="text-xs text-vscode-descriptionForeground mt-2 truncate">
						{indexingStatus.message}
					</div>
				)}
			</div>
		</div>
	)
}

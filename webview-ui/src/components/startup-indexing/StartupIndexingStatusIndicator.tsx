import React from "react"
import { useTranslation } from "react-i18next"

export interface StartupIndexingStatus {
	phase: string
	isBlocking: boolean
	overallProgress: number
	message: string
}

interface StartupIndexingStatusIndicatorProps {
	status: StartupIndexingStatus
	onClick?: () => void
}

export const StartupIndexingStatusIndicator: React.FC<StartupIndexingStatusIndicatorProps> = ({ status, onClick }) => {
	const { t } = useTranslation()

	const getPhaseIcon = (phase: string): string => {
		switch (phase) {
			case "initializing":
				return "⚡"
			case "analyzing_workspace":
				return "🔍"
			case "indexing_critical":
				return "🚀"
			case "indexing_high_priority":
				return "⚡"
			case "enabling_interaction":
				return "✅"
			case "background_completion":
				return "🔄"
			case "completed":
				return "✅"
			case "error":
				return "❌"
			default:
				return "🔄"
		}
	}

	const getPhaseColor = (phase: string): string => {
		switch (phase) {
			case "initializing":
			case "analyzing_workspace":
				return "var(--vscode-charts-blue)"
			case "indexing_critical":
			case "indexing_high_priority":
				return "var(--vscode-charts-orange)"
			case "enabling_interaction":
			case "completed":
				return "var(--vscode-charts-green)"
			case "background_completion":
				return "var(--vscode-charts-purple)"
			case "error":
				return "var(--vscode-charts-red)"
			default:
				return "var(--vscode-foreground)"
		}
	}

	const getDisplayMessage = (phase: string, message: string): string => {
		if (message) return message

		switch (phase) {
			case "initializing":
				return t("startupIndexing:status.initializing")
			case "analyzing_workspace":
				return t("startupIndexing:status.analyzing")
			case "indexing_critical":
				return t("startupIndexing:status.indexingCritical")
			case "indexing_high_priority":
				return t("startupIndexing:status.indexingHigh")
			case "enabling_interaction":
				return t("startupIndexing:status.enabling")
			case "background_completion":
				return t("startupIndexing:status.completing")
			case "completed":
				return t("startupIndexing:status.completed")
			case "error":
				return t("startupIndexing:status.error")
			default:
				return t("startupIndexing:status.processing")
		}
	}

	if (status.phase === "completed" && !status.isBlocking) {
		return null // Don't show indicator when completed and not blocking
	}

	return (
		<div
			className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all duration-200 ${
				onClick ? "cursor-pointer hover:bg-vscode-list-hoverBackground" : ""
			} ${
				status.isBlocking
					? "bg-vscode-inputValidation-warningBackground border-vscode-inputValidation-warningBorder"
					: "bg-vscode-badge-background border-vscode-badge-foreground"
			}`}
			onClick={onClick}
			title={
				status.isBlocking ? t("startupIndexing:blocking.tooltip") : t("startupIndexing:nonBlocking.tooltip")
			}>
			{/* Phase Icon */}
			<span className="text-sm" style={{ color: getPhaseColor(status.phase) }}>
				{getPhaseIcon(status.phase)}
			</span>

			{/* Progress Ring for Active Phases */}
			{status.phase !== "completed" && status.phase !== "error" && (
				<div className="relative w-4 h-4">
					<svg className="w-4 h-4 transform -rotate-90" viewBox="0 0 16 16">
						<circle
							cx="8"
							cy="8"
							r="6"
							stroke="var(--vscode-progressBar-background)"
							strokeWidth="2"
							fill="none"
						/>
						<circle
							cx="8"
							cy="8"
							r="6"
							stroke={getPhaseColor(status.phase)}
							strokeWidth="2"
							fill="none"
							strokeDasharray={`${2 * Math.PI * 6}`}
							strokeDashoffset={`${2 * Math.PI * 6 * (1 - status.overallProgress / 100)}`}
							className="transition-all duration-300"
						/>
					</svg>
				</div>
			)}

			{/* Status Text */}
			<div className="flex flex-col min-w-0">
				<span
					className={`text-xs font-medium truncate ${
						status.isBlocking
							? "text-vscode-inputValidation-warningForeground"
							: "text-vscode-badge-foreground"
					}`}>
					{getDisplayMessage(status.phase, status.message)}
				</span>

				{status.overallProgress > 0 && status.phase !== "completed" && (
					<span className="text-xs text-vscode-descriptionForeground">
						{Math.round(status.overallProgress)}% {t("startupIndexing:complete")}
					</span>
				)}
			</div>

			{/* Blocking Indicator */}
			{status.isBlocking && (
				<div className="flex items-center">
					<span className="text-xs text-vscode-inputValidation-warningForeground font-medium">
						{t("startupIndexing:blocking.label")}
					</span>
				</div>
			)}
		</div>
	)
}

import React, { useState, useEffect } from "react"
import { BarChart3, Zap, HardDrive, Cpu, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@src/lib/utils"
import { vscode } from "@src/utils/vscode"
import { useAppTranslation } from "@/i18n/TranslationContext"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"

interface PerformanceMetrics {
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

interface OptimizationSuggestion {
	id: string
	type: "performance" | "resource" | "configuration"
	severity: "low" | "medium" | "high"
	title: string
	description: string
	impact: string
	action?: string
	actionType?: "setting" | "restart" | "config"
}

interface PerformanceMetricsPanelProps {
	className?: string
	variant?: "compact" | "detailed"
	showOptimizations?: boolean
}

export const PerformanceMetricsPanel: React.FC<PerformanceMetricsPanelProps> = ({
	className,
	variant = "detailed",
	showOptimizations = true,
}) => {
	const { t } = useAppTranslation()
	const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
	const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([])
	const [historicalData, setHistoricalData] = useState<PerformanceMetrics[]>([])
	const [isLoading, setIsLoading] = useState(true)

	// Fetch performance metrics
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "performanceMetrics") {
				const newMetrics = event.data.metrics
				setMetrics(newMetrics)
				setIsLoading(false)

				// Add to historical data (keep last 10 entries)
				setHistoricalData((prev) => {
					const updated = [newMetrics, ...prev.slice(0, 9)]
					return updated
				})
			} else if (event.data.type === "optimizationSuggestions") {
				setSuggestions(event.data.suggestions)
			}
		}

		// Request initial metrics
		vscode.postMessage({ type: "requestPerformanceMetrics" })

		// Set up periodic updates
		const interval = setInterval(() => {
			vscode.postMessage({ type: "requestPerformanceMetrics" })
		}, 5000)

		window.addEventListener("message", handleMessage)
		return () => {
			window.removeEventListener("message", handleMessage)
			clearInterval(interval)
		}
	}, [])

	// Calculate trends
	const getTrend = (current: number, previous: number) => {
		if (!previous) return "stable"
		const change = ((current - previous) / previous) * 100
		if (Math.abs(change) < 5) return "stable"
		return change > 0 ? "up" : "down"
	}

	// Format bytes
	const formatBytes = (bytes: number) => {
		const units = ["B", "KB", "MB", "GB"]
		let size = bytes
		let unitIndex = 0

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024
			unitIndex++
		}

		return `${size.toFixed(1)} ${units[unitIndex]}`
	}

	// Format duration
	const formatDuration = (ms: number) => {
		if (ms < 1000) return `${ms.toFixed(0)}ms`
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
		return `${(ms / 60000).toFixed(1)}m`
	}

	// Apply optimization
	const applyOptimization = (suggestion: OptimizationSuggestion) => {
		vscode.postMessage({
			type: "applyOptimization",
			suggestionId: suggestion.id,
			actionType: suggestion.actionType,
		})
	}

	// Dismiss suggestion
	const dismissSuggestion = (suggestionId: string) => {
		setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
		vscode.postMessage({
			type: "dismissOptimizationSuggestion",
			suggestionId,
		})
	}

	if (isLoading) {
		return (
			<div className={cn("p-4 rounded-lg border border-vscode-panel-border", className)}>
				<div className="flex items-center gap-2 mb-4">
					<BarChart3 className="w-5 h-5 text-vscode-descriptionForeground animate-pulse" />
					<span className="font-medium text-vscode-foreground">{t("indexing:performance.loading")}</span>
				</div>
			</div>
		)
	}

	if (!metrics) {
		return (
			<div className={cn("p-4 rounded-lg border border-vscode-panel-border", className)}>
				<div className="flex items-center gap-2 text-vscode-descriptionForeground">
					<AlertCircle className="w-5 h-5" />
					<span>{t("indexing:performance.unavailable")}</span>
				</div>
			</div>
		)
	}

	const previousMetrics = historicalData[1]

	// Render compact variant
	if (variant === "compact") {
		return (
			<div className={cn("p-3 rounded-lg border border-vscode-panel-border", className)}>
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2">
						<BarChart3 className="w-4 h-4 text-vscode-descriptionForeground" />
						<span className="text-sm font-medium text-vscode-foreground">
							{t("indexing:performance.title")}
						</span>
					</div>
					<div className="flex items-center gap-1">
						{suggestions.length > 0 && (
							<span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">
								{suggestions.length} {t("indexing:performance.suggestions")}
							</span>
						)}
					</div>
				</div>

				<div className="grid grid-cols-3 gap-2 text-xs">
					<div className="text-center">
						<div className="text-vscode-descriptionForeground">{t("indexing:performance.throughput")}</div>
						<div className="font-mono text-vscode-foreground">{metrics.filesPerSecond.toFixed(1)}/s</div>
					</div>
					<div className="text-center">
						<div className="text-vscode-descriptionForeground">{t("indexing:performance.memory")}</div>
						<div className="font-mono text-vscode-foreground">{formatBytes(metrics.memoryUsage)}</div>
					</div>
					<div className="text-center">
						<div className="text-vscode-descriptionForeground">{t("indexing:performance.success")}</div>
						<div className="font-mono text-vscode-foreground">{metrics.successRate.toFixed(1)}%</div>
					</div>
				</div>
			</div>
		)
	}

	// Render detailed variant
	return (
		<div className={cn("space-y-4", className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<BarChart3 className="w-5 h-5 text-vscode-descriptionForeground" />
					<h3 className="font-medium text-vscode-foreground">{t("indexing:performance.title")}</h3>
				</div>
				<VSCodeButton
					appearance="icon"
					onClick={() => vscode.postMessage({ type: "exportPerformanceReport" })}
					title={t("indexing:performance.export")}>
					<TrendingUp className="w-4 h-4" />
				</VSCodeButton>
			</div>

			{/* Key Metrics Grid */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Throughput */}
				<div className="p-3 bg-vscode-editor-background rounded-lg border border-vscode-panel-border">
					<div className="flex items-center justify-between mb-2">
						<Zap className="w-4 h-4 text-blue-500" />
						{previousMetrics && (
							<div className="flex items-center gap-1">
								{getTrend(metrics.filesPerSecond, previousMetrics.filesPerSecond) === "up" ? (
									<TrendingUp className="w-3 h-3 text-green-500" />
								) : getTrend(metrics.filesPerSecond, previousMetrics.filesPerSecond) === "down" ? (
									<TrendingDown className="w-3 h-3 text-red-500" />
								) : null}
							</div>
						)}
					</div>
					<div className="text-lg font-mono text-vscode-foreground">{metrics.filesPerSecond.toFixed(1)}</div>
					<div className="text-xs text-vscode-descriptionForeground">
						{t("indexing:performance.filesPerSecond")}
					</div>
				</div>

				{/* Memory Usage */}
				<div className="p-3 bg-vscode-editor-background rounded-lg border border-vscode-panel-border">
					<div className="flex items-center justify-between mb-2">
						<HardDrive className="w-4 h-4 text-purple-500" />
						<div className="text-xs text-vscode-descriptionForeground">
							{((metrics.memoryUsage / (1024 * 1024 * 1024)) * 100).toFixed(0)}%
						</div>
					</div>
					<div className="text-lg font-mono text-vscode-foreground">{formatBytes(metrics.memoryUsage)}</div>
					<div className="text-xs text-vscode-descriptionForeground">
						{t("indexing:performance.memoryUsage")}
					</div>
				</div>

				{/* Success Rate */}
				<div className="p-3 bg-vscode-editor-background rounded-lg border border-vscode-panel-border">
					<div className="flex items-center justify-between mb-2">
						<CheckCircle className="w-4 h-4 text-green-500" />
						<ProgressPrimitive.Root
							className="w-8 h-1 bg-vscode-progressBar-background rounded-full"
							value={metrics.successRate}>
							<ProgressPrimitive.Indicator
								className="h-full bg-green-500 rounded-full transition-transform duration-300"
								style={{ transform: `translateX(-${100 - metrics.successRate}%)` }}
							/>
						</ProgressPrimitive.Root>
					</div>
					<div className="text-lg font-mono text-vscode-foreground">{metrics.successRate.toFixed(1)}%</div>
					<div className="text-xs text-vscode-descriptionForeground">
						{t("indexing:performance.successRate")}
					</div>
				</div>

				{/* Cache Hit Rate */}
				<div className="p-3 bg-vscode-editor-background rounded-lg border border-vscode-panel-border">
					<div className="flex items-center justify-between mb-2">
						<Cpu className="w-4 h-4 text-orange-500" />
						<ProgressPrimitive.Root
							className="w-8 h-1 bg-vscode-progressBar-background rounded-full"
							value={metrics.cacheHitRate}>
							<ProgressPrimitive.Indicator
								className="h-full bg-orange-500 rounded-full transition-transform duration-300"
								style={{ transform: `translateX(-${100 - metrics.cacheHitRate}%)` }}
							/>
						</ProgressPrimitive.Root>
					</div>
					<div className="text-lg font-mono text-vscode-foreground">{metrics.cacheHitRate.toFixed(1)}%</div>
					<div className="text-xs text-vscode-descriptionForeground">
						{t("indexing:performance.cacheHitRate")}
					</div>
				</div>
			</div>

			{/* Detailed Metrics */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{/* Timing Metrics */}
				<div className="p-4 bg-vscode-editor-background rounded-lg border border-vscode-panel-border">
					<h4 className="text-sm font-medium text-vscode-foreground mb-3">
						{t("indexing:performance.timing")}
					</h4>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-vscode-descriptionForeground">
								{t("indexing:performance.avgFileTime")}
							</span>
							<span className="font-mono text-vscode-foreground">
								{formatDuration(metrics.averageFileProcessingTime)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-vscode-descriptionForeground">
								{t("indexing:performance.avgBatchTime")}
							</span>
							<span className="font-mono text-vscode-foreground">
								{formatDuration(metrics.averageBatchProcessingTime)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-vscode-descriptionForeground">
								{t("indexing:performance.queueWaitTime")}
							</span>
							<span className="font-mono text-vscode-foreground">
								{formatDuration(metrics.averageQueueWaitTime)}
							</span>
						</div>
					</div>
				</div>

				{/* Resource Metrics */}
				<div className="p-4 bg-vscode-editor-background rounded-lg border border-vscode-panel-border">
					<h4 className="text-sm font-medium text-vscode-foreground mb-3">
						{t("indexing:performance.resources")}
					</h4>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-vscode-descriptionForeground">
								{t("indexing:performance.cpuUsage")}
							</span>
							<span className="font-mono text-vscode-foreground">{metrics.cpuUsage.toFixed(1)}%</span>
						</div>
						<div className="flex justify-between">
							<span className="text-vscode-descriptionForeground">
								{t("indexing:performance.diskIO")}
							</span>
							<span className="font-mono text-vscode-foreground">
								{formatBytes(metrics.diskIORate)}/s
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-vscode-descriptionForeground">
								{t("indexing:performance.concurrency")}
							</span>
							<span className="font-mono text-vscode-foreground">
								{metrics.concurrencyUtilization.toFixed(1)}%
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Optimization Suggestions */}
			{showOptimizations && suggestions.length > 0 && (
				<div className="space-y-3">
					<h4 className="text-sm font-medium text-vscode-foreground">
						{t("indexing:performance.optimizations")}
					</h4>
					{suggestions.map((suggestion) => (
						<div
							key={suggestion.id}
							className={cn(
								"p-3 rounded-lg border",
								suggestion.severity === "high" && "border-red-500/30 bg-red-500/5",
								suggestion.severity === "medium" && "border-yellow-500/30 bg-yellow-500/5",
								suggestion.severity === "low" && "border-blue-500/30 bg-blue-500/5",
							)}>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<span
											className={cn(
												"text-xs px-2 py-1 rounded uppercase font-medium",
												suggestion.severity === "high" && "bg-red-500/20 text-red-500",
												suggestion.severity === "medium" && "bg-yellow-500/20 text-yellow-500",
												suggestion.severity === "low" && "bg-blue-500/20 text-blue-500",
											)}>
											{suggestion.severity}
										</span>
										<span className="text-sm font-medium text-vscode-foreground">
											{suggestion.title}
										</span>
									</div>
									<p className="text-sm text-vscode-descriptionForeground mb-2">
										{suggestion.description}
									</p>
									<p className="text-xs text-vscode-descriptionForeground">
										<strong>{t("indexing:performance.impact")}:</strong> {suggestion.impact}
									</p>
								</div>
								<div className="flex items-center gap-2 ml-4">
									{suggestion.action && (
										<VSCodeButton
											appearance="secondary"
											onClick={() => applyOptimization(suggestion)}>
											{suggestion.action}
										</VSCodeButton>
									)}
									<VSCodeButton
										appearance="icon"
										onClick={() => dismissSuggestion(suggestion.id)}
										title={t("indexing:performance.dismiss")}>
										<AlertCircle className="w-4 h-4" />
									</VSCodeButton>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

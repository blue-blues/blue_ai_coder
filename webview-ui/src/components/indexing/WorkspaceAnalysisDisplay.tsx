import React, { useState, useEffect, useMemo } from "react"
import {
	FolderTree,
	FileText,
	Code,
	Database,
	TrendingUp,
	AlertCircle,
	CheckCircle,
	Info,
	Eye,
	EyeOff,
} from "lucide-react"
import { cn } from "@src/lib/utils"
import { vscode } from "@src/utils/vscode"
import { useAppTranslation } from "@/i18n/TranslationContext"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { StandardTooltip } from "@src/components/ui"

interface FileAnalysis {
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

interface DirectoryAnalysis {
	path: string
	fileCount: number
	totalSize: number
	languages: Record<string, number>
	avgComplexity: number
	priority: "high" | "medium" | "low"
	subdirectories: DirectoryAnalysis[]
}

interface WorkspaceAnalysis {
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

interface WorkspaceAnalysisDisplayProps {
	className?: string
	variant?: "compact" | "detailed"
	showRecommendations?: boolean
}

export const WorkspaceAnalysisDisplay: React.FC<WorkspaceAnalysisDisplayProps> = ({
	className,
	variant = "detailed",
	showRecommendations = true,
}) => {
	const { t } = useAppTranslation()
	const [analysis, setAnalysis] = useState<WorkspaceAnalysis | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [expandedDirectories, setExpandedDirectories] = useState<Set<string>>(new Set())
	const [selectedView, setSelectedView] = useState<"overview" | "files" | "directories" | "recommendations">(
		"overview",
	)

	// Fetch workspace analysis
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "workspaceAnalysis") {
				setAnalysis(event.data.analysis)
				setIsLoading(false)
			}
		}

		// Request analysis
		vscode.postMessage({ type: "requestWorkspaceAnalysis" })

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [])

	// Toggle directory expansion
	const toggleDirectory = (path: string) => {
		setExpandedDirectories((prev) => {
			const updated = new Set(prev)
			if (updated.has(path)) {
				updated.delete(path)
			} else {
				updated.add(path)
			}
			return updated
		})
	}

	// Format file size
	const formatSize = (bytes: number) => {
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
		const seconds = Math.floor(ms / 1000)
		const minutes = Math.floor(seconds / 60)
		const hours = Math.floor(minutes / 60)

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`
		} else {
			return `${seconds}s`
		}
	}

	// Get priority color
	const getPriorityColor = (priority: "high" | "medium" | "low") => {
		switch (priority) {
			case "high":
				return "text-red-500"
			case "medium":
				return "text-yellow-500"
			case "low":
				return "text-green-500"
		}
	}

	// Get language color
	const getLanguageColor = (language: string) => {
		const colors: Record<string, string> = {
			typescript: "bg-blue-500",
			javascript: "bg-yellow-500",
			python: "bg-green-500",
			java: "bg-orange-500",
			cpp: "bg-purple-500",
			csharp: "bg-indigo-500",
			go: "bg-cyan-500",
			rust: "bg-red-500",
			php: "bg-violet-500",
		}
		return colors[language.toLowerCase()] || "bg-gray-500"
	}

	// Render directory tree
	const renderDirectoryTree = (directory: DirectoryAnalysis, depth = 0) => {
		const isExpanded = expandedDirectories.has(directory.path)

		return (
			<div key={directory.path} className="space-y-1">
				<div
					className={cn(
						"flex items-center gap-2 p-2 rounded hover:bg-vscode-list-hoverBackground cursor-pointer",
						depth > 0 && "ml-4",
					)}
					onClick={() => toggleDirectory(directory.path)}>
					<div className="flex items-center gap-1">
						{directory.subdirectories.length > 0 && (
							<span className={cn("text-xs", isExpanded ? "rotate-90" : "")}>▶</span>
						)}
						<FolderTree className="w-4 h-4 text-vscode-descriptionForeground" />
					</div>
					<span className="text-sm font-medium text-vscode-foreground flex-1">
						{directory.path.split("/").pop()}
					</span>
					<div className="flex items-center gap-2 text-xs text-vscode-descriptionForeground">
						<span>{directory.fileCount} files</span>
						<span>{formatSize(directory.totalSize)}</span>
						<span className={cn("px-1 rounded", getPriorityColor(directory.priority))}>
							{directory.priority}
						</span>
					</div>
				</div>

				{isExpanded && directory.subdirectories.map((subdir) => renderDirectoryTree(subdir, depth + 1))}
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className={cn("p-4 rounded-lg border border-vscode-panel-border", className)}>
				<div className="flex items-center gap-2 mb-4">
					<Database className="w-5 h-5 text-vscode-descriptionForeground animate-pulse" />
					<span className="font-medium text-vscode-foreground">{t("indexing:analysis.loading")}</span>
				</div>
			</div>
		)
	}

	if (!analysis) {
		return (
			<div className={cn("p-4 rounded-lg border border-vscode-panel-border", className)}>
				<div className="flex items-center gap-2 text-vscode-descriptionForeground">
					<AlertCircle className="w-5 h-5" />
					<span>{t("indexing:analysis.unavailable")}</span>
				</div>
			</div>
		)
	}

	// Render compact variant
	if (variant === "compact") {
		return (
			<div className={cn("p-3 rounded-lg border border-vscode-panel-border", className)}>
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2">
						<Database className="w-4 h-4 text-vscode-descriptionForeground" />
						<span className="text-sm font-medium text-vscode-foreground">
							{t("indexing:analysis.title")}
						</span>
					</div>
					<span className="text-xs text-vscode-descriptionForeground">{analysis.totalFiles} files</span>
				</div>

				<div className="grid grid-cols-3 gap-2 text-xs">
					<div className="text-center">
						<div className="text-vscode-descriptionForeground">{t("indexing:analysis.size")}</div>
						<div className="font-mono text-vscode-foreground">{formatSize(analysis.totalSize)}</div>
					</div>
					<div className="text-center">
						<div className="text-vscode-descriptionForeground">{t("indexing:analysis.languages")}</div>
						<div className="font-mono text-vscode-foreground">{Object.keys(analysis.languages).length}</div>
					</div>
					<div className="text-center">
						<div className="text-vscode-descriptionForeground">{t("indexing:analysis.estimate")}</div>
						<div className="font-mono text-vscode-foreground">
							{formatDuration(analysis.indexingEstimate.estimatedTimeMs)}
						</div>
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
					<Database className="w-5 h-5 text-vscode-descriptionForeground" />
					<h3 className="font-medium text-vscode-foreground">{t("indexing:analysis.title")}</h3>
				</div>
				<div className="flex items-center gap-2 text-xs text-vscode-descriptionForeground">
					<span>
						{t("indexing:analysis.lastAnalyzed")}: {new Date(analysis.lastAnalyzed).toLocaleString()}
					</span>
					<VSCodeButton
						appearance="icon"
						onClick={() => vscode.postMessage({ type: "refreshWorkspaceAnalysis" })}
						title={t("indexing:analysis.refresh")}>
						<TrendingUp className="w-4 h-4" />
					</VSCodeButton>
				</div>
			</div>

			{/* View Tabs */}
			<div className="flex gap-1 p-1 bg-vscode-editor-background rounded-lg">
				{[
					{ id: "overview", label: t("indexing:analysis.overview"), icon: Info },
					{ id: "files", label: t("indexing:analysis.files"), icon: FileText },
					{ id: "directories", label: t("indexing:analysis.directories"), icon: FolderTree },
					{ id: "recommendations", label: t("indexing:analysis.recommendations"), icon: CheckCircle },
				].map((tab) => {
					const TabIcon = tab.icon
					return (
						<button
							key={tab.id}
							onClick={() => setSelectedView(tab.id as any)}
							className={cn(
								"flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
								selectedView === tab.id
									? "bg-vscode-tab-activeBackground text-vscode-tab-activeForeground"
									: "text-vscode-tab-inactiveForeground hover:text-vscode-tab-activeForeground hover:bg-vscode-tab-hoverBackground",
							)}>
							<TabIcon className="w-4 h-4" />
							{tab.label}
						</button>
					)
				})}
			</div>

			{/* Content */}
			<div className="space-y-4">
				{/* Overview */}
				{selectedView === "overview" && (
					<div className="space-y-4">
						{/* Summary Stats */}
						<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
							<div className="p-3 bg-vscode-editor-background rounded-lg border border-vscode-panel-border">
								<div className="flex items-center gap-2 mb-2">
									<FileText className="w-4 h-4 text-blue-500" />
									<span className="text-xs text-vscode-descriptionForeground">
										{t("indexing:analysis.totalFiles")}
									</span>
								</div>
								<div className="text-lg font-mono text-vscode-foreground">
									{analysis.totalFiles.toLocaleString()}
								</div>
							</div>

							<div className="p-3 bg-vscode-editor-background rounded-lg border border-vscode-panel-border">
								<div className="flex items-center gap-2 mb-2">
									<Database className="w-4 h-4 text-purple-500" />
									<span className="text-xs text-vscode-descriptionForeground">
										{t("indexing:analysis.totalSize")}
									</span>
								</div>
								<div className="text-lg font-mono text-vscode-foreground">
									{formatSize(analysis.totalSize)}
								</div>
							</div>

							<div className="p-3 bg-vscode-editor-background rounded-lg border border-vscode-panel-border">
								<div className="flex items-center gap-2 mb-2">
									<Code className="w-4 h-4 text-green-500" />
									<span className="text-xs text-vscode-descriptionForeground">
										{t("indexing:analysis.languages")}
									</span>
								</div>
								<div className="text-lg font-mono text-vscode-foreground">
									{Object.keys(analysis.languages).length}
								</div>
							</div>

							<div className="p-3 bg-vscode-editor-background rounded-lg border border-vscode-panel-border">
								<div className="flex items-center gap-2 mb-2">
									<TrendingUp className="w-4 h-4 text-orange-500" />
									<span className="text-xs text-vscode-descriptionForeground">
										{t("indexing:analysis.estimate")}
									</span>
								</div>
								<div className="text-lg font-mono text-vscode-foreground">
									{formatDuration(analysis.indexingEstimate.estimatedTimeMs)}
								</div>
							</div>
						</div>

						{/* Language Distribution */}
						<div className="p-4 bg-vscode-editor-background rounded-lg border border-vscode-panel-border">
							<h4 className="text-sm font-medium text-vscode-foreground mb-3">
								{t("indexing:analysis.languageDistribution")}
							</h4>
							<div className="space-y-2">
								{Object.entries(analysis.languages)
									.sort(([, a], [, b]) => b.count - a.count)
									.slice(0, 8)
									.map(([language, stats]) => (
										<div key={language} className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<div className={cn("w-3 h-3 rounded", getLanguageColor(language))} />
												<span className="text-sm text-vscode-foreground capitalize">
													{language}
												</span>
											</div>
											<div className="flex items-center gap-4 text-xs text-vscode-descriptionForeground">
												<span>{stats.count} files</span>
												<span>{formatSize(stats.size)}</span>
												<ProgressPrimitive.Root
													className="w-16 h-1 bg-vscode-progressBar-background rounded-full"
													value={(stats.count / analysis.totalFiles) * 100}>
													<ProgressPrimitive.Indicator
														className={cn(
															"h-full rounded-full transition-transform duration-300",
															getLanguageColor(language),
														)}
														style={{
															transform: `translateX(-${100 - (stats.count / analysis.totalFiles) * 100}%)`,
														}}
													/>
												</ProgressPrimitive.Root>
											</div>
										</div>
									))}
							</div>
						</div>

						{/* Indexing Estimate */}
						<div className="p-4 bg-vscode-editor-background rounded-lg border border-vscode-panel-border">
							<h4 className="text-sm font-medium text-vscode-foreground mb-3">
								{t("indexing:analysis.indexingEstimate")}
							</h4>
							<div className="grid grid-cols-3 gap-4 text-sm">
								<div className="text-center">
									<div className="text-vscode-descriptionForeground">
										{t("indexing:analysis.estimatedTime")}
									</div>
									<div className="font-mono text-vscode-foreground">
										{formatDuration(analysis.indexingEstimate.estimatedTimeMs)}
									</div>
								</div>
								<div className="text-center">
									<div className="text-vscode-descriptionForeground">
										{t("indexing:analysis.estimatedMemory")}
									</div>
									<div className="font-mono text-vscode-foreground">
										{analysis.indexingEstimate.estimatedMemoryMB} MB
									</div>
								</div>
								<div className="text-center">
									<div className="text-vscode-descriptionForeground">
										{t("indexing:analysis.confidence")}
									</div>
									<div className="font-mono text-vscode-foreground">
										{(analysis.indexingEstimate.confidence * 100).toFixed(0)}%
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Files View */}
				{selectedView === "files" && (
					<div className="space-y-4">
						<h4 className="text-sm font-medium text-vscode-foreground">
							{t("indexing:analysis.highPriorityFiles")}
						</h4>
						<div className="space-y-2">
							{analysis.highPriorityFiles.slice(0, 20).map((file, index) => (
								<div
									key={file.path}
									className="flex items-center justify-between p-3 bg-vscode-editor-background rounded-lg border border-vscode-panel-border hover:bg-vscode-list-hoverBackground">
									<div className="flex items-center gap-3 flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<FileText className="w-4 h-4 text-vscode-descriptionForeground flex-shrink-0" />
											<span
												className={cn("px-1 text-xs rounded", getPriorityColor(file.priority))}>
												{file.priority}
											</span>
										</div>
										<div className="flex-1 min-w-0">
											<div className="text-sm font-medium text-vscode-foreground truncate">
												{file.path.split("/").pop()}
											</div>
											<div className="text-xs text-vscode-descriptionForeground truncate">
												{file.path}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-4 text-xs text-vscode-descriptionForeground">
										<span>{file.language}</span>
										<span>{file.lines} lines</span>
										<span>{formatSize(file.size)}</span>
										{file.issues.length > 0 && (
											<StandardTooltip content={file.issues.join(", ")}>
												<AlertCircle className="w-4 h-4 text-yellow-500" />
											</StandardTooltip>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Directories View */}
				{selectedView === "directories" && (
					<div className="space-y-4">
						<h4 className="text-sm font-medium text-vscode-foreground">
							{t("indexing:analysis.directoryStructure")}
						</h4>
						<div className="space-y-1">
							{analysis.directories.map((directory) => renderDirectoryTree(directory))}
						</div>
					</div>
				)}

				{/* Recommendations View */}
				{selectedView === "recommendations" && showRecommendations && (
					<div className="space-y-4">
						<h4 className="text-sm font-medium text-vscode-foreground">
							{t("indexing:analysis.recommendations")}
						</h4>
						{analysis.recommendations.length === 0 ? (
							<div className="p-4 text-center text-vscode-descriptionForeground">
								<CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
								<p>{t("indexing:analysis.noRecommendations")}</p>
							</div>
						) : (
							<div className="space-y-3">
								{analysis.recommendations.map((recommendation, index) => (
									<div
										key={index}
										className={cn(
											"p-4 rounded-lg border",
											recommendation.severity === "high" && "border-red-500/30 bg-red-500/5",
											recommendation.severity === "medium" &&
												"border-yellow-500/30 bg-yellow-500/5",
											recommendation.severity === "low" && "border-blue-500/30 bg-blue-500/5",
										)}>
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-2">
													<span
														className={cn(
															"text-xs px-2 py-1 rounded uppercase font-medium",
															recommendation.severity === "high" &&
																"bg-red-500/20 text-red-500",
															recommendation.severity === "medium" &&
																"bg-yellow-500/20 text-yellow-500",
															recommendation.severity === "low" &&
																"bg-blue-500/20 text-blue-500",
														)}>
														{recommendation.severity}
													</span>
													<span
														className={cn(
															"text-xs px-2 py-1 rounded",
															recommendation.type === "optimization" &&
																"bg-purple-500/20 text-purple-500",
															recommendation.type === "structure" &&
																"bg-blue-500/20 text-blue-500",
															recommendation.type === "quality" &&
																"bg-green-500/20 text-green-500",
														)}>
														{recommendation.type}
													</span>
												</div>
												<h5 className="text-sm font-medium text-vscode-foreground mb-1">
													{recommendation.title}
												</h5>
												<p className="text-sm text-vscode-descriptionForeground mb-2">
													{recommendation.description}
												</p>
												{recommendation.files && recommendation.files.length > 0 && (
													<div className="text-xs text-vscode-descriptionForeground">
														<strong>{t("indexing:analysis.affectedFiles")}:</strong>
														<div className="mt-1 space-y-1">
															{recommendation.files.slice(0, 3).map((file, fileIndex) => (
																<div key={fileIndex} className="font-mono">
																	{file}
																</div>
															))}
															{recommendation.files.length > 3 && (
																<div className="text-vscode-descriptionForeground">
																	+{recommendation.files.length - 3} more files
																</div>
															)}
														</div>
													</div>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

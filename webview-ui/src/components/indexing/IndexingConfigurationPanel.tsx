import React, { useState, useEffect } from "react"
import { Settings, Save, RotateCcw, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { cn } from "@src/lib/utils"
import { vscode } from "@src/utils/vscode"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { useExtensionState } from "@src/context/ExtensionStateContext"
import {
	VSCodeButton,
	VSCodeTextField,
	VSCodeCheckbox,
	VSCodeDropdown,
	VSCodeOption,
} from "@vscode/webview-ui-toolkit/react"
import { Slider, StandardTooltip } from "@src/components/ui"

interface IndexingConfiguration {
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

interface IndexingConfigurationPanelProps {
	className?: string
	onConfigChange?: (config: IndexingConfiguration) => void
}

const DEFAULT_CONFIG: IndexingConfiguration = {
	maxConcurrentFiles: 10,
	batchSize: 50,
	memoryLimit: 512,
	timeoutMs: 30000,
	enableDeepAnalysis: true,
	skipBinaryFiles: true,
	skipLargeFiles: true,
	maxFileSize: 10,
	enableCaching: true,
	cacheSize: 100,
	enableIncrementalIndexing: true,
	enableParallelProcessing: true,
	includePatterns: ["**/*.{js,ts,jsx,tsx,py,java,cpp,c,h,cs,php,rb,go,rs}"],
	excludePatterns: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**"],
	fileExtensions: ["js", "ts", "jsx", "tsx", "py", "java", "cpp", "c", "h", "cs", "php", "rb", "go", "rs"],
	logLevel: "info",
	enableTelemetry: true,
	autoOptimize: true,
	retryAttempts: 3,
}

export const IndexingConfigurationPanel: React.FC<IndexingConfigurationPanelProps> = ({
	className,
	onConfigChange,
}) => {
	const { t } = useAppTranslation()
	const { codebaseIndexConfig: _codebaseIndexConfig } = useExtensionState()
	const [config, setConfig] = useState<IndexingConfiguration>(DEFAULT_CONFIG)
	const [originalConfig, setOriginalConfig] = useState<IndexingConfiguration>(DEFAULT_CONFIG)
	const [activeSection, setActiveSection] = useState<string>("performance")
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

	// Load configuration on mount
	useEffect(() => {
		vscode.postMessage({ type: "requestIndexingConfiguration" })

		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "indexingConfiguration") {
				const loadedConfig = { ...DEFAULT_CONFIG, ...event.data.config }
				setConfig(loadedConfig)
				setOriginalConfig(loadedConfig)
			} else if (event.data.type === "indexingConfigurationSaved") {
				if (event.data.success) {
					setSaveStatus("saved")
					setOriginalConfig(config)
					setTimeout(() => setSaveStatus("idle"), 2000)
				} else {
					setSaveStatus("error")
					setTimeout(() => setSaveStatus("idle"), 3000)
				}
			}
		}

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [config])

	// Update configuration
	const updateConfig = <K extends keyof IndexingConfiguration>(key: K, value: IndexingConfiguration[K]) => {
		const newConfig = { ...config, [key]: value }
		setConfig(newConfig)

		// Clear validation error for this field
		if (validationErrors[key]) {
			setValidationErrors((prev) => {
				const updated = { ...prev }
				delete updated[key]
				return updated
			})
		}

		if (onConfigChange) {
			onConfigChange(newConfig)
		}
	}

	// Validate configuration
	const validateConfig = (): boolean => {
		const errors: Record<string, string> = {}

		if (config.maxConcurrentFiles < 1 || config.maxConcurrentFiles > 50) {
			errors.maxConcurrentFiles = t("indexing:config.validation.concurrentFilesRange")
		}

		if (config.batchSize < 1 || config.batchSize > 1000) {
			errors.batchSize = t("indexing:config.validation.batchSizeRange")
		}

		if (config.memoryLimit < 64 || config.memoryLimit > 4096) {
			errors.memoryLimit = t("indexing:config.validation.memoryLimitRange")
		}

		if (config.maxFileSize < 1 || config.maxFileSize > 100) {
			errors.maxFileSize = t("indexing:config.validation.maxFileSizeRange")
		}

		if (config.cacheSize < 10 || config.cacheSize > 1000) {
			errors.cacheSize = t("indexing:config.validation.cacheSizeRange")
		}

		setValidationErrors(errors)
		return Object.keys(errors).length === 0
	}

	// Save configuration
	const saveConfiguration = () => {
		if (!validateConfig()) {
			return
		}

		setSaveStatus("saving")
		vscode.postMessage({
			type: "saveIndexingConfiguration",
			config,
		})
	}

	// Reset to defaults
	const resetToDefaults = () => {
		setConfig(DEFAULT_CONFIG)
		setValidationErrors({})
	}

	// Reset to original
	const resetToOriginal = () => {
		setConfig(originalConfig)
		setValidationErrors({})
	}

	// Check if configuration has changes
	const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig)

	// Add pattern to array
	const addPattern = (type: "include" | "exclude", pattern: string) => {
		if (!pattern.trim()) return

		const key = type === "include" ? "includePatterns" : "excludePatterns"
		const patterns = [...config[key]]
		if (!patterns.includes(pattern)) {
			patterns.push(pattern)
			updateConfig(key, patterns)
		}
	}

	// Remove pattern from array
	const removePattern = (type: "include" | "exclude", index: number) => {
		const key = type === "include" ? "includePatterns" : "excludePatterns"
		const patterns = [...config[key]]
		patterns.splice(index, 1)
		updateConfig(key, patterns)
	}

	const sections = [
		{ id: "performance", label: t("indexing:config.sections.performance"), icon: Settings },
		{ id: "quality", label: t("indexing:config.sections.quality"), icon: CheckCircle },
		{ id: "filters", label: t("indexing:config.sections.filters"), icon: Info },
		{ id: "advanced", label: t("indexing:config.sections.advanced"), icon: AlertTriangle },
	]

	return (
		<div className={cn("space-y-6", className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Settings className="w-5 h-5 text-vscode-descriptionForeground" />
					<h3 className="font-medium text-vscode-foreground">{t("indexing:config.title")}</h3>
				</div>
				<div className="flex items-center gap-2">
					{saveStatus === "saved" && (
						<span className="text-sm text-green-500 flex items-center gap-1">
							<CheckCircle className="w-4 h-4" />
							{t("indexing:config.saved")}
						</span>
					)}
					{saveStatus === "error" && (
						<span className="text-sm text-red-500 flex items-center gap-1">
							<AlertTriangle className="w-4 h-4" />
							{t("indexing:config.saveError")}
						</span>
					)}
				</div>
			</div>

			{/* Section Navigation */}
			<div className="flex gap-1 p-1 bg-vscode-editor-background rounded-lg">
				{sections.map((section) => {
					const SectionIcon = section.icon
					return (
						<button
							key={section.id}
							onClick={() => setActiveSection(section.id)}
							className={cn(
								"flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
								activeSection === section.id
									? "bg-vscode-tab-activeBackground text-vscode-tab-activeForeground"
									: "text-vscode-tab-inactiveForeground hover:text-vscode-tab-activeForeground hover:bg-vscode-tab-hoverBackground",
							)}>
							<SectionIcon className="w-4 h-4" />
							{section.label}
						</button>
					)
				})}
			</div>

			{/* Configuration Sections */}
			<div className="space-y-6">
				{/* Performance Section */}
				{activeSection === "performance" && (
					<div className="space-y-4">
						<h4 className="text-sm font-medium text-vscode-foreground">
							{t("indexing:config.performance.title")}
						</h4>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Max Concurrent Files */}
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-vscode-foreground">
										{t("indexing:config.performance.maxConcurrentFiles")}
									</label>
									<StandardTooltip
										content={t("indexing:config.performance.maxConcurrentFilesTooltip")}>
										<Info className="w-3 h-3 text-vscode-descriptionForeground" />
									</StandardTooltip>
								</div>
								<Slider
									min={1}
									max={50}
									step={1}
									value={[config.maxConcurrentFiles]}
									onValueChange={(values) => updateConfig("maxConcurrentFiles", values[0])}
									className="w-full"
								/>
								<div className="flex justify-between text-xs text-vscode-descriptionForeground">
									<span>1</span>
									<span className="font-mono">{config.maxConcurrentFiles}</span>
									<span>50</span>
								</div>
								{validationErrors.maxConcurrentFiles && (
									<p className="text-xs text-red-500">{validationErrors.maxConcurrentFiles}</p>
								)}
							</div>

							{/* Batch Size */}
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-vscode-foreground">
										{t("indexing:config.performance.batchSize")}
									</label>
									<StandardTooltip content={t("indexing:config.performance.batchSizeTooltip")}>
										<Info className="w-3 h-3 text-vscode-descriptionForeground" />
									</StandardTooltip>
								</div>
								<VSCodeTextField
									value={config.batchSize.toString()}
									onInput={(e: any) => updateConfig("batchSize", parseInt(e.target.value) || 1)}
									className={cn("w-full", validationErrors.batchSize && "border-red-500")}
								/>
								{validationErrors.batchSize && (
									<p className="text-xs text-red-500">{validationErrors.batchSize}</p>
								)}
							</div>

							{/* Memory Limit */}
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-vscode-foreground">
										{t("indexing:config.performance.memoryLimit")} (MB)
									</label>
									<StandardTooltip content={t("indexing:config.performance.memoryLimitTooltip")}>
										<Info className="w-3 h-3 text-vscode-descriptionForeground" />
									</StandardTooltip>
								</div>
								<VSCodeTextField
									value={config.memoryLimit.toString()}
									onInput={(e: any) => updateConfig("memoryLimit", parseInt(e.target.value) || 64)}
									className={cn("w-full", validationErrors.memoryLimit && "border-red-500")}
								/>
								{validationErrors.memoryLimit && (
									<p className="text-xs text-red-500">{validationErrors.memoryLimit}</p>
								)}
							</div>

							{/* Timeout */}
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-vscode-foreground">
										{t("indexing:config.performance.timeout")} (ms)
									</label>
									<StandardTooltip content={t("indexing:config.performance.timeoutTooltip")}>
										<Info className="w-3 h-3 text-vscode-descriptionForeground" />
									</StandardTooltip>
								</div>
								<VSCodeTextField
									value={config.timeoutMs.toString()}
									onInput={(e: any) => updateConfig("timeoutMs", parseInt(e.target.value) || 1000)}
									className="w-full"
								/>
							</div>
						</div>

						{/* Performance Toggles */}
						<div className="space-y-3">
							<VSCodeCheckbox
								checked={config.enableParallelProcessing}
								onChange={(e: any) => updateConfig("enableParallelProcessing", e.target.checked)}>
								<span className="text-sm">
									{t("indexing:config.performance.enableParallelProcessing")}
								</span>
							</VSCodeCheckbox>

							<VSCodeCheckbox
								checked={config.enableCaching}
								onChange={(e: any) => updateConfig("enableCaching", e.target.checked)}>
								<span className="text-sm">{t("indexing:config.performance.enableCaching")}</span>
							</VSCodeCheckbox>

							<VSCodeCheckbox
								checked={config.enableIncrementalIndexing}
								onChange={(e: any) => updateConfig("enableIncrementalIndexing", e.target.checked)}>
								<span className="text-sm">
									{t("indexing:config.performance.enableIncrementalIndexing")}
								</span>
							</VSCodeCheckbox>
						</div>
					</div>
				)}

				{/* Quality Section */}
				{activeSection === "quality" && (
					<div className="space-y-4">
						<h4 className="text-sm font-medium text-vscode-foreground">
							{t("indexing:config.quality.title")}
						</h4>

						<div className="space-y-3">
							<VSCodeCheckbox
								checked={config.enableDeepAnalysis}
								onChange={(e: any) => updateConfig("enableDeepAnalysis", e.target.checked)}>
								<span className="text-sm">{t("indexing:config.quality.enableDeepAnalysis")}</span>
							</VSCodeCheckbox>

							<VSCodeCheckbox
								checked={config.skipBinaryFiles}
								onChange={(e: any) => updateConfig("skipBinaryFiles", e.target.checked)}>
								<span className="text-sm">{t("indexing:config.quality.skipBinaryFiles")}</span>
							</VSCodeCheckbox>

							<VSCodeCheckbox
								checked={config.skipLargeFiles}
								onChange={(e: any) => updateConfig("skipLargeFiles", e.target.checked)}>
								<span className="text-sm">{t("indexing:config.quality.skipLargeFiles")}</span>
							</VSCodeCheckbox>
						</div>

						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<label className="text-sm font-medium text-vscode-foreground">
									{t("indexing:config.quality.maxFileSize")} (MB)
								</label>
								<StandardTooltip content={t("indexing:config.quality.maxFileSizeTooltip")}>
									<Info className="w-3 h-3 text-vscode-descriptionForeground" />
								</StandardTooltip>
							</div>
							<VSCodeTextField
								value={config.maxFileSize.toString()}
								onInput={(e: any) => updateConfig("maxFileSize", parseInt(e.target.value) || 1)}
								className={cn("w-full", validationErrors.maxFileSize && "border-red-500")}
								disabled={!config.skipLargeFiles}
							/>
							{validationErrors.maxFileSize && (
								<p className="text-xs text-red-500">{validationErrors.maxFileSize}</p>
							)}
						</div>

						{config.enableCaching && (
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<label className="text-sm font-medium text-vscode-foreground">
										{t("indexing:config.quality.cacheSize")} (MB)
									</label>
									<StandardTooltip content={t("indexing:config.quality.cacheSizeTooltip")}>
										<Info className="w-3 h-3 text-vscode-descriptionForeground" />
									</StandardTooltip>
								</div>
								<VSCodeTextField
									value={config.cacheSize.toString()}
									onInput={(e: any) => updateConfig("cacheSize", parseInt(e.target.value) || 10)}
									className={cn("w-full", validationErrors.cacheSize && "border-red-500")}
								/>
								{validationErrors.cacheSize && (
									<p className="text-xs text-red-500">{validationErrors.cacheSize}</p>
								)}
							</div>
						)}
					</div>
				)}

				{/* Filters Section */}
				{activeSection === "filters" && (
					<div className="space-y-4">
						<h4 className="text-sm font-medium text-vscode-foreground">
							{t("indexing:config.filters.title")}
						</h4>

						{/* Include Patterns */}
						<div className="space-y-2">
							<label className="text-sm font-medium text-vscode-foreground">
								{t("indexing:config.filters.includePatterns")}
							</label>
							<div className="space-y-2">
								{config.includePatterns.map((pattern, index) => (
									<div key={index} className="flex items-center gap-2">
										<VSCodeTextField
											value={pattern}
											onInput={(e: any) => {
												const patterns = [...config.includePatterns]
												patterns[index] = e.target.value
												updateConfig("includePatterns", patterns)
											}}
											className="flex-1"
										/>
										<VSCodeButton appearance="icon" onClick={() => removePattern("include", index)}>
											×
										</VSCodeButton>
									</div>
								))}
								<VSCodeButton
									appearance="secondary"
									onClick={() => addPattern("include", "**/*.{ext}")}>
									{t("indexing:config.filters.addPattern")}
								</VSCodeButton>
							</div>
						</div>

						{/* Exclude Patterns */}
						<div className="space-y-2">
							<label className="text-sm font-medium text-vscode-foreground">
								{t("indexing:config.filters.excludePatterns")}
							</label>
							<div className="space-y-2">
								{config.excludePatterns.map((pattern, index) => (
									<div key={index} className="flex items-center gap-2">
										<VSCodeTextField
											value={pattern}
											onInput={(e: any) => {
												const patterns = [...config.excludePatterns]
												patterns[index] = e.target.value
												updateConfig("excludePatterns", patterns)
											}}
											className="flex-1"
										/>
										<VSCodeButton appearance="icon" onClick={() => removePattern("exclude", index)}>
											×
										</VSCodeButton>
									</div>
								))}
								<VSCodeButton
									appearance="secondary"
									onClick={() => addPattern("exclude", "**/node_modules/**")}>
									{t("indexing:config.filters.addPattern")}
								</VSCodeButton>
							</div>
						</div>
					</div>
				)}

				{/* Advanced Section */}
				{activeSection === "advanced" && (
					<div className="space-y-4">
						<h4 className="text-sm font-medium text-vscode-foreground">
							{t("indexing:config.advanced.title")}
						</h4>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Log Level */}
							<div className="space-y-2">
								<label className="text-sm font-medium text-vscode-foreground">
									{t("indexing:config.advanced.logLevel")}
								</label>
								<VSCodeDropdown
									value={config.logLevel}
									onChange={(e: any) => updateConfig("logLevel", e.target.value)}
									className="w-full">
									<VSCodeOption value="error">Error</VSCodeOption>
									<VSCodeOption value="warn">Warning</VSCodeOption>
									<VSCodeOption value="info">Info</VSCodeOption>
									<VSCodeOption value="debug">Debug</VSCodeOption>
								</VSCodeDropdown>
							</div>

							{/* Retry Attempts */}
							<div className="space-y-2">
								<label className="text-sm font-medium text-vscode-foreground">
									{t("indexing:config.advanced.retryAttempts")}
								</label>
								<VSCodeTextField
									value={config.retryAttempts.toString()}
									onInput={(e: any) => updateConfig("retryAttempts", parseInt(e.target.value) || 0)}
									className="w-full"
								/>
							</div>
						</div>

						<div className="space-y-3">
							<VSCodeCheckbox
								checked={config.enableTelemetry}
								onChange={(e: any) => updateConfig("enableTelemetry", e.target.checked)}>
								<span className="text-sm">{t("indexing:config.advanced.enableTelemetry")}</span>
							</VSCodeCheckbox>

							<VSCodeCheckbox
								checked={config.autoOptimize}
								onChange={(e: any) => updateConfig("autoOptimize", e.target.checked)}>
								<span className="text-sm">{t("indexing:config.advanced.autoOptimize")}</span>
							</VSCodeCheckbox>
						</div>
					</div>
				)}
			</div>

			{/* Action Buttons */}
			<div className="flex items-center justify-between pt-4 border-t border-vscode-panel-border">
				<div className="flex items-center gap-2">
					<VSCodeButton appearance="secondary" onClick={resetToDefaults}>
						<RotateCcw className="w-4 h-4 mr-2" />
						{t("indexing:config.resetDefaults")}
					</VSCodeButton>

					{hasChanges && (
						<VSCodeButton appearance="secondary" onClick={resetToOriginal}>
							{t("indexing:config.resetOriginal")}
						</VSCodeButton>
					)}
				</div>

				<VSCodeButton
					onClick={saveConfiguration}
					disabled={!hasChanges || saveStatus === "saving" || Object.keys(validationErrors).length > 0}>
					<Save className="w-4 h-4 mr-2" />
					{saveStatus === "saving" ? t("indexing:config.saving") : t("indexing:config.save")}
				</VSCodeButton>
			</div>
		</div>
	)
}

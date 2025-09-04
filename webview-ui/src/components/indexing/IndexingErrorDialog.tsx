import React, { useState, useEffect } from "react"
import { AlertTriangle, RefreshCw, Settings, HelpCircle, Copy } from "lucide-react"
import { cn } from "@src/lib/utils"
import { vscode } from "@src/utils/vscode"
import { useAppTranslation } from "@/i18n/TranslationContext"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@src/components/ui"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"

interface IndexingError {
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

interface IndexingErrorDialogProps {
	isOpen: boolean
	onClose: () => void
	error: IndexingError | null
	onRetry?: () => void
	onConfigure?: () => void
}

export const IndexingErrorDialog: React.FC<IndexingErrorDialogProps> = ({
	isOpen,
	onClose,
	error,
	onRetry,
	onConfigure,
}) => {
	const { t } = useAppTranslation()
	const [showDetails, setShowDetails] = useState(false)
	const [copied, setCopied] = useState(false)

	// Reset copied state when dialog opens/closes
	useEffect(() => {
		if (!isOpen) {
			setShowDetails(false)
			setCopied(false)
		}
	}, [isOpen])

	// Copy error details to clipboard
	const copyErrorDetails = async () => {
		if (!error) return

		const errorReport = {
			code: error.code,
			message: error.message,
			details: error.details,
			timestamp: new Date(error.timestamp).toISOString(),
			systemInfo: error.systemInfo,
			stack: error.stack,
		}

		try {
			await navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (_err) {
			// Fallback for older browsers
			const textArea = document.createElement("textarea")
			textArea.value = JSON.stringify(errorReport, null, 2)
			document.body.appendChild(textArea)
			textArea.select()
			document.execCommand("copy")
			document.body.removeChild(textArea)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		}
	}

	// Get error severity and styling
	const getErrorSeverity = () => {
		if (!error) return { level: "error", color: "text-red-500", bgColor: "bg-red-500/10" }

		if (error.recoverable) {
			return {
				level: "warning",
				color: "text-yellow-500",
				bgColor: "bg-yellow-500/10",
			}
		}

		return {
			level: "error",
			color: "text-red-500",
			bgColor: "bg-red-500/10",
		}
	}

	// Get user-friendly error message
	const getUserFriendlyMessage = () => {
		if (!error) return ""

		const errorMessages: Record<string, string> = {
			INSUFFICIENT_MEMORY: t("indexing:errors.insufficientMemory"),
			DISK_SPACE_LOW: t("indexing:errors.diskSpaceLow"),
			PERMISSION_DENIED: t("indexing:errors.permissionDenied"),
			NETWORK_ERROR: t("indexing:errors.networkError"),
			CONFIG_INVALID: t("indexing:errors.configInvalid"),
			SERVICE_UNAVAILABLE: t("indexing:errors.serviceUnavailable"),
			TIMEOUT: t("indexing:errors.timeout"),
			PARSE_ERROR: t("indexing:errors.parseError"),
			UNKNOWN_ERROR: t("indexing:errors.unknownError"),
		}

		return errorMessages[error.code] || error.message
	}

	// Get recovery suggestions
	const getRecoverySuggestions = () => {
		if (!error?.suggestions) return []

		const suggestionMap: Record<string, string> = {
			restart_service: t("indexing:recovery.restartService"),
			check_config: t("indexing:recovery.checkConfig"),
			free_memory: t("indexing:recovery.freeMemory"),
			check_permissions: t("indexing:recovery.checkPermissions"),
			check_network: t("indexing:recovery.checkNetwork"),
			update_settings: t("indexing:recovery.updateSettings"),
			contact_support: t("indexing:recovery.contactSupport"),
		}

		return error.suggestions.map((suggestion) => suggestionMap[suggestion] || suggestion)
	}

	// Handle retry with different strategies
	const handleRetry = (strategy?: string) => {
		if (onRetry) {
			onRetry()
		}

		vscode.postMessage({
			type: "retryIndexing",
			strategy: strategy || "default",
		})

		onClose()
	}

	// Open help documentation
	const openHelp = () => {
		vscode.postMessage({
			type: "openExternal",
			url: "https://docs.bluescode.dev/troubleshooting/indexing",
		})
	}

	const severity = getErrorSeverity()
	const userMessage = getUserFriendlyMessage()
	const suggestions = getRecoverySuggestions()

	if (!error) return null

	return (
		<AlertDialog open={isOpen} onOpenChange={onClose}>
			<AlertDialogContent className="max-w-2xl">
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<div className={cn("p-2 rounded-lg", severity.bgColor)}>
							<AlertTriangle className={cn("w-5 h-5", severity.color)} />
						</div>
						{t("indexing:error.title")}
					</AlertDialogTitle>
					<AlertDialogDescription className="text-left">{userMessage}</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="space-y-4">
					{/* Configuration Issues */}
					{error.configIssues && error.configIssues.length > 0 && (
						<div className="p-3 bg-vscode-inputValidation-warningBackground/10 border border-vscode-inputValidation-warningBorder rounded-lg">
							<h4 className="text-sm font-medium text-vscode-foreground mb-2">
								{t("indexing:error.configIssues")}
							</h4>
							<ul className="text-sm text-vscode-descriptionForeground space-y-1">
								{error.configIssues.map((issue, index) => (
									<li key={index} className="flex items-start gap-2">
										<span className="text-vscode-inputValidation-warningForeground">•</span>
										<span>{issue}</span>
									</li>
								))}
							</ul>
						</div>
					)}

					{/* Recovery Suggestions */}
					{suggestions.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-sm font-medium text-vscode-foreground">
								{t("indexing:error.suggestions")}
							</h4>
							<ul className="text-sm text-vscode-descriptionForeground space-y-2">
								{suggestions.map((suggestion, index) => (
									<li key={index} className="flex items-start gap-2">
										<span className="text-blue-500 mt-1">•</span>
										<span>{suggestion}</span>
									</li>
								))}
							</ul>
						</div>
					)}

					{/* System Information */}
					{error.systemInfo && (
						<div className="space-y-2">
							<button
								onClick={() => setShowDetails(!showDetails)}
								className="flex items-center gap-2 text-sm text-vscode-textLink-foreground hover:text-vscode-textLink-activeForeground">
								<span>
									{showDetails ? t("indexing:error.hideDetails") : t("indexing:error.showDetails")}
								</span>
							</button>

							{showDetails && (
								<div className="p-3 bg-vscode-editor-background rounded-lg space-y-2">
									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<span className="text-vscode-descriptionForeground">
												{t("indexing:error.memoryUsage")}:
											</span>
											<span className="ml-2 font-mono">
												{(error.systemInfo.memoryUsage / 1024 / 1024).toFixed(1)} MB
											</span>
										</div>
										<div>
											<span className="text-vscode-descriptionForeground">
												{t("indexing:error.diskSpace")}:
											</span>
											<span className="ml-2 font-mono">
												{(error.systemInfo.diskSpace / 1024 / 1024 / 1024).toFixed(1)} GB
											</span>
										</div>
									</div>

									{error.details && (
										<div className="mt-3">
											<h5 className="text-xs font-medium text-vscode-descriptionForeground mb-1">
												{t("indexing:error.technicalDetails")}
											</h5>
											<pre className="text-xs bg-vscode-textCodeBlock-background p-2 rounded overflow-x-auto">
												{error.details}
											</pre>
										</div>
									)}

									{error.stack && (
										<div className="mt-3">
											<h5 className="text-xs font-medium text-vscode-descriptionForeground mb-1">
												{t("indexing:error.stackTrace")}
											</h5>
											<pre className="text-xs bg-vscode-textCodeBlock-background p-2 rounded overflow-x-auto max-h-32">
												{error.stack}
											</pre>
										</div>
									)}
								</div>
							)}
						</div>
					)}
				</div>

				<AlertDialogFooter className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<VSCodeButton
							appearance="icon"
							onClick={copyErrorDetails}
							title={t("indexing:error.copyDetails")}>
							<Copy className="w-4 h-4" />
						</VSCodeButton>
						{copied && <span className="text-xs text-green-500">{t("indexing:error.copied")}</span>}

						<VSCodeButton appearance="icon" onClick={openHelp} title={t("indexing:error.getHelp")}>
							<HelpCircle className="w-4 h-4" />
						</VSCodeButton>
					</div>

					<div className="flex items-center gap-2">
						<AlertDialogCancel>{t("indexing:error.dismiss")}</AlertDialogCancel>

						{onConfigure && (
							<VSCodeButton
								appearance="secondary"
								onClick={() => {
									onConfigure()
									onClose()
								}}>
								<Settings className="w-4 h-4 mr-2" />
								{t("indexing:error.configure")}
							</VSCodeButton>
						)}

						{error.recoverable && (
							<>
								<VSCodeButton appearance="secondary" onClick={() => handleRetry("safe")}>
									<RefreshCw className="w-4 h-4 mr-2" />
									{t("indexing:error.retrySafe")}
								</VSCodeButton>

								<AlertDialogAction onClick={() => handleRetry("force")}>
									{t("indexing:error.retryForce")}
								</AlertDialogAction>
							</>
						)}
					</div>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

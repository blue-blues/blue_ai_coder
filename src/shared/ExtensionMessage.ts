import type {
	GlobalSettings,
	ProviderSettingsEntry,
	ProviderSettings,
	HistoryItem,
	ModeConfig,
	TelemetrySetting,
	Experiments,
	ClineMessage,
	OrganizationAllowList,
	CloudUserInfo,
	ShareVisibility,
} from "@roo-code/types"

import { GitCommit } from "../utils/git"

import { McpServer } from "./mcp"
import { McpMarketplaceCatalog, McpDownloadResponse } from "./bluescode/mcp"
import { Mode } from "./modes"
import { ModelRecord, RouterModels } from "./api"
import { ProfileDataResponsePayload, BalanceDataResponsePayload } from "./WebviewMessage" // bluescode_change
import { ClineRulesToggles } from "./cline-rules" // bluescode_change
import type { MarketplaceItem } from "@roo-code/types"

// Command interface for frontend/backend communication
export interface Command {
	name: string
	source: "global" | "project"
	filePath?: string
	description?: string
	argumentHint?: string
}

// Type for marketplace installed metadata
export interface MarketplaceInstalledMetadata {
	project: Record<string, { type: string }>
	global: Record<string, { type: string }>
}

// Indexing status types
export interface IndexingStatus {
	systemStatus: string
	message?: string
	processedItems: number
	totalItems: number
	currentItemUnit?: string
	workspacePath?: string
}

export interface IndexingStatusUpdateMessage {
	type: "indexingStatusUpdate"
	values: IndexingStatus
}

export interface LanguageModelChatSelector {
	vendor?: string
	family?: string
	version?: string
	id?: string
}

// Represents JSON data that is sent from extension to webview, called
// ExtensionMessage and has 'type' enum which can be 'plusButtonClicked' or
// 'settingsButtonClicked' or 'hello'. Webview will hold state.
export interface ExtensionMessage {
	type:
		| "action"
		| "state"
		| "selectedImages"
		| "theme"
		| "workspaceUpdated"
		| "invoke"
		| "messageUpdated"
		| "mcpServers"
		| "enhancedPrompt"
		| "commitSearchResults"
		| "listApiConfig"
		| "routerModels"
		| "openAiModels"
		| "ollamaModels"
		| "lmStudioModels"
		| "vsCodeLmModels"
		| "huggingFaceModels"
		| "vsCodeLmApiAvailable"
		| "updatePrompt"
		| "systemPrompt"
		| "autoApprovalEnabled"
		| "updateCustomMode"
		| "deleteCustomMode"
		| "exportModeResult"
		| "importModeResult"
		| "checkRulesDirectoryResult"
		| "deleteCustomModeCheck"
		| "currentCheckpointUpdated"
		| "showHumanRelayDialog"
		| "humanRelayResponse"
		| "humanRelayCancel"
		| "insertTextToChatArea" // bluescode_change
		| "browserToolEnabled"
		| "browserConnectionResult"
		| "remoteBrowserEnabled"
		| "ttsStart"
		| "ttsStop"
		| "maxReadFileLine"
		| "fileSearchResults"
		| "toggleApiConfigPin"
		| "mcpMarketplaceCatalog" // bluescode_change
		| "mcpDownloadDetails" // bluescode_change
		| "showSystemNotification" // bluescode_change
		| "openInBrowser" // bluescode_change
		| "acceptInput"
		| "focusChatInput" // bluescode_change
		| "setHistoryPreviewCollapsed"
		| "commandExecutionStatus"
		| "mcpExecutionStatus"
		| "vsCodeSetting"
		| "profileDataResponse" // bluescode_change
		| "balanceDataResponse" // bluescode_change
		| "updateProfileData" // bluescode_change
		| "authenticatedUser"
		| "condenseTaskContextResponse"
		| "singleRouterModelFetchResponse"
		| "indexingStatusUpdate"
		| "indexCleared"
		| "codebaseIndexConfig"
		| "showIndexingValidation"
		| "indexingProgress"
		| "indexingChoice"
		| "indexingDetailedProgress"
		| "performanceMetrics"
		| "optimizationSuggestions"
		| "workspaceAnalysis"
		| "indexingConfiguration"
		| "indexingConfigurationSaved"
		| "indexingError"
		| "indexingComplete"
		| "rulesData" // bluescode_change
		| "marketplaceInstallResult"
		| "marketplaceRemoveResult"
		| "marketplaceData"
		| "mermaidFixResponse" // bluescode_change
		| "shareTaskSuccess"
		| "codeIndexSettingsSaved"
		| "codeIndexSecretStatus"
		| "showDeleteMessageDialog"
		| "showEditMessageDialog"
		| "bluesCodeNotificationsResponse" // bluescode_change
		| "usageDataResponse" // bluescode_change
		| "commands"
		| "insertTextIntoTextarea"
	text?: string
	payload?: ProfileDataResponsePayload | BalanceDataResponsePayload // bluescode_change: Add payload for profile and balance data
	action?:
		| "chatButtonClicked"
		| "mcpButtonClicked"
		| "settingsButtonClicked"
		| "historyButtonClicked"
		| "promptsButtonClicked"
		| "profileButtonClicked" // bluescode_change
		| "marketplaceButtonClicked"
		| "accountButtonClicked"
		| "didBecomeVisible"
		| "focusInput"
		| "switchTab"
		| "focusChatInput" // bluescode_change
	invoke?: "newChat" | "sendMessage" | "primaryButtonClick" | "secondaryButtonClick" | "setChatBoxMessage"
	state?: ExtensionState
	images?: string[]
	filePaths?: string[]
	openedTabs?: Array<{
		label: string
		isActive: boolean
		path?: string
	}>
	clineMessage?: ClineMessage
	routerModels?: RouterModels
	openAiModels?: string[]
	ollamaModels?: string[]
	lmStudioModels?: ModelRecord
	vsCodeLmModels?: { vendor?: string; family?: string; version?: string; id?: string }[]
	huggingFaceModels?: Array<{
		id: string
		object: string
		created: number
		owned_by: string
		providers: Array<{
			provider: string
			status: "live" | "staging" | "error"
			supports_tools?: boolean
			supports_structured_output?: boolean
			context_length?: number
			pricing?: {
				input: number
				output: number
			}
		}>
	}>
	mcpServers?: McpServer[]
	commits?: GitCommit[]
	listApiConfig?: ProviderSettingsEntry[]
	mode?: Mode
	customMode?: ModeConfig
	slug?: string
	success?: boolean
	values?: Record<string, any>
	requestId?: string
	promptText?: string
	results?: { path: string; type: "file" | "folder"; label?: string }[]
	error?: string
	mcpMarketplaceCatalog?: McpMarketplaceCatalog // bluescode_change
	mcpDownloadDetails?: McpDownloadResponse // bluescode_change
	notificationOptions?: {
		title?: string
		subtitle?: string
		message: string
	} // bluescode_change
	url?: string // bluescode_change
	setting?: string
	value?: any
	hasContent?: boolean // For checkRulesDirectoryResult
	items?: MarketplaceItem[]
	userInfo?: CloudUserInfo
	organizationAllowList?: OrganizationAllowList
	tab?: string
	// bluescode_change: Rules data
	globalRules?: ClineRulesToggles
	localRules?: ClineRulesToggles
	globalWorkflows?: ClineRulesToggles
	localWorkflows?: ClineRulesToggles
	marketplaceItems?: MarketplaceItem[]
	organizationMcps?: MarketplaceItem[]
	marketplaceInstalledMetadata?: MarketplaceInstalledMetadata
	fixedCode?: string | null // For mermaidFixResponse // bluescode_change
	errors?: string[]
	visibility?: ShareVisibility
	rulesFolderPath?: string
	settings?: any
	messageTs?: number
	context?: string
	// bluescode_change start: Notifications
	notifications?: Array<{
		id: string
		title: string
		message: string
		action?: {
			actionText: string
			actionURL: string
		}
	}>
	// bluescode_change end
	commands?: Command[]
	// Indexing validation message payloads
	validation?: any // IndexValidationResult from indexing-validation types
	progress?: {
		filesProcessed: number
		totalFiles: number
		currentFile: string
		elapsedTimeMs: number
		estimatedRemainingMs: number
		percentage: number
		filesPerSecond?: number
		category?: string
		phase?: string
		errorCount?: number
		warningCount?: number
		isPaused?: boolean
	}
	canSkip?: boolean
	canCancel?: boolean
	taskId?: string
	// Enhanced indexing progress data
	detailedProgress?: {
		currentFile?: string
		elapsedTimeMs: number
		estimatedRemainingMs: number
		filesPerSecond: number
		category?: string
		phase?: string
		errorCount?: number
		warningCount?: number
		isPaused?: boolean
		recentFiles?: string[]
		batchInfo?: {
			currentBatch: number
			totalBatches: number
			batchSize: number
		}
	}
	// Performance metrics
	performanceMetrics?: {
		filesPerSecond: number
		blocksPerSecond: number
		bytesPerSecond: number
		averageFileProcessingTime: number
		averageBatchProcessingTime: number
		totalIndexingTime: number
		successRate: number
		errorRate: number
		retryRate: number
		memoryUsage: number
		cpuUsage: number
		diskIORate: number
		averageQueueWaitTime: number
		queueEfficiency: number
		concurrencyUtilization: number
		cacheHitRate: number
		duplicateDetectionRate: number
		incrementalIndexingEfficiency: number
	}
	// Optimization suggestions
	optimizationSuggestions?: Array<{
		id: string
		type: "performance" | "resource" | "configuration"
		severity: "low" | "medium" | "high"
		title: string
		description: string
		impact: string
		action?: string
		actionType?: "setting" | "restart" | "config"
	}>
	// Workspace analysis
	workspaceAnalysis?: {
		totalFiles: number
		totalSize: number
		languages: Record<string, { count: number; size: number; complexity: number }>
		directories: Array<{
			path: string
			fileCount: number
			totalSize: number
			languages: Record<string, number>
			avgComplexity: number
			priority: "high" | "medium" | "low"
			subdirectories: any[]
		}>
		highPriorityFiles: Array<{
			path: string
			size: number
			lines: number
			language: string
			complexity: number
			priority: "high" | "medium" | "low"
			issues: string[]
			dependencies: string[]
			lastModified: number
		}>
		recommendations: Array<{
			type: "optimization" | "structure" | "quality"
			severity: "low" | "medium" | "high"
			title: string
			description: string
			files?: string[]
		}>
		indexingEstimate: {
			estimatedTimeMs: number
			estimatedMemoryMB: number
			confidence: number
		}
		lastAnalyzed: number
	}
	// Indexing error details
	indexingError?: {
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
}

export type ExtensionState = Pick<
	GlobalSettings,
	| "currentApiConfigName"
	| "listApiConfigMeta"
	| "pinnedApiConfigs"
	// | "lastShownAnnouncementId"
	| "customInstructions"
	// | "taskHistory" // Optional in GlobalSettings, required here.
	| "autoApprovalEnabled"
	| "alwaysAllowReadOnly"
	| "alwaysAllowReadOnlyOutsideWorkspace"
	| "alwaysAllowWrite"
	| "alwaysAllowWriteOutsideWorkspace"
	| "alwaysAllowWriteProtected"
	// | "writeDelayMs" // Optional in GlobalSettings, required here.
	| "alwaysAllowBrowser"
	| "alwaysApproveResubmit"
	// | "requestDelaySeconds" // Optional in GlobalSettings, required here.
	| "alwaysAllowMcp"
	| "alwaysAllowModeSwitch"
	| "alwaysAllowSubtasks"
	| "alwaysAllowExecute"
	| "alwaysAllowUpdateTodoList"
	| "allowedCommands"
	| "deniedCommands"
	| "allowedMaxRequests"
	| "allowedMaxCost"
	| "browserToolEnabled"
	| "browserViewportSize"
	| "showAutoApproveMenu" // bluescode_change
	| "screenshotQuality"
	| "remoteBrowserEnabled"
	| "remoteBrowserHost"
	// | "enableCheckpoints" // Optional in GlobalSettings, required here.
	| "ttsEnabled"
	| "ttsSpeed"
	| "soundEnabled"
	| "soundVolume"
	// | "maxOpenTabsContext" // Optional in GlobalSettings, required here.
	// | "maxWorkspaceFiles" // Optional in GlobalSettings, required here.
	// | "showRooIgnoredFiles" // Optional in GlobalSettings, required here.
	// | "maxReadFileLine" // Optional in GlobalSettings, required here.
	| "maxConcurrentFileReads" // Optional in GlobalSettings, required here.
	| "allowVeryLargeReads" // bluescode_change
	| "terminalOutputLineLimit"
	| "terminalOutputCharacterLimit"
	| "terminalShellIntegrationTimeout"
	| "terminalShellIntegrationDisabled"
	| "terminalCommandDelay"
	| "terminalPowershellCounter"
	| "terminalZshClearEolMark"
	| "terminalZshOhMy"
	| "terminalZshP10k"
	| "terminalZdotdir"
	| "terminalCompressProgressBar"
	| "diagnosticsEnabled"
	| "diffEnabled"
	| "fuzzyMatchThreshold"
	// | "experiments" // Optional in GlobalSettings, required here.
	| "language"
	// | "telemetrySetting" // Optional in GlobalSettings, required here.
	// | "mcpEnabled" // Optional in GlobalSettings, required here.
	// | "enableMcpServerCreation" // Optional in GlobalSettings, required here.
	// | "mode" // Optional in GlobalSettings, required here.
	| "modeApiConfigs"
	// | "customModes" // Optional in GlobalSettings, required here.
	| "customModePrompts"
	| "customSupportPrompts"
	| "enhancementApiConfigId"
	| "localWorkflowToggles" // bluescode_change
	| "globalRulesToggles" // bluescode_change
	| "localRulesToggles" // bluescode_change
	| "globalWorkflowToggles" // bluescode_change
	| "commitMessageApiConfigId" // bluescode_change
	| "terminalCommandApiConfigId" // bluescode_change
	| "dismissedNotificationIds" // bluescode_change
	| "ghostServiceSettings" // bluescode_change
	| "condensingApiConfigId"
	| "customCondensingPrompt"
	| "codebaseIndexConfig"
	| "codebaseIndexModels"
	| "profileThresholds"
	| "systemNotificationsEnabled" // bluescode_change
	| "includeDiagnosticMessages"
	| "maxDiagnosticMessages"
> & {
	version: string
	clineMessages: ClineMessage[]
	currentTaskItem?: HistoryItem
	apiConfiguration?: ProviderSettings
	uriScheme?: string
	uiKind?: string // bluescode_change
	shouldShowAnnouncement: boolean

	taskHistory: HistoryItem[]

	writeDelayMs: number
	requestDelaySeconds: number

	enableCheckpoints: boolean
	maxOpenTabsContext: number // Maximum number of VSCode open tabs to include in context (0-500)
	maxWorkspaceFiles: number // Maximum number of files to include in current working directory details (0-500)
	showRooIgnoredFiles: boolean // Whether to show .bluescodeignore'd files in listings
	maxReadFileLine: number // Maximum number of lines to read from a file before truncating
	showAutoApproveMenu: boolean // bluescode_change: Whether to show the auto-approve menu in the chat view
	maxImageFileSize: number // Maximum size of image files to process in MB
	maxTotalImageSize: number // Maximum total size for all images in a single read operation in MB

	experiments: Experiments // Map of experiment IDs to their enabled state

	mcpEnabled: boolean
	enableMcpServerCreation: boolean

	mode: Mode
	customModes: ModeConfig[]
	toolRequirements?: Record<string, boolean> // Map of tool names to their requirements (e.g. {"apply_diff": true} if diffEnabled)

	cwd?: string // Current working directory
	telemetrySetting: TelemetrySetting
	telemetryKey?: string
	machineId?: string

	renderContext: "sidebar" | "editor"
	settingsImportedAt?: number
	historyPreviewCollapsed?: boolean
	showTaskTimeline?: boolean // bluescode_change

	cloudUserInfo: CloudUserInfo | null
	cloudIsAuthenticated: boolean
	cloudApiUrl?: string
	sharingEnabled: boolean
	organizationAllowList: OrganizationAllowList
	organizationSettingsVersion?: number

	autoCondenseContext: boolean
	autoCondenseContextPercent: number
	marketplaceItems?: MarketplaceItem[]
	marketplaceInstalledMetadata?: { project: Record<string, any>; global: Record<string, any> }
	profileThresholds: Record<string, number>
	hasOpenedModeSelector: boolean
}

export interface ClineSayTool {
	tool:
		| "editedExistingFile"
		| "appliedDiff"
		| "newFileCreated"
		| "codebaseSearch"
		| "readFile"
		| "fetchInstructions"
		| "listFilesTopLevel"
		| "listFilesRecursive"
		| "listCodeDefinitionNames"
		| "searchFiles"
		| "switchMode"
		| "newTask"
		| "finishTask"
		| "searchAndReplace"
		| "insertContent"
	path?: string
	diff?: string
	content?: string
	regex?: string
	filePattern?: string
	mode?: string
	reason?: string
	isOutsideWorkspace?: boolean
	isProtected?: boolean
	additionalFileCount?: number // Number of additional files in the same read_file request
	search?: string
	replace?: string
	useRegex?: boolean
	ignoreCase?: boolean
	startLine?: number
	endLine?: number
	lineNumber?: number
	query?: string
	batchFiles?: Array<{
		path: string
		lineSnippet: string
		isOutsideWorkspace?: boolean
		key: string
		content?: string
	}>
	batchDiffs?: Array<{
		path: string
		changeCount: number
		key: string
		content: string
		diffs?: Array<{
			content: string
			startLine?: number
		}>
	}>
	question?: string
}

// Must keep in sync with system prompt.
export const browserActions = [
	"launch",
	"click",
	"hover",
	"type",
	"scroll_down",
	"scroll_up",
	"resize",
	"close",
] as const

export type BrowserAction = (typeof browserActions)[number]

export interface ClineSayBrowserAction {
	action: BrowserAction
	coordinate?: string
	size?: string
	text?: string
}

export type BrowserActionResult = {
	screenshot?: string
	logs?: string
	currentUrl?: string
	currentMousePosition?: string
}

export interface ClineAskUseMcpServer {
	serverName: string
	type: "use_mcp_tool" | "access_mcp_resource"
	toolName?: string
	arguments?: string
	uri?: string
	response?: string
}

export interface ClineApiReqInfo {
	request?: string
	tokensIn?: number
	tokensOut?: number
	cacheWrites?: number
	cacheReads?: number
	cost?: number
	usageMissing?: boolean // bluescode_change
	cancelReason?: ClineApiReqCancelReason
	streamingFailedMessage?: string
	apiProtocol?: "anthropic" | "openai"
}

export type ClineApiReqCancelReason = "streaming_failed" | "user_cancelled"

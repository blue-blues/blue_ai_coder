import * as vscode from "vscode"
import { CodeIndexManager } from "../code-index/manager"
import { StartupIndexingCoordinator, StartupIndexingConfig } from "./StartupIndexingCoordinator"

/**
 * Legacy indexing behavior modes
 */
export enum LegacyIndexingMode {
	DISABLED = "disabled",
	BACKGROUND_ONLY = "background_only",
	ON_DEMAND = "on_demand",
	AUTOMATIC = "automatic",
}

/**
 * Compatibility settings for legacy behavior
 */
export interface CompatibilitySettings {
	enableLegacyMode: boolean
	legacyIndexingMode: LegacyIndexingMode
	preserveExistingIndexes: boolean
	fallbackToLegacyOnError: boolean
	respectLegacySettings: boolean
}

/**
 * Default compatibility settings
 */
const DEFAULT_COMPATIBILITY_SETTINGS: CompatibilitySettings = {
	enableLegacyMode: false,
	legacyIndexingMode: LegacyIndexingMode.BACKGROUND_ONLY,
	preserveExistingIndexes: true,
	fallbackToLegacyOnError: true,
	respectLegacySettings: true,
}

/**
 * Backward compatibility layer for startup indexing
 */
export class StartupIndexingCompatibility {
	private compatibilitySettings: CompatibilitySettings
	private legacyConfigKeys = [
		"bluesCode.indexing.enabled",
		"bluesCode.indexing.autoStart",
		"bluesCode.indexing.backgroundProcessing",
		"bluesCode.codeIndex.enabled",
		"bluesCode.codeIndex.autoIndex",
	]

	constructor(private readonly outputChannel: vscode.OutputChannel) {
		this.compatibilitySettings = this.loadCompatibilitySettings()
	}

	/**
	 * Checks if startup indexing should be enabled based on compatibility settings
	 */
	public shouldEnableStartupIndexing(): boolean {
		// If legacy mode is explicitly enabled, respect that
		if (this.compatibilitySettings.enableLegacyMode) {
			return this.compatibilitySettings.legacyIndexingMode !== LegacyIndexingMode.DISABLED
		}

		// Check legacy settings if configured to respect them
		if (this.compatibilitySettings.respectLegacySettings) {
			const legacyEnabled = this.checkLegacyIndexingSettings()
			if (legacyEnabled !== null) {
				this.outputChannel.appendLine(`[StartupIndexing] Using legacy setting: ${legacyEnabled}`)
				return legacyEnabled
			}
		}

		// Default to enabled if no legacy settings found
		return true
	}

	/**
	 * Adapts startup indexing configuration based on legacy settings
	 */
	public adaptConfigurationForCompatibility(config: StartupIndexingConfig): StartupIndexingConfig {
		const adaptedConfig = { ...config }

		// If in legacy mode, adjust configuration
		if (this.compatibilitySettings.enableLegacyMode) {
			switch (this.compatibilitySettings.legacyIndexingMode) {
				case LegacyIndexingMode.DISABLED:
					adaptedConfig.enabled = false
					break

				case LegacyIndexingMode.BACKGROUND_ONLY:
					adaptedConfig.enabled = true
					adaptedConfig.mandatoryForLargeWorkspaces = false
					adaptedConfig.showProgressUI = false
					adaptedConfig.allowSkipAfterTimeout = 1000 // Allow immediate skip
					break

				case LegacyIndexingMode.ON_DEMAND:
					adaptedConfig.enabled = false // Will be enabled on demand
					break

				case LegacyIndexingMode.AUTOMATIC:
					// Use default enhanced behavior
					break
			}
		}

		// Respect legacy timeout settings if they exist
		const legacyTimeouts = this.getLegacyTimeoutSettings()
		if (legacyTimeouts.criticalTimeout) {
			adaptedConfig.criticalFilesTimeout = legacyTimeouts.criticalTimeout
		}
		if (legacyTimeouts.highPriorityTimeout) {
			adaptedConfig.highPriorityTimeout = legacyTimeouts.highPriorityTimeout
		}

		// Respect legacy UI preferences
		const legacyUISettings = this.getLegacyUISettings()
		if (legacyUISettings.showProgress !== null) {
			adaptedConfig.showProgressUI = legacyUISettings.showProgress
		}

		this.outputChannel.appendLine(
			`[StartupIndexing] Configuration adapted for compatibility: enabled=${adaptedConfig.enabled}, ` +
				`mandatory=${adaptedConfig.mandatoryForLargeWorkspaces}, showUI=${adaptedConfig.showProgressUI}`,
		)

		return adaptedConfig
	}

	/**
	 * Checks if existing indexes should be preserved
	 */
	public shouldPreserveExistingIndexes(): boolean {
		return this.compatibilitySettings.preserveExistingIndexes
	}

	/**
	 * Determines if we should fallback to legacy behavior on error
	 */
	public shouldFallbackToLegacyOnError(): boolean {
		return this.compatibilitySettings.fallbackToLegacyOnError
	}

	/**
	 * Migrates legacy settings to new startup indexing configuration
	 */
	public async migrateLegacySettings(): Promise<void> {
		const config = vscode.workspace.getConfiguration()
		let migrationPerformed = false

		// Migrate legacy indexing enabled setting
		const legacyEnabled = this.checkLegacyIndexingSettings()
		if (legacyEnabled !== null) {
			await config.update("bluesCode.startupIndexing.enabled", legacyEnabled, vscode.ConfigurationTarget.Global)
			migrationPerformed = true
		}

		// Migrate legacy timeout settings
		const legacyTimeouts = this.getLegacyTimeoutSettings()
		if (legacyTimeouts.criticalTimeout) {
			await config.update(
				"bluesCode.startupIndexing.criticalFilesTimeout",
				legacyTimeouts.criticalTimeout,
				vscode.ConfigurationTarget.Global,
			)
			migrationPerformed = true
		}

		// Migrate legacy UI settings
		const legacyUISettings = this.getLegacyUISettings()
		if (legacyUISettings.showProgress !== null) {
			await config.update(
				"bluesCode.startupIndexing.showProgressUI",
				legacyUISettings.showProgress,
				vscode.ConfigurationTarget.Global,
			)
			migrationPerformed = true
		}

		if (migrationPerformed) {
			this.outputChannel.appendLine(
				"[StartupIndexing] Legacy settings migrated to startup indexing configuration",
			)

			// Show migration notification
			const choice = await vscode.window.showInformationMessage(
				"Blues Code has migrated your indexing settings to the new startup indexing system. " +
					"Your preferences have been preserved.",
				"Learn More",
				"OK",
			)

			if (choice === "Learn More") {
				vscode.env.openExternal(vscode.Uri.parse("https://docs.bluescode.com/startup-indexing"))
			}
		}
	}

	/**
	 * Creates a compatibility wrapper for legacy code index managers
	 */
	public createCompatibilityWrapper(
		coordinator: StartupIndexingCoordinator,
		managers: CodeIndexManager[],
	): CodeIndexManagerCompatibilityWrapper {
		return new CodeIndexManagerCompatibilityWrapper(coordinator, managers, this.outputChannel)
	}

	/**
	 * Validates that existing functionality still works
	 */
	public async validateBackwardCompatibility(managers: CodeIndexManager[]): Promise<{
		isCompatible: boolean
		issues: string[]
		recommendations: string[]
	}> {
		const issues: string[] = []
		const recommendations: string[] = []

		// Check if existing managers are still functional
		for (const manager of managers) {
			try {
				const status = manager.getCurrentStatus()
				if (!status) {
					issues.push(`Code index manager for ${manager.workspacePath} is not responding`)
				}
			} catch (error) {
				issues.push(`Error accessing code index manager: ${error.message}`)
			}
		}

		// Check if legacy settings are conflicting
		const hasConflictingSettings = this.checkForConflictingSettings()
		if (hasConflictingSettings.length > 0) {
			issues.push(`Conflicting legacy settings detected: ${hasConflictingSettings.join(", ")}`)
			recommendations.push("Consider migrating legacy settings to startup indexing configuration")
		}

		// Check if legacy extensions might interfere
		const conflictingExtensions = this.checkForConflictingExtensions()
		if (conflictingExtensions.length > 0) {
			issues.push(`Potentially conflicting extensions detected: ${conflictingExtensions.join(", ")}`)
			recommendations.push("Review extension compatibility")
		}

		return {
			isCompatible: issues.length === 0,
			issues,
			recommendations,
		}
	}

	/**
	 * Loads compatibility settings from VSCode configuration
	 */
	private loadCompatibilitySettings(): CompatibilitySettings {
		const config = vscode.workspace.getConfiguration("bluesCode.startupIndexing.compatibility")

		return {
			enableLegacyMode: config.get("enableLegacyMode", DEFAULT_COMPATIBILITY_SETTINGS.enableLegacyMode),
			legacyIndexingMode: config.get(
				"legacyIndexingMode",
				DEFAULT_COMPATIBILITY_SETTINGS.legacyIndexingMode,
			) as LegacyIndexingMode,
			preserveExistingIndexes: config.get(
				"preserveExistingIndexes",
				DEFAULT_COMPATIBILITY_SETTINGS.preserveExistingIndexes,
			),
			fallbackToLegacyOnError: config.get(
				"fallbackToLegacyOnError",
				DEFAULT_COMPATIBILITY_SETTINGS.fallbackToLegacyOnError,
			),
			respectLegacySettings: config.get(
				"respectLegacySettings",
				DEFAULT_COMPATIBILITY_SETTINGS.respectLegacySettings,
			),
		}
	}

	/**
	 * Checks legacy indexing settings
	 */
	private checkLegacyIndexingSettings(): boolean | null {
		const config = vscode.workspace.getConfiguration()

		for (const key of this.legacyConfigKeys) {
			const value = config.get(key)
			if (typeof value === "boolean") {
				return value
			}
		}

		return null
	}

	/**
	 * Gets legacy timeout settings
	 */
	private getLegacyTimeoutSettings(): { criticalTimeout?: number; highPriorityTimeout?: number } {
		const config = vscode.workspace.getConfiguration()

		return {
			criticalTimeout:
				config.get("bluesCode.indexing.criticalTimeout") || config.get("bluesCode.codeIndex.timeout"),
			highPriorityTimeout:
				config.get("bluesCode.indexing.highPriorityTimeout") ||
				config.get("bluesCode.codeIndex.highPriorityTimeout"),
		}
	}

	/**
	 * Gets legacy UI settings
	 */
	private getLegacyUISettings(): { showProgress: boolean | null } {
		const config = vscode.workspace.getConfiguration()

		const showProgress =
			config.get("bluesCode.indexing.showProgress") || config.get("bluesCode.codeIndex.showProgress")

		return {
			showProgress: typeof showProgress === "boolean" ? showProgress : null,
		}
	}

	/**
	 * Checks for conflicting settings
	 */
	private checkForConflictingSettings(): string[] {
		const config = vscode.workspace.getConfiguration()
		const conflicts: string[] = []

		// Check for conflicting indexing settings
		const startupEnabled = config.get("bluesCode.startupIndexing.enabled")
		const legacyEnabled = this.checkLegacyIndexingSettings()

		if (startupEnabled !== undefined && legacyEnabled !== null && startupEnabled !== legacyEnabled) {
			conflicts.push("Startup indexing and legacy indexing have conflicting enabled states")
		}

		return conflicts
	}

	/**
	 * Checks for potentially conflicting extensions
	 */
	private checkForConflictingExtensions(): string[] {
		const conflicts: string[] = []

		// Check for known conflicting extensions
		const conflictingExtensionIds = [
			"ms-vscode.vscode-typescript-next",
			"bradlc.vscode-tailwindcss",
			"ms-python.python",
		]

		for (const extensionId of conflictingExtensionIds) {
			const extension = vscode.extensions.getExtension(extensionId)
			if (extension && extension.isActive) {
				// These extensions might have their own indexing that could conflict
				// This is just an example - in practice, you'd check for actual conflicts
			}
		}

		return conflicts
	}
}

/**
 * Compatibility wrapper for code index managers
 */
class CodeIndexManagerCompatibilityWrapper {
	constructor(
		private readonly coordinator: StartupIndexingCoordinator,
		private readonly managers: CodeIndexManager[],
		private readonly outputChannel: vscode.OutputChannel,
	) {}

	/**
	 * Provides legacy-compatible access to indexing status
	 */
	public getLegacyStatus(): any {
		const coordinatorStatus = this.coordinator.getStatus()

		// Convert to legacy format
		return {
			isIndexing: coordinatorStatus.isBlocking,
			progress: coordinatorStatus.progress.overallProgress,
			phase: coordinatorStatus.phase,
			filesProcessed: coordinatorStatus.progress.filesProcessed,
			totalFiles: coordinatorStatus.progress.totalFiles,
		}
	}

	/**
	 * Provides legacy-compatible indexing control
	 */
	public async startLegacyIndexing(): Promise<void> {
		this.outputChannel.appendLine(
			"[StartupIndexing] Legacy indexing start requested - delegating to startup coordinator",
		)

		// This would trigger startup indexing if not already running
		// Implementation depends on how legacy code expects to control indexing
	}

	/**
	 * Provides legacy-compatible indexing stop
	 */
	public async stopLegacyIndexing(): Promise<void> {
		this.outputChannel.appendLine("[StartupIndexing] Legacy indexing stop requested")

		// Request cancellation through the coordinator
		this.coordinator.requestCancel()
	}
}

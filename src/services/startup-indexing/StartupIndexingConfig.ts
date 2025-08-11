import * as vscode from "vscode"

/**
 * Configuration keys for startup indexing settings
 */
export const STARTUP_INDEXING_CONFIG_KEYS = {
	ENABLED: "bluesCode.startupIndexing.enabled",
	MANDATORY_FOR_LARGE: "bluesCode.startupIndexing.mandatoryForLargeWorkspaces",
	MAX_AUTO_START_SIZE: "bluesCode.startupIndexing.maxWorkspaceSizeForAutoStart",
	CRITICAL_FILES_TIMEOUT: "bluesCode.startupIndexing.criticalFilesTimeout",
	HIGH_PRIORITY_TIMEOUT: "bluesCode.startupIndexing.highPriorityTimeout",
	SHOW_PROGRESS_UI: "bluesCode.startupIndexing.showProgressUI",
	ALLOW_SKIP_TIMEOUT: "bluesCode.startupIndexing.allowSkipAfterTimeout",
	PERFORMANCE_OPTIMIZATIONS: "bluesCode.startupIndexing.enablePerformanceOptimizations",
} as const

/**
 * Default configuration values
 */
export const DEFAULT_STARTUP_INDEXING_CONFIG = {
	enabled: true,
	mandatoryForLargeWorkspaces: true,
	maxWorkspaceSizeForAutoStart: 1000,
	criticalFilesTimeout: 30000, // 30 seconds
	highPriorityTimeout: 60000, // 1 minute
	showProgressUI: true,
	allowSkipAfterTimeout: 45000, // 45 seconds
	enablePerformanceOptimizations: true,
} as const

/**
 * Startup indexing configuration manager
 */
export class StartupIndexingConfigManager {
	private static instance: StartupIndexingConfigManager | null = null

	private constructor() {}

	public static getInstance(): StartupIndexingConfigManager {
		if (!StartupIndexingConfigManager.instance) {
			StartupIndexingConfigManager.instance = new StartupIndexingConfigManager()
		}
		return StartupIndexingConfigManager.instance
	}

	/**
	 * Gets the current startup indexing configuration
	 */
	public getConfig(): typeof DEFAULT_STARTUP_INDEXING_CONFIG {
		const config = vscode.workspace.getConfiguration()

		return {
			enabled: config.get(STARTUP_INDEXING_CONFIG_KEYS.ENABLED, DEFAULT_STARTUP_INDEXING_CONFIG.enabled),
			mandatoryForLargeWorkspaces: config.get(
				STARTUP_INDEXING_CONFIG_KEYS.MANDATORY_FOR_LARGE,
				DEFAULT_STARTUP_INDEXING_CONFIG.mandatoryForLargeWorkspaces,
			),
			maxWorkspaceSizeForAutoStart: config.get(
				STARTUP_INDEXING_CONFIG_KEYS.MAX_AUTO_START_SIZE,
				DEFAULT_STARTUP_INDEXING_CONFIG.maxWorkspaceSizeForAutoStart,
			),
			criticalFilesTimeout: config.get(
				STARTUP_INDEXING_CONFIG_KEYS.CRITICAL_FILES_TIMEOUT,
				DEFAULT_STARTUP_INDEXING_CONFIG.criticalFilesTimeout,
			),
			highPriorityTimeout: config.get(
				STARTUP_INDEXING_CONFIG_KEYS.HIGH_PRIORITY_TIMEOUT,
				DEFAULT_STARTUP_INDEXING_CONFIG.highPriorityTimeout,
			),
			showProgressUI: config.get(
				STARTUP_INDEXING_CONFIG_KEYS.SHOW_PROGRESS_UI,
				DEFAULT_STARTUP_INDEXING_CONFIG.showProgressUI,
			),
			allowSkipAfterTimeout: config.get(
				STARTUP_INDEXING_CONFIG_KEYS.ALLOW_SKIP_TIMEOUT,
				DEFAULT_STARTUP_INDEXING_CONFIG.allowSkipAfterTimeout,
			),
			enablePerformanceOptimizations: config.get(
				STARTUP_INDEXING_CONFIG_KEYS.PERFORMANCE_OPTIMIZATIONS,
				DEFAULT_STARTUP_INDEXING_CONFIG.enablePerformanceOptimizations,
			),
		}
	}

	/**
	 * Updates a specific configuration value
	 */
	public async updateConfig<K extends keyof typeof DEFAULT_STARTUP_INDEXING_CONFIG>(
		key: K,
		value: (typeof DEFAULT_STARTUP_INDEXING_CONFIG)[K],
		target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global,
	): Promise<void> {
		const config = vscode.workspace.getConfiguration()
		const configKey = this.getConfigKey(key)

		await config.update(configKey, value, target)
	}

	/**
	 * Resets configuration to defaults
	 */
	public async resetToDefaults(
		target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global,
	): Promise<void> {
		const config = vscode.workspace.getConfiguration()

		for (const [key, defaultValue] of Object.entries(DEFAULT_STARTUP_INDEXING_CONFIG)) {
			const configKey = this.getConfigKey(key as keyof typeof DEFAULT_STARTUP_INDEXING_CONFIG)
			await config.update(configKey, defaultValue, target)
		}
	}

	/**
	 * Validates the current configuration
	 */
	public validateConfig(): { isValid: boolean; errors: string[] } {
		const config = this.getConfig()
		const errors: string[] = []

		// Validate timeout values
		if (config.criticalFilesTimeout < 5000) {
			errors.push("Critical files timeout must be at least 5 seconds")
		}

		if (config.highPriorityTimeout < 10000) {
			errors.push("High priority timeout must be at least 10 seconds")
		}

		if (config.allowSkipAfterTimeout < 10000) {
			errors.push("Skip timeout must be at least 10 seconds")
		}

		// Validate workspace size threshold
		if (config.maxWorkspaceSizeForAutoStart < 10) {
			errors.push("Auto-start threshold must be at least 10 files")
		}

		// Validate timeout relationships
		if (config.allowSkipAfterTimeout < config.criticalFilesTimeout) {
			errors.push("Skip timeout should be greater than or equal to critical files timeout")
		}

		return {
			isValid: errors.length === 0,
			errors,
		}
	}

	/**
	 * Gets the configuration key for a given setting
	 */
	private getConfigKey(key: keyof typeof DEFAULT_STARTUP_INDEXING_CONFIG): string {
		const keyMap: Record<keyof typeof DEFAULT_STARTUP_INDEXING_CONFIG, string> = {
			enabled: STARTUP_INDEXING_CONFIG_KEYS.ENABLED,
			mandatoryForLargeWorkspaces: STARTUP_INDEXING_CONFIG_KEYS.MANDATORY_FOR_LARGE,
			maxWorkspaceSizeForAutoStart: STARTUP_INDEXING_CONFIG_KEYS.MAX_AUTO_START_SIZE,
			criticalFilesTimeout: STARTUP_INDEXING_CONFIG_KEYS.CRITICAL_FILES_TIMEOUT,
			highPriorityTimeout: STARTUP_INDEXING_CONFIG_KEYS.HIGH_PRIORITY_TIMEOUT,
			showProgressUI: STARTUP_INDEXING_CONFIG_KEYS.SHOW_PROGRESS_UI,
			allowSkipAfterTimeout: STARTUP_INDEXING_CONFIG_KEYS.ALLOW_SKIP_TIMEOUT,
			enablePerformanceOptimizations: STARTUP_INDEXING_CONFIG_KEYS.PERFORMANCE_OPTIMIZATIONS,
		}

		return keyMap[key]
	}

	/**
	 * Listens for configuration changes
	 */
	public onConfigurationChanged(
		callback: (config: typeof DEFAULT_STARTUP_INDEXING_CONFIG) => void,
	): vscode.Disposable {
		return vscode.workspace.onDidChangeConfiguration((event) => {
			// Check if any startup indexing configuration changed
			const relevantKeys = Object.values(STARTUP_INDEXING_CONFIG_KEYS)
			const hasRelevantChange = relevantKeys.some((key) => event.affectsConfiguration(key))

			if (hasRelevantChange) {
				callback(this.getConfig())
			}
		})
	}

	/**
	 * Gets configuration schema for settings UI
	 */
	public getConfigurationSchema(): any {
		return {
			type: "object",
			title: "Startup Indexing",
			properties: {
				[STARTUP_INDEXING_CONFIG_KEYS.ENABLED]: {
					type: "boolean",
					default: DEFAULT_STARTUP_INDEXING_CONFIG.enabled,
					description: "Enable startup indexing for maximum AI context",
				},
				[STARTUP_INDEXING_CONFIG_KEYS.MANDATORY_FOR_LARGE]: {
					type: "boolean",
					default: DEFAULT_STARTUP_INDEXING_CONFIG.mandatoryForLargeWorkspaces,
					description: "Require indexing completion for large workspaces",
				},
				[STARTUP_INDEXING_CONFIG_KEYS.MAX_AUTO_START_SIZE]: {
					type: "number",
					default: DEFAULT_STARTUP_INDEXING_CONFIG.maxWorkspaceSizeForAutoStart,
					minimum: 10,
					maximum: 10000,
					description: "Maximum files to auto-start indexing without confirmation",
				},
				[STARTUP_INDEXING_CONFIG_KEYS.CRITICAL_FILES_TIMEOUT]: {
					type: "number",
					default: DEFAULT_STARTUP_INDEXING_CONFIG.criticalFilesTimeout,
					minimum: 5000,
					maximum: 300000,
					description: "Timeout for critical files indexing (milliseconds)",
				},
				[STARTUP_INDEXING_CONFIG_KEYS.HIGH_PRIORITY_TIMEOUT]: {
					type: "number",
					default: DEFAULT_STARTUP_INDEXING_CONFIG.highPriorityTimeout,
					minimum: 10000,
					maximum: 600000,
					description: "Timeout for high priority files indexing (milliseconds)",
				},
				[STARTUP_INDEXING_CONFIG_KEYS.SHOW_PROGRESS_UI]: {
					type: "boolean",
					default: DEFAULT_STARTUP_INDEXING_CONFIG.showProgressUI,
					description: "Show detailed progress UI during startup indexing",
				},
				[STARTUP_INDEXING_CONFIG_KEYS.ALLOW_SKIP_TIMEOUT]: {
					type: "number",
					default: DEFAULT_STARTUP_INDEXING_CONFIG.allowSkipAfterTimeout,
					minimum: 10000,
					maximum: 300000,
					description: "Allow skip after timeout (milliseconds)",
				},
				[STARTUP_INDEXING_CONFIG_KEYS.PERFORMANCE_OPTIMIZATIONS]: {
					type: "boolean",
					default: DEFAULT_STARTUP_INDEXING_CONFIG.enablePerformanceOptimizations,
					description: "Enable performance optimizations during startup indexing",
				},
			},
		}
	}
}

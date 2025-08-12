import * as vscode from "vscode"
import { TelemetryService } from "@blues-code/telemetry"
import { TelemetryEventName } from "@blues-code/types"
import { StartupIndexingConfig } from "./StartupIndexingCoordinator"
import { StartupIndexingCompatibility } from "./StartupIndexingCompatibility"

/**
 * Rollout phases for startup indexing
 */
export enum RolloutPhase {
	DISABLED = "disabled",
	INTERNAL_TESTING = "internal_testing",
	BETA_USERS = "beta_users",
	GRADUAL_ROLLOUT = "gradual_rollout",
	FULL_ROLLOUT = "full_rollout",
}

/**
 * Feature flags for startup indexing
 */
export interface StartupIndexingFeatureFlags {
	enableStartupIndexing: boolean
	enableProgressUI: boolean
	enableErrorRecovery: boolean
	enableMonitoring: boolean
	enableCompatibilityLayer: boolean
	enableAdvancedAnalysis: boolean
	enablePerformanceOptimizations: boolean
	rolloutPhase: RolloutPhase
	rolloutPercentage: number
	targetUserGroups: string[]
}

/**
 * Rollout configuration
 */
export interface RolloutConfig {
	phase: RolloutPhase
	percentage: number
	userGroups: string[]
	enabledFeatures: string[]
	disabledFeatures: string[]
	rollbackThreshold: {
		errorRate: number
		performanceDegradation: number
		userComplaints: number
	}
	monitoring: {
		enableTelemetry: boolean
		enableHealthChecks: boolean
		enablePerformanceTracking: boolean
	}
}

/**
 * Default rollout configurations for each phase
 */
const ROLLOUT_CONFIGS: Record<RolloutPhase, RolloutConfig> = {
	[RolloutPhase.DISABLED]: {
		phase: RolloutPhase.DISABLED,
		percentage: 0,
		userGroups: [],
		enabledFeatures: [],
		disabledFeatures: ["all"],
		rollbackThreshold: { errorRate: 0, performanceDegradation: 0, userComplaints: 0 },
		monitoring: { enableTelemetry: false, enableHealthChecks: false, enablePerformanceTracking: false },
	},
	[RolloutPhase.INTERNAL_TESTING]: {
		phase: RolloutPhase.INTERNAL_TESTING,
		percentage: 100,
		userGroups: ["internal", "developers"],
		enabledFeatures: ["all"],
		disabledFeatures: [],
		rollbackThreshold: { errorRate: 50, performanceDegradation: 50, userComplaints: 10 },
		monitoring: { enableTelemetry: true, enableHealthChecks: true, enablePerformanceTracking: true },
	},
	[RolloutPhase.BETA_USERS]: {
		phase: RolloutPhase.BETA_USERS,
		percentage: 100,
		userGroups: ["beta", "early-adopters"],
		enabledFeatures: ["startup-indexing", "progress-ui", "error-recovery", "monitoring"],
		disabledFeatures: ["advanced-analysis"],
		rollbackThreshold: { errorRate: 20, performanceDegradation: 30, userComplaints: 5 },
		monitoring: { enableTelemetry: true, enableHealthChecks: true, enablePerformanceTracking: true },
	},
	[RolloutPhase.GRADUAL_ROLLOUT]: {
		phase: RolloutPhase.GRADUAL_ROLLOUT,
		percentage: 25, // Start with 25% of users
		userGroups: ["general"],
		enabledFeatures: ["startup-indexing", "progress-ui", "error-recovery"],
		disabledFeatures: ["advanced-analysis"],
		rollbackThreshold: { errorRate: 10, performanceDegradation: 20, userComplaints: 3 },
		monitoring: { enableTelemetry: true, enableHealthChecks: true, enablePerformanceTracking: true },
	},
	[RolloutPhase.FULL_ROLLOUT]: {
		phase: RolloutPhase.FULL_ROLLOUT,
		percentage: 100,
		userGroups: ["all"],
		enabledFeatures: ["all"],
		disabledFeatures: [],
		rollbackThreshold: { errorRate: 5, performanceDegradation: 10, userComplaints: 2 },
		monitoring: { enableTelemetry: true, enableHealthChecks: false, enablePerformanceTracking: false },
	},
}

/**
 * User classification for rollout targeting
 */
export interface UserClassification {
	userId: string
	userGroup: string
	isInternal: boolean
	isBetaUser: boolean
	hasOptedIn: boolean
	installationDate: Date
	extensionVersion: string
	vsCodeVersion: string
	platform: string
}

/**
 * Rollout metrics for monitoring
 */
export interface RolloutMetrics {
	phase: RolloutPhase
	activeUsers: number
	enabledUsers: number
	errorRate: number
	performanceMetrics: {
		averageStartupTime: number
		successRate: number
		userSatisfaction: number
	}
	rollbackTriggers: {
		errorRateExceeded: boolean
		performanceDegraded: boolean
		userComplaintsHigh: boolean
	}
}

/**
 * Startup indexing rollout manager
 */
export class StartupIndexingRollout {
	private currentConfig: RolloutConfig
	private featureFlags: StartupIndexingFeatureFlags
	private userClassification: UserClassification | null = null
	private rolloutMetrics: RolloutMetrics
	private rolloutTimer: NodeJS.Timeout | null = null

	constructor(
		private readonly outputChannel: vscode.OutputChannel,
		private readonly context: vscode.ExtensionContext,
	) {
		this.currentConfig = this.loadRolloutConfig()
		this.featureFlags = this.generateFeatureFlags()
		this.rolloutMetrics = this.initializeMetrics()
		this.classifyUser()
	}

	/**
	 * Determines if startup indexing should be enabled for the current user
	 */
	public shouldEnableStartupIndexing(): boolean {
		// Check if feature is globally disabled
		if (this.currentConfig.phase === RolloutPhase.DISABLED) {
			this.outputChannel.appendLine("[StartupIndexing] Rollout: Feature disabled globally")
			return false
		}

		// Check user classification
		if (!this.userClassification) {
			this.outputChannel.appendLine("[StartupIndexing] Rollout: User classification unavailable")
			return false
		}

		// Check if user is in target group
		if (!this.isUserInTargetGroup()) {
			this.outputChannel.appendLine("[StartupIndexing] Rollout: User not in target group")
			return false
		}

		// Check rollout percentage
		if (!this.isUserInRolloutPercentage()) {
			this.outputChannel.appendLine("[StartupIndexing] Rollout: User not in rollout percentage")
			return false
		}

		// Check if feature is enabled
		if (!this.featureFlags.enableStartupIndexing) {
			this.outputChannel.appendLine("[StartupIndexing] Rollout: Feature flag disabled")
			return false
		}

		this.outputChannel.appendLine(
			`[StartupIndexing] Rollout: Enabled for user (phase: ${this.currentConfig.phase})`,
		)

		// Log rollout decision
		TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_PROGRESS, {
			event: "rollout_decision",
			enabled: true,
			phase: this.currentConfig.phase,
			userGroup: this.userClassification.userGroup,
			percentage: this.currentConfig.percentage,
		})

		return true
	}

	/**
	 * Gets feature flags for the current user
	 */
	public getFeatureFlags(): StartupIndexingFeatureFlags {
		return { ...this.featureFlags }
	}

	/**
	 * Adapts configuration based on rollout phase
	 */
	public adaptConfigurationForRollout(baseConfig: StartupIndexingConfig): StartupIndexingConfig {
		const adaptedConfig = { ...baseConfig }

		// Apply phase-specific modifications
		switch (this.currentConfig.phase) {
			case RolloutPhase.INTERNAL_TESTING:
				// Enable all features for internal testing
				adaptedConfig.enablePerformanceOptimizations = true
				adaptedConfig.showProgressUI = true
				break

			case RolloutPhase.BETA_USERS:
				// Conservative settings for beta users
				adaptedConfig.criticalFilesTimeout = Math.min(adaptedConfig.criticalFilesTimeout * 1.5, 45000)
				adaptedConfig.allowSkipAfterTimeout = Math.min(adaptedConfig.allowSkipAfterTimeout, 30000)
				break

			case RolloutPhase.GRADUAL_ROLLOUT:
				// Safe settings for gradual rollout
				adaptedConfig.mandatoryForLargeWorkspaces = false
				adaptedConfig.allowSkipAfterTimeout = Math.min(adaptedConfig.allowSkipAfterTimeout, 20000)
				break

			case RolloutPhase.FULL_ROLLOUT:
				// Use default settings
				break
		}

		// Apply feature flag overrides
		if (!this.featureFlags.enableProgressUI) {
			adaptedConfig.showProgressUI = false
		}

		if (!this.featureFlags.enablePerformanceOptimizations) {
			adaptedConfig.enablePerformanceOptimizations = false
		}

		this.outputChannel.appendLine(
			`[StartupIndexing] Configuration adapted for rollout phase: ${this.currentConfig.phase}`,
		)

		return adaptedConfig
	}

	/**
	 * Records rollout metrics
	 */
	public recordMetrics(metrics: {
		startupTime?: number
		successRate?: number
		errorRate?: number
		userFeedback?: "positive" | "negative" | "neutral"
	}): void {
		if (metrics.startupTime) {
			this.rolloutMetrics.performanceMetrics.averageStartupTime =
				(this.rolloutMetrics.performanceMetrics.averageStartupTime + metrics.startupTime) / 2
		}

		if (metrics.successRate !== undefined) {
			this.rolloutMetrics.performanceMetrics.successRate = metrics.successRate
		}

		if (metrics.errorRate !== undefined) {
			this.rolloutMetrics.errorRate = metrics.errorRate
		}

		// Check rollback triggers
		this.checkRollbackTriggers()

		// Send telemetry
		TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_PROGRESS, {
			event: "rollout_metrics",
			phase: this.currentConfig.phase,
			...metrics,
		})
	}

	/**
	 * Advances to the next rollout phase if conditions are met
	 */
	public async advanceRolloutPhase(): Promise<boolean> {
		const currentPhase = this.currentConfig.phase
		const nextPhase = this.getNextPhase(currentPhase)

		if (!nextPhase) {
			this.outputChannel.appendLine("[StartupIndexing] Rollout: Already at final phase")
			return false
		}

		// Check if conditions are met for advancement
		if (!this.canAdvanceToNextPhase()) {
			this.outputChannel.appendLine("[StartupIndexing] Rollout: Conditions not met for advancement")
			return false
		}

		// Update configuration
		this.currentConfig = ROLLOUT_CONFIGS[nextPhase]
		this.featureFlags = this.generateFeatureFlags()

		// Save new configuration
		await this.saveRolloutConfig()

		this.outputChannel.appendLine(`[StartupIndexing] Rollout: Advanced from ${currentPhase} to ${nextPhase}`)

		// Notify about phase change
		TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_PROGRESS, {
			event: "rollout_phase_advanced",
			fromPhase: currentPhase,
			toPhase: nextPhase,
			metrics: this.rolloutMetrics,
		})

		return true
	}

	/**
	 * Triggers rollback to previous phase if issues are detected
	 */
	public async triggerRollback(reason: string): Promise<void> {
		const currentPhase = this.currentConfig.phase
		const previousPhase = this.getPreviousPhase(currentPhase)

		if (!previousPhase) {
			this.outputChannel.appendLine("[StartupIndexing] Rollout: Cannot rollback from current phase")
			return
		}

		// Update configuration
		this.currentConfig = ROLLOUT_CONFIGS[previousPhase]
		this.featureFlags = this.generateFeatureFlags()

		// Save rollback configuration
		await this.saveRolloutConfig()

		this.outputChannel.appendLine(
			`[StartupIndexing] Rollout: Rolled back from ${currentPhase} to ${previousPhase} - ${reason}`,
		)

		// Show user notification for significant rollbacks
		if (currentPhase === RolloutPhase.FULL_ROLLOUT || currentPhase === RolloutPhase.GRADUAL_ROLLOUT) {
			vscode.window
				.showWarningMessage(
					"Blues Code startup indexing has been temporarily disabled due to performance issues. " +
						"We're working to resolve this and will re-enable the feature soon.",
					"Learn More",
				)
				.then((choice) => {
					if (choice === "Learn More") {
						vscode.env.openExternal(
							vscode.Uri.parse("https://docs.bluescode.com/startup-indexing-rollback"),
						)
					}
				})
		}

		// Log rollback
		TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
			event: "rollout_rollback",
			fromPhase: currentPhase,
			toPhase: previousPhase,
			reason,
			metrics: this.rolloutMetrics,
		})
	}

	/**
	 * Gets current rollout status
	 */
	public getRolloutStatus(): {
		phase: RolloutPhase
		percentage: number
		userGroup: string
		enabled: boolean
		metrics: RolloutMetrics
	} {
		return {
			phase: this.currentConfig.phase,
			percentage: this.currentConfig.percentage,
			userGroup: this.userClassification?.userGroup || "unknown",
			enabled: this.shouldEnableStartupIndexing(),
			metrics: { ...this.rolloutMetrics },
		}
	}

	/**
	 * Starts automatic rollout progression monitoring
	 */
	public startRolloutMonitoring(): void {
		// Check rollout conditions every hour
		this.rolloutTimer = setInterval(
			async () => {
				await this.checkRolloutProgression()
			},
			60 * 60 * 1000,
		)

		this.outputChannel.appendLine("[StartupIndexing] Rollout monitoring started")
	}

	/**
	 * Stops rollout monitoring
	 */
	public stopRolloutMonitoring(): void {
		if (this.rolloutTimer) {
			clearInterval(this.rolloutTimer)
			this.rolloutTimer = null
		}

		this.outputChannel.appendLine("[StartupIndexing] Rollout monitoring stopped")
	}

	/**
	 * Private helper methods
	 */
	private loadRolloutConfig(): RolloutConfig {
		const config = vscode.workspace.getConfiguration("bluesCode.startupIndexing.rollout")
		const phase = config.get("phase", RolloutPhase.DISABLED) as RolloutPhase

		return ROLLOUT_CONFIGS[phase] || ROLLOUT_CONFIGS[RolloutPhase.DISABLED]
	}

	private async saveRolloutConfig(): Promise<void> {
		const config = vscode.workspace.getConfiguration("bluesCode.startupIndexing.rollout")
		await config.update("phase", this.currentConfig.phase, vscode.ConfigurationTarget.Global)
	}

	private generateFeatureFlags(): StartupIndexingFeatureFlags {
		const enabledFeatures = this.currentConfig.enabledFeatures
		const isAllEnabled = enabledFeatures.includes("all")

		return {
			enableStartupIndexing: isAllEnabled || enabledFeatures.includes("startup-indexing"),
			enableProgressUI: isAllEnabled || enabledFeatures.includes("progress-ui"),
			enableErrorRecovery: isAllEnabled || enabledFeatures.includes("error-recovery"),
			enableMonitoring: isAllEnabled || enabledFeatures.includes("monitoring"),
			enableCompatibilityLayer: isAllEnabled || enabledFeatures.includes("compatibility-layer"),
			enableAdvancedAnalysis: isAllEnabled || enabledFeatures.includes("advanced-analysis"),
			enablePerformanceOptimizations: isAllEnabled || enabledFeatures.includes("performance-optimizations"),
			rolloutPhase: this.currentConfig.phase,
			rolloutPercentage: this.currentConfig.percentage,
			targetUserGroups: this.currentConfig.userGroups,
		}
	}

	private classifyUser(): void {
		const machineId = vscode.env.machineId
		const sessionId = vscode.env.sessionId

		// Determine user group based on various factors
		let userGroup = "general"
		let isInternal = false
		let isBetaUser = false

		// Check for internal users (simplified logic)
		if (machineId.startsWith("internal-") || sessionId.includes("dev")) {
			userGroup = "internal"
			isInternal = true
		}

		// Check for beta users
		const betaOptIn = this.context.globalState.get("bluesCode.betaOptIn", false)
		if (betaOptIn) {
			userGroup = "beta"
			isBetaUser = true
		}

		this.userClassification = {
			userId: machineId,
			userGroup,
			isInternal,
			isBetaUser,
			hasOptedIn: betaOptIn,
			installationDate: new Date(this.context.globalState.get("bluesCode.installDate", Date.now())),
			extensionVersion: vscode.extensions.getExtension("bluescode.blues-code")?.packageJSON.version || "unknown",
			vsCodeVersion: vscode.version,
			platform: process.platform,
		}
	}

	private isUserInTargetGroup(): boolean {
		if (!this.userClassification) return false

		const targetGroups = this.currentConfig.userGroups
		return targetGroups.includes("all") || targetGroups.includes(this.userClassification.userGroup)
	}

	private isUserInRolloutPercentage(): boolean {
		if (!this.userClassification) return false

		// Use consistent hash of user ID to determine if user is in percentage
		const hash = this.hashUserId(this.userClassification.userId)
		const userPercentile = hash % 100

		return userPercentile < this.currentConfig.percentage
	}

	private hashUserId(userId: string): number {
		let hash = 0
		for (let i = 0; i < userId.length; i++) {
			const char = userId.charCodeAt(i)
			hash = (hash << 5) - hash + char
			hash = hash & hash // Convert to 32-bit integer
		}
		return Math.abs(hash)
	}

	private initializeMetrics(): RolloutMetrics {
		return {
			phase: this.currentConfig.phase,
			activeUsers: 0,
			enabledUsers: 0,
			errorRate: 0,
			performanceMetrics: {
				averageStartupTime: 0,
				successRate: 100,
				userSatisfaction: 0,
			},
			rollbackTriggers: {
				errorRateExceeded: false,
				performanceDegraded: false,
				userComplaintsHigh: false,
			},
		}
	}

	private checkRollbackTriggers(): void {
		const thresholds = this.currentConfig.rollbackThreshold

		this.rolloutMetrics.rollbackTriggers = {
			errorRateExceeded: this.rolloutMetrics.errorRate > thresholds.errorRate,
			performanceDegraded: this.rolloutMetrics.performanceMetrics.averageStartupTime > 10000, // 10s threshold
			userComplaintsHigh: false, // Would need user feedback system
		}

		// Trigger automatic rollback if conditions are met
		if (Object.values(this.rolloutMetrics.rollbackTriggers).some((trigger) => trigger)) {
			this.triggerRollback("Automatic rollback due to threshold breach")
		}
	}

	private canAdvanceToNextPhase(): boolean {
		// Check if metrics are within acceptable ranges
		const metrics = this.rolloutMetrics
		const thresholds = this.currentConfig.rollbackThreshold

		return (
			metrics.errorRate < thresholds.errorRate / 2 && // Error rate well below threshold
			metrics.performanceMetrics.successRate > 90 && // High success rate
			!Object.values(metrics.rollbackTriggers).some((trigger) => trigger) // No rollback triggers
		)
	}

	private async checkRolloutProgression(): Promise<void> {
		// Check if we should advance to next phase
		if (this.canAdvanceToNextPhase()) {
			await this.advanceRolloutPhase()
		}

		// Check if we should rollback
		this.checkRollbackTriggers()
	}

	private getNextPhase(currentPhase: RolloutPhase): RolloutPhase | null {
		const phases = Object.values(RolloutPhase)
		const currentIndex = phases.indexOf(currentPhase)
		return currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null
	}

	private getPreviousPhase(currentPhase: RolloutPhase): RolloutPhase | null {
		const phases = Object.values(RolloutPhase)
		const currentIndex = phases.indexOf(currentPhase)
		return currentIndex > 0 ? phases[currentIndex - 1] : null
	}

	/**
	 * Cleanup resources
	 */
	public dispose(): void {
		this.stopRolloutMonitoring()
		this.outputChannel.appendLine("[StartupIndexing] Rollout manager disposed")
	}
}

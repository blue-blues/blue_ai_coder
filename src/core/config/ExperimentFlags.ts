/**
 * TRAE-Agent Experiment Flags
 * Controls gradual rollout of Phase 2 intelligence features
 */

export interface ExperimentFlags {
	// Phase 2 Intelligence System
	enablePhase2Intelligence: boolean

	// Individual intelligence components
	enableContextMemory: boolean
	enableErrorRecovery: boolean
	enableStrategyAdapter: boolean
	enableToolSelector: boolean
	enableProblemDetector: boolean

	// Feature-specific flags
	enablePredictiveAnalysis: boolean
	enableRealTimeAdaptation: boolean
	enableCrossTaskLearning: boolean
	enableProactiveInterventions: boolean

	// Rollout control
	rolloutPercentage: number
	targetUsers?: string[]
	excludeUsers?: string[]

	// Safety controls
	enableSafetyMode: boolean
	fallbackToPhase1OnError: boolean
	maxIntelligenceErrors: number

	// Performance monitoring
	enablePerformanceTracking: boolean
	enableDetailedLogging: boolean

	// A/B testing
	enableABTesting: boolean
	testGroup?: "control" | "treatment" | "auto"
}

/**
 * Default experiment flags - Conservative rollout
 */
export const DEFAULT_EXPERIMENT_FLAGS: ExperimentFlags = {
	// Start with Phase 2 disabled by default
	enablePhase2Intelligence: false,

	// Individual components (can be enabled independently)
	enableContextMemory: false,
	enableErrorRecovery: false,
	enableStrategyAdapter: false,
	enableToolSelector: false,
	enableProblemDetector: false,

	// Advanced features disabled initially
	enablePredictiveAnalysis: false,
	enableRealTimeAdaptation: false,
	enableCrossTaskLearning: false,
	enableProactiveInterventions: false,

	// Conservative rollout
	rolloutPercentage: 0,

	// Safety first
	enableSafetyMode: true,
	fallbackToPhase1OnError: true,
	maxIntelligenceErrors: 3,

	// Monitoring enabled
	enablePerformanceTracking: true,
	enableDetailedLogging: false,

	// A/B testing disabled initially
	enableABTesting: false,
}

/**
 * Development experiment flags - All features enabled for testing
 */
export const DEVELOPMENT_EXPERIMENT_FLAGS: ExperimentFlags = {
	enablePhase2Intelligence: true,

	enableContextMemory: true,
	enableErrorRecovery: true,
	enableStrategyAdapter: true,
	enableToolSelector: true,
	enableProblemDetector: true,

	enablePredictiveAnalysis: true,
	enableRealTimeAdaptation: true,
	enableCrossTaskLearning: true,
	enableProactiveInterventions: true,

	rolloutPercentage: 100,

	enableSafetyMode: false,
	fallbackToPhase1OnError: false,
	maxIntelligenceErrors: 10,

	enablePerformanceTracking: true,
	enableDetailedLogging: true,

	enableABTesting: false,
}

/**
 * Beta experiment flags - Gradual rollout with safety
 */
export const BETA_EXPERIMENT_FLAGS: ExperimentFlags = {
	enablePhase2Intelligence: true,

	// Enable core components first
	enableContextMemory: true,
	enableErrorRecovery: true,
	enableStrategyAdapter: false, // Keep disabled for stability
	enableToolSelector: true,
	enableProblemDetector: true,

	// Enable some advanced features
	enablePredictiveAnalysis: true,
	enableRealTimeAdaptation: false,
	enableCrossTaskLearning: true,
	enableProactiveInterventions: true,

	rolloutPercentage: 25, // 25% rollout

	enableSafetyMode: true,
	fallbackToPhase1OnError: true,
	maxIntelligenceErrors: 5,

	enablePerformanceTracking: true,
	enableDetailedLogging: true,

	enableABTesting: true,
	testGroup: "auto",
}

/**
 * Production experiment flags - Stable rollout
 */
export const PRODUCTION_EXPERIMENT_FLAGS: ExperimentFlags = {
	enablePhase2Intelligence: true,

	// Only most stable components
	enableContextMemory: true,
	enableErrorRecovery: true,
	enableStrategyAdapter: false,
	enableToolSelector: true,
	enableProblemDetector: false, // Disable for production stability

	enablePredictiveAnalysis: false,
	enableRealTimeAdaptation: false,
	enableCrossTaskLearning: true,
	enableProactiveInterventions: false,

	rolloutPercentage: 10, // Conservative 10%

	enableSafetyMode: true,
	fallbackToPhase1OnError: true,
	maxIntelligenceErrors: 2,

	enablePerformanceTracking: true,
	enableDetailedLogging: false,

	enableABTesting: true,
	testGroup: "auto",
}

export class ExperimentManager {
	private flags: ExperimentFlags
	private userId?: string
	private errorCount: number = 0

	constructor(flags: ExperimentFlags = DEFAULT_EXPERIMENT_FLAGS, userId?: string) {
		this.flags = { ...flags }
		this.userId = userId
	}

	/**
	 * Check if a feature is enabled for the current user
	 */
	public isFeatureEnabled(feature: keyof ExperimentFlags): boolean {
		// Check if user is explicitly excluded
		if (this.flags.excludeUsers && this.userId && this.flags.excludeUsers.includes(this.userId)) {
			return false
		}

		// Check if user is in target list (overrides rollout percentage)
		if (this.flags.targetUsers && this.userId && this.flags.targetUsers.includes(this.userId)) {
			return Boolean(this.flags[feature])
		}

		// Check rollout percentage
		if (this.userId && !this.isInRollout()) {
			return false
		}

		// Check error threshold
		if (this.errorCount >= this.flags.maxIntelligenceErrors && this.flags.fallbackToPhase1OnError) {
			return false
		}

		return Boolean(this.flags[feature])
	}

	/**
	 * Check if Phase 2 intelligence should be enabled
	 */
	public shouldEnableIntelligence(): boolean {
		return this.isFeatureEnabled("enablePhase2Intelligence")
	}

	/**
	 * Get intelligence configuration based on experiment flags
	 */
	public getIntelligenceConfig(): {
		enableContextMemory: boolean
		enableErrorRecovery: boolean
		enableStrategyAdapter: boolean
		enableToolSelector: boolean
		enableProblemDetector: boolean
	} {
		return {
			enableContextMemory: this.isFeatureEnabled("enableContextMemory"),
			enableErrorRecovery: this.isFeatureEnabled("enableErrorRecovery"),
			enableStrategyAdapter: this.isFeatureEnabled("enableStrategyAdapter"),
			enableToolSelector: this.isFeatureEnabled("enableToolSelector"),
			enableProblemDetector: this.isFeatureEnabled("enableProblemDetector"),
		}
	}

	/**
	 * Record an intelligence error
	 */
	public recordError(): void {
		this.errorCount++

		if (this.flags.enableDetailedLogging) {
			console.warn(`TRAE-Agent Intelligence Error ${this.errorCount}/${this.flags.maxIntelligenceErrors}`)
		}
	}

	/**
	 * Reset error count
	 */
	public resetErrorCount(): void {
		this.errorCount = 0
	}

	/**
	 * Update experiment flags
	 */
	public updateFlags(newFlags: Partial<ExperimentFlags>): void {
		this.flags = { ...this.flags, ...newFlags }
	}

	/**
	 * Get current flags
	 */
	public getFlags(): ExperimentFlags {
		return { ...this.flags }
	}

	/**
	 * Check if user is in rollout percentage
	 */
	private isInRollout(): boolean {
		if (!this.userId) {
			return Math.random() * 100 < this.flags.rolloutPercentage
		}

		// Use user ID hash for consistent rollout
		const hash = this.hashUserId(this.userId)
		return hash < this.flags.rolloutPercentage
	}

	/**
	 * Hash user ID to percentage (0-99)
	 */
	private hashUserId(userId: string): number {
		let hash = 0
		for (let i = 0; i < userId.length; i++) {
			const char = userId.charCodeAt(i)
			hash = (hash << 5) - hash + char
			hash = hash & hash // Convert to 32bit integer
		}
		return Math.abs(hash) % 100
	}

	/**
	 * Get A/B test group
	 */
	public getTestGroup(): "control" | "treatment" {
		if (!this.flags.enableABTesting) {
			return "control"
		}

		if (this.flags.testGroup === "control" || this.flags.testGroup === "treatment") {
			return this.flags.testGroup
		}

		// Auto assignment based on user ID
		if (this.userId) {
			return this.hashUserId(this.userId) < 50 ? "control" : "treatment"
		}

		return Math.random() < 0.5 ? "control" : "treatment"
	}

	/**
	 * Check if should use Phase 2 features based on A/B test
	 */
	public shouldUsePhase2ForABTest(): boolean {
		if (!this.flags.enableABTesting) {
			return this.shouldEnableIntelligence()
		}

		return this.getTestGroup() === "treatment" && this.shouldEnableIntelligence()
	}

	/**
	 * Clean up resources - required by Task.ts
	 */
	public dispose(): void {
		// Clean up any resources if needed
		// This method is called by Task.ts during disposal
	}
}

/**
 * Global experiment manager instance
 */
let globalExperimentManager: ExperimentManager | undefined

/**
 * Initialize global experiment manager
 */
export function initializeExperiments(flags: ExperimentFlags, userId?: string): ExperimentManager {
	globalExperimentManager = new ExperimentManager(flags, userId)
	return globalExperimentManager
}

/**
 * Get global experiment manager
 */
export function getExperimentManager(): ExperimentManager {
	if (!globalExperimentManager) {
		globalExperimentManager = new ExperimentManager()
	}
	return globalExperimentManager
}

/**
 * Environment-based flag selection
 */
export function getEnvironmentFlags(): ExperimentFlags {
	const env = process.env.NODE_ENV || "development"

	switch (env) {
		case "production":
			return PRODUCTION_EXPERIMENT_FLAGS
		case "staging":
		case "beta":
			return BETA_EXPERIMENT_FLAGS
		case "development":
		case "test":
			return DEVELOPMENT_EXPERIMENT_FLAGS
		default:
			return DEFAULT_EXPERIMENT_FLAGS
	}
}

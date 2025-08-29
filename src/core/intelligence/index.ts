/**
 * TRAE-Agent Phase 2: Intelligence System
 *
 * This module provides the main intelligence system that coordinates
 * various AI capabilities including context memory, error recovery,
 * strategy adaptation, tool selection, and problem detection.
 *
 * The intelligence system works alongside the reflection engine to provide
 * enhanced accuracy and adaptive behavior for complex task execution.
 */

// Export all types
export * from "./types"

// Export core intelligence components
export { ContextMemory } from "./ContextMemory"
export { ErrorRecovery } from "./ErrorRecovery"
export { StrategyAdapter } from "./StrategyAdapter"
export { ToolSelector } from "./ToolSelector"
export { ProblemDetector } from "./ProblemDetector"
export { SequentialThinking } from "./SequentialThinking"
export { ToolRepetitionDetector } from "./ToolRepetitionDetector"
export { SelfAssessment } from "./SelfAssessment"

// Import components for factory functions
import { ContextMemory } from "./ContextMemory"
import { ErrorRecovery } from "./ErrorRecovery"
import { StrategyAdapter } from "./StrategyAdapter"
import { ToolSelector } from "./ToolSelector"
import { ProblemDetector } from "./ProblemDetector"
import { SequentialThinking } from "./SequentialThinking"
import { ToolRepetitionDetector } from "./ToolRepetitionDetector"
import { SelfAssessment } from "./SelfAssessment"

import type {
	IntelligenceConfig,
	ContextMemoryConfig,
	ErrorRecoveryConfig,
	IntelligenceContext,
	IntelligenceResult,
	IntelligenceMetrics,
} from "./types"

/**
 * Main Intelligence System interface
 */
export interface IntelligenceSystem {
	contextMemory?: ContextMemory
	errorRecovery?: ErrorRecovery
	strategyAdapter?: StrategyAdapter
	toolSelector?: ToolSelector
	problemDetector?: ProblemDetector
	sequentialThinking?: SequentialThinking
	toolRepetitionDetector?: ToolRepetitionDetector
	selfAssessment?: SelfAssessment

	// Core methods
	analyze(context: IntelligenceContext): Promise<IntelligenceResult>
	getMetrics(): Promise<IntelligenceMetrics>
	dispose(): void
}

/**
 * Default Intelligence System Configuration
 */
export const DEFAULT_INTELLIGENCE_CONFIG: IntelligenceConfig = {
	contextMemory: {
		maxEntries: 1000,
		similarityThreshold: 0.7,
		relevanceDecayRate: 0.1,
		patternExtractionEnabled: true,
		crossTaskLearning: true,
		memoryPersistence: true,
	},
	errorRecovery: {
		enablePredictiveRecovery: true,
		maxRetryAttempts: 3,
		recoveryTimeout: 300000,
		adaptiveStrategies: true,
		learningEnabled: true,
		fallbackEnabled: true,
	},
	strategyAdaptation: {
		enableRealTimeAdaptation: true,
		performanceThreshold: 0.6,
		adaptationInterval: 60000,
	},
	toolSelection: {
		enableMLRecommendations: true,
		learningRate: 0.1,
		contextWeighting: 0.8,
	},
	problemDetection: {
		enablePredictiveAnalysis: true,
		detectionSensitivity: 0.7,
		interventionThreshold: 0.8,
	},
	sequentialThinking: {
		maxThoughts: 25,
		minThoughts: 5,
		confidenceThreshold: 0.8,
		enableBranching: true,
		enableRevisions: true,
		thoughtTimeout: 300000,
		performanceTracking: true,
		learningEnabled: true,
	},
	toolRepetition: {
		maxHistorySize: 100,
		consecutiveThreshold: 3,
		cyclicWindowSize: 10,
		semanticSimilarityThreshold: 0.8,
		interventionThreshold: 0.7,
		learningEnabled: true,
		contextAwareAnalysis: true,
		performanceTracking: true,
		patternMemoryDuration: 24 * 60 * 60 * 1000,
	},
	selfAssessment: {
		assessmentFrequency: 300000,
		historicalDataRetention: 30 * 24 * 60 * 60 * 1000,
		trendAnalysisWindow: 7 * 24 * 60 * 60 * 1000,
		confidenceThreshold: 0.7,
		recommendationLimit: 10,
		enablePredictiveAnalysis: true,
		enableLearningAdaptation: true,
		performanceTracking: true,
		detailedLogging: true,
		integrationEnabled: true,
	},
}

/**
 * Conservative Intelligence System Configuration (for production)
 */
export const CONSERVATIVE_INTELLIGENCE_CONFIG: IntelligenceConfig = {
	contextMemory: {
		maxEntries: 500,
		similarityThreshold: 0.8,
		relevanceDecayRate: 0.2,
		patternExtractionEnabled: true,
		crossTaskLearning: false,
		memoryPersistence: false,
	},
	errorRecovery: {
		enablePredictiveRecovery: false,
		maxRetryAttempts: 2,
		recoveryTimeout: 120000,
		adaptiveStrategies: false,
		learningEnabled: false,
		fallbackEnabled: true,
	},
	strategyAdaptation: {
		enableRealTimeAdaptation: false,
		performanceThreshold: 0.8,
		adaptationInterval: 300000,
	},
	toolSelection: {
		enableMLRecommendations: false,
		learningRate: 0.05,
		contextWeighting: 0.5,
	},
	problemDetection: {
		enablePredictiveAnalysis: false,
		detectionSensitivity: 0.9,
		interventionThreshold: 0.9,
	},
	sequentialThinking: {
		maxThoughts: 15,
		minThoughts: 5,
		confidenceThreshold: 0.9,
		enableBranching: false,
		enableRevisions: false,
		thoughtTimeout: 120000,
		performanceTracking: false,
		learningEnabled: false,
	},
	toolRepetition: {
		maxHistorySize: 50,
		consecutiveThreshold: 5,
		cyclicWindowSize: 8,
		semanticSimilarityThreshold: 0.9,
		interventionThreshold: 0.8,
		learningEnabled: false,
		contextAwareAnalysis: false,
		performanceTracking: false,
		patternMemoryDuration: 12 * 60 * 60 * 1000,
	},
	selfAssessment: {
		assessmentFrequency: 600000,
		historicalDataRetention: 7 * 24 * 60 * 60 * 1000,
		trendAnalysisWindow: 3 * 24 * 60 * 60 * 1000,
		confidenceThreshold: 0.8,
		recommendationLimit: 5,
		enablePredictiveAnalysis: false,
		enableLearningAdaptation: false,
		performanceTracking: false,
		detailedLogging: false,
		integrationEnabled: false,
	},
}

/**
 * Experimental Intelligence System Configuration (for development)
 */
export const EXPERIMENTAL_INTELLIGENCE_CONFIG: IntelligenceConfig = {
	contextMemory: {
		maxEntries: 2000,
		similarityThreshold: 0.6,
		relevanceDecayRate: 0.05,
		patternExtractionEnabled: true,
		crossTaskLearning: true,
		memoryPersistence: true,
	},
	errorRecovery: {
		enablePredictiveRecovery: true,
		maxRetryAttempts: 5,
		recoveryTimeout: 600000,
		adaptiveStrategies: true,
		learningEnabled: true,
		fallbackEnabled: true,
	},
	strategyAdaptation: {
		enableRealTimeAdaptation: true,
		performanceThreshold: 0.4,
		adaptationInterval: 30000,
	},
	toolSelection: {
		enableMLRecommendations: true,
		learningRate: 0.2,
		contextWeighting: 0.9,
	},
	problemDetection: {
		enablePredictiveAnalysis: true,
		detectionSensitivity: 0.5,
		interventionThreshold: 0.6,
	},
	sequentialThinking: {
		maxThoughts: 30,
		minThoughts: 3,
		confidenceThreshold: 0.6,
		enableBranching: true,
		enableRevisions: true,
		thoughtTimeout: 600000,
		performanceTracking: true,
		learningEnabled: true,
	},
	toolRepetition: {
		maxHistorySize: 200,
		consecutiveThreshold: 2,
		cyclicWindowSize: 15,
		semanticSimilarityThreshold: 0.7,
		interventionThreshold: 0.6,
		learningEnabled: true,
		contextAwareAnalysis: true,
		performanceTracking: true,
		patternMemoryDuration: 48 * 60 * 60 * 1000,
	},
	selfAssessment: {
		assessmentFrequency: 180000,
		historicalDataRetention: 60 * 24 * 60 * 60 * 1000,
		trendAnalysisWindow: 14 * 24 * 60 * 60 * 1000,
		confidenceThreshold: 0.6,
		recommendationLimit: 15,
		enablePredictiveAnalysis: true,
		enableLearningAdaptation: true,
		performanceTracking: true,
		detailedLogging: true,
		integrationEnabled: true,
	},
}

/**
 * Intelligence System Implementation
 */
class IntelligenceSystemImpl implements IntelligenceSystem {
	public contextMemory?: ContextMemory
	public errorRecovery?: ErrorRecovery
	public strategyAdapter?: StrategyAdapter
	public toolSelector?: ToolSelector
	public problemDetector?: ProblemDetector
	public sequentialThinking?: SequentialThinking
	public toolRepetitionDetector?: ToolRepetitionDetector
	public selfAssessment?: SelfAssessment

	private config: IntelligenceConfig

	constructor(config: IntelligenceConfig) {
		this.config = config
		this.initializeComponents()
	}

	private initializeComponents(): void {
		// Initialize components based on configuration
		this.contextMemory = new ContextMemory(this.config.contextMemory)
		this.errorRecovery = new ErrorRecovery(this.config.errorRecovery)
		this.strategyAdapter = new StrategyAdapter(this.config.strategyAdaptation)
		this.toolSelector = new ToolSelector(this.config.toolSelection)
		this.problemDetector = new ProblemDetector(this.config.problemDetection)

		// Initialize TRAE components
		this.sequentialThinking = new SequentialThinking(this.config.sequentialThinking)
		this.toolRepetitionDetector = new ToolRepetitionDetector(this.config.toolRepetition)
		this.selfAssessment = new SelfAssessment(this.config.selfAssessment)
	}

	public async analyze(context: IntelligenceContext): Promise<IntelligenceResult> {
		const result: IntelligenceResult = {
			contextInsights: [],
			errorRecovery: [],
			strategyRecommendations: [],
			toolRecommendations: [],
			problemPredictions: [],
			interventions: [],
			confidence: 0.0,
			reasoning: [],
			metadata: {},
		}

		// Analyze context with each component
		if (this.contextMemory) {
			const relevantContext = await this.contextMemory.retrieveRelevantContext(context)
			result.contextInsights = relevantContext.map((ctx) => `Similar situation: ${ctx.situation}`)
		}

		if (this.errorRecovery && context.recentErrors && context.recentErrors.length > 0) {
			const predictions = await this.errorRecovery.predictPotentialErrors(context)
			result.errorRecovery = predictions.map((pred) => ({
				id: `recovery_${Date.now()}`,
				name: `Prevent ${pred.errorType}`,
				description: `Recovery strategy for ${pred.errorType}`,
				steps: pred.preventionSteps,
				successRate: 1 - pred.probability,
				averageRecoveryTime: 30000,
				applicableContexts: [pred.errorType],
				prerequisites: [],
			}))
		}

		if (this.strategyAdapter) {
			const adaptations = await this.strategyAdapter.analyzeAndRecommend("current", context)
			result.strategyRecommendations = adaptations
		}

		// DEBUG: Log missing constraints issue
		console.log("[DEBUG] Creating ToolSelectionContext without constraints property - this will cause TS2345 error")
		console.log("[DEBUG] Context object structure:", {
			hasTaskType: true,
			hasCurrentContext: true,
			hasAvailableTools: true,
			hasPreviousAttempts: true,
			hasConstraints: false, // <-- This is the issue!
		})
		if (this.toolSelector) {
			const recommendations = await this.toolSelector.getToolRecommendations({
				taskType: "general",
				currentContext: JSON.stringify(context),
				availableTools: context.recentTools?.map((t) => t.name || "unknown") || [],
				previousAttempts: context.recentTools || [],
				constraints: {}, // Fix: Add missing required constraints property
			})
			result.toolRecommendations = recommendations
		}

		if (this.problemDetector) {
			const predictions = await this.problemDetector.analyzePotentialProblems(context)
			result.problemPredictions = predictions
		}

		// Calculate overall confidence
		const componentCount = [
			this.contextMemory,
			this.errorRecovery,
			this.strategyAdapter,
			this.toolSelector,
			this.problemDetector,
			this.sequentialThinking,
			this.toolRepetitionDetector,
			this.selfAssessment,
		].filter((c) => c !== undefined).length
		result.confidence = componentCount > 0 ? 0.8 : 0.0

		result.reasoning = [
			`Analyzed context with ${componentCount} intelligence components`,
			`Generated ${result.contextInsights.length} context insights`,
			`Provided ${result.toolRecommendations.length} tool recommendations`,
			`Identified ${result.problemPredictions.length} potential problems`,
		]

		return result
	}

	public async getMetrics(): Promise<IntelligenceMetrics> {
		const metrics: IntelligenceMetrics = {
			contextMemoryHitRate: 0,
			errorRecoverySuccessRate: 0,
			strategyAdaptationEffectiveness: 0,
			toolRecommendationAccuracy: 0,
			problemPredictionAccuracy: 0,
			overallIntelligenceScore: 0,
			learningVelocity: 0,
			adaptationSpeed: 0,
			lastUpdated: Date.now(),
		}

		// Gather metrics from each component
		if (this.contextMemory) {
			const memoryStats = this.contextMemory.getMemoryStats()
			metrics.contextMemoryHitRate = memoryStats.averageRelevance
		}

		if (this.errorRecovery) {
			const recoveryStats = this.errorRecovery.getRecoveryStats()
			metrics.errorRecoverySuccessRate =
				recoveryStats.successfulRecoveries / Math.max(recoveryStats.totalErrors, 1)
		}

		if (this.strategyAdapter) {
			const adaptationStats = this.strategyAdapter.getAdaptationStats()
			metrics.strategyAdaptationEffectiveness =
				adaptationStats.successfulAdaptations / Math.max(adaptationStats.totalAdaptations, 1)
		}

		if (this.toolSelector) {
			const selectionStats = this.toolSelector.getToolStats()
			metrics.toolRecommendationAccuracy = selectionStats.averageSuccessRate
		}

		if (this.problemDetector) {
			const detectionStats = this.problemDetector.getProblemStats()
			metrics.problemPredictionAccuracy =
				detectionStats.accuratePreventions / Math.max(detectionStats.totalPredictions, 1)
		}

		// Include TRAE component metrics
		if (this.sequentialThinking) {
			const thinkingStats = this.sequentialThinking.getPerformanceStats()
			metrics.learningVelocity = thinkingStats.averageConfidence
			metrics.adaptationSpeed = thinkingStats.successRate
		}

		if (this.toolRepetitionDetector) {
			const repetitionStats = this.toolRepetitionDetector.getDetectionStats()
			// Incorporate repetition detection effectiveness into tool recommendation accuracy
			if (repetitionStats.totalDetections > 0) {
				const detectionEffectiveness =
					(repetitionStats.totalDetections - repetitionStats.falsePositives) / repetitionStats.totalDetections
				metrics.toolRecommendationAccuracy = Math.max(
					metrics.toolRecommendationAccuracy,
					detectionEffectiveness,
				)
			}
		}

		if (this.selfAssessment) {
			const assessmentStats = this.selfAssessment.getAssessmentStats()
			metrics.overallIntelligenceScore = Math.max(
				metrics.overallIntelligenceScore,
				assessmentStats.overallGrowth + 0.5,
			)
			metrics.learningVelocity = Math.max(metrics.learningVelocity, assessmentStats.averageConfidence)
		}

		// Calculate overall intelligence score
		const scores = [
			metrics.contextMemoryHitRate,
			metrics.errorRecoverySuccessRate,
			metrics.strategyAdaptationEffectiveness,
			metrics.toolRecommendationAccuracy,
			metrics.problemPredictionAccuracy,
		].filter((score) => !isNaN(score) && score > 0)

		metrics.overallIntelligenceScore =
			scores.length > 0
				? scores.reduce((sum, score) => sum + score, 0) / scores.length
				: metrics.overallIntelligenceScore || 0

		// Use TRAE component data if available, otherwise fallback to placeholders
		if (!metrics.learningVelocity) {
			metrics.learningVelocity = 0.7 // Placeholder - would be calculated from learning events
		}
		if (!metrics.adaptationSpeed) {
			metrics.adaptationSpeed = 0.8 // Placeholder - would be calculated from adaptation time
		}

		return metrics
	}

	public dispose(): void {
		this.contextMemory?.dispose()
		this.errorRecovery?.dispose()
		this.strategyAdapter?.dispose()
		this.toolSelector?.dispose()
		this.problemDetector?.dispose()
		this.sequentialThinking?.dispose()
		this.toolRepetitionDetector?.dispose()
		this.selfAssessment?.dispose()
	}
}

/**
 * Factory function to create a new Intelligence System instance
 */
export function createIntelligenceSystem(config: Partial<IntelligenceConfig> = {}): IntelligenceSystem {
	const fullConfig: IntelligenceConfig = {
		...DEFAULT_INTELLIGENCE_CONFIG,
		...config,
		// Deep merge nested objects
		contextMemory: { ...DEFAULT_INTELLIGENCE_CONFIG.contextMemory, ...config.contextMemory },
		errorRecovery: { ...DEFAULT_INTELLIGENCE_CONFIG.errorRecovery, ...config.errorRecovery },
		strategyAdaptation: { ...DEFAULT_INTELLIGENCE_CONFIG.strategyAdaptation, ...config.strategyAdaptation },
		toolSelection: { ...DEFAULT_INTELLIGENCE_CONFIG.toolSelection, ...config.toolSelection },
		problemDetection: { ...DEFAULT_INTELLIGENCE_CONFIG.problemDetection, ...config.problemDetection },
		sequentialThinking: { ...DEFAULT_INTELLIGENCE_CONFIG.sequentialThinking, ...config.sequentialThinking },
		toolRepetition: { ...DEFAULT_INTELLIGENCE_CONFIG.toolRepetition, ...config.toolRepetition },
		selfAssessment: { ...DEFAULT_INTELLIGENCE_CONFIG.selfAssessment, ...config.selfAssessment },
	}

	return new IntelligenceSystemImpl(fullConfig)
}

/**
 * Utility function to create intelligence system with preset configurations
 */
export function createPresetIntelligenceSystem(
	preset: "default" | "conservative" | "experimental" = "default",
): IntelligenceSystem {
	switch (preset) {
		case "conservative":
			return createIntelligenceSystem(CONSERVATIVE_INTELLIGENCE_CONFIG)
		case "experimental":
			return createIntelligenceSystem(EXPERIMENTAL_INTELLIGENCE_CONFIG)
		case "default":
		default:
			return createIntelligenceSystem(DEFAULT_INTELLIGENCE_CONFIG)
	}
}

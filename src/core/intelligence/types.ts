/**
 * Advanced TRAE-Agent Intelligence Types
 * Phase 2: Enhanced accuracy improvements beyond basic reflection
 */

import { ToolUse } from "../../shared/tools"
import type { UnifiedToolUse } from "../shared/types/unified-types"
import { ReflectionContext, PerformanceMetrics } from "../reflection/types"

// ===== Context Memory Types =====

/**
 * Represents a learning pattern extracted from past experiences
 */
export interface LearningPattern {
	id: string
	patternType: "success" | "failure" | "optimization"
	context: string
	triggers: string[]
	actions: string[]
	outcomes: string[]
	confidence: number
	frequency: number
	lastUsed: number
	effectiveness: number
	metadata: Record<string, unknown>
}

/**
 * Context memory entry for cross-task learning
 */
export interface ContextMemoryEntry {
	id: string
	taskId: string
	timestamp: number
	context: string
	situation: string
	decision: string
	outcome: "success" | "failure" | "partial"
	learnings: string[]
	patterns: LearningPattern[]
	similarity: number
	relevance: number
}

/**
 * Configuration for context memory system
 */
export interface ContextMemoryConfig {
	maxEntries: number
	similarityThreshold: number
	relevanceDecayRate: number
	patternExtractionEnabled: boolean
	crossTaskLearning: boolean
	memoryPersistence: boolean
}

// ===== Error Recovery Types =====

/**
 * Error classification and recovery strategy
 */
export interface ErrorPattern {
	id: string
	errorType: string
	errorMessage: string
	context: string
	frequency: number
	lastOccurred: number
	recoveryStrategies: RecoveryStrategy[]
	preventionMethods: string[]
	severity: "low" | "medium" | "high" | "critical"
}

/**
 * Recovery strategy with success tracking
 */
export interface RecoveryStrategy {
	id: string
	name: string
	description: string
	steps: string[]
	successRate: number
	averageRecoveryTime: number
	applicableContexts: string[]
	prerequisites: string[]
	fallbackStrategy?: string
}

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
	enablePredictiveRecovery: boolean
	maxRetryAttempts: number
	recoveryTimeout: number
	adaptiveStrategies: boolean
	learningEnabled: boolean
	fallbackEnabled: boolean
}

// ===== Strategy Adaptation Types =====

/**
 * Performance-based strategy evaluation
 */
export interface StrategyPerformance {
	strategyId: string
	context: string
	successRate: number
	averageTime: number
	resourceUsage: number
	userSatisfaction: number
	adaptabilityScore: number
	lastUpdated: number
}

/**
 * Dynamic strategy adaptation context
 */
export interface AdaptationContext {
	currentStrategy: string
	performanceMetrics: PerformanceMetrics
	contextFactors: Record<string, unknown>
	constraints: string[]
	goals: string[]
	timeConstraints?: number
	resourceConstraints?: Record<string, number>
}

/**
 * Strategy recommendation with reasoning
 */
export interface StrategyRecommendation {
	strategyId: string
	name: string
	description: string
	confidence: number
	reasoning: string[]
	expectedOutcome: string
	estimatedTime: number
	riskLevel: "low" | "medium" | "high"
	alternatives: string[]
}

// ===== Tool Selection Types =====

/**
 * Tool performance analytics
 */
export interface ToolPerformance {
	toolName: string
	context: string
	successRate: number
	averageExecutionTime: number
	errorRate: number
	userFeedbackScore: number
	contextRelevance: number
	lastUsed: number
	usageCount: number
}

/**
 * Tool recommendation with ML-based scoring
 */
export interface ToolRecommendation {
	toolName: string
	confidence: number
	reasoning: string[]
	expectedSuccess: number
	estimatedTime: number
	alternatives: ToolAlternative[]
	contextMatch: number
	learningBased: boolean
}

/**
 * Alternative tool option
 */
export interface ToolAlternative {
	toolName: string
	confidence: number
	tradeoffs: string[]
	advantages: string[]
	disadvantages: string[]
}

/**
 * Tool selection context
 */
export interface ToolSelectionContext {
	taskType: string
	currentContext: string
	availableTools: string[]
	constraints: Record<string, unknown>
	previousAttempts: UnifiedToolUse[]
	timeConstraints?: number
	qualityRequirements?: string[]
}

// ===== Problem Detection Types =====

/**
 * Predictive problem indicator
 */
export interface ProblemIndicator {
	id: string
	type: "performance" | "error" | "resource" | "user" | "context"
	severity: "low" | "medium" | "high" | "critical"
	confidence: number
	description: string
	triggers: string[]
	predictions: string[]
	preventiveMeasures: string[]
	detectedAt: number
}

/**
 * Problem prediction with intervention suggestions
 */
export interface ProblemPrediction {
	problemType: string
	probability: number
	timeToOccurrence: number
	impact: "low" | "medium" | "high" | "severe"
	indicators: ProblemIndicator[]
	interventions: InterventionSuggestion[]
	confidence: number
	reasoning: string[]
}

/**
 * Proactive intervention suggestion
 */
export interface InterventionSuggestion {
	id: string
	type: "preventive" | "corrective" | "adaptive"
	description: string
	priority: number
	effort: "low" | "medium" | "high"
	effectiveness: number
	steps: string[]
	timing: "immediate" | "soon" | "planned"
}

// ===== Intelligence Engine Integration Types =====

/**
 * Enhanced intelligence context extending basic reflection
 */
export interface IntelligenceContext extends ReflectionContext {
	memoryEntries: ContextMemoryEntry[]
	errorHistory: ErrorPattern[]
	strategyPerformance: StrategyPerformance[]
	toolAnalytics: ToolPerformance[]
	problemIndicators: ProblemIndicator[]
	adaptationNeeds: string[]
	learningOpportunities: string[]
}

/**
 * Comprehensive intelligence result
 */
export interface IntelligenceResult {
	contextInsights: string[]
	errorRecovery: RecoveryStrategy[]
	strategyRecommendations: StrategyRecommendation[]
	toolRecommendations: ToolRecommendation[]
	problemPredictions: ProblemPrediction[]
	interventions: InterventionSuggestion[]
	confidence: number
	reasoning: string[]
	metadata: Record<string, unknown>
}

/**
 * Intelligence engine configuration
 */
export interface IntelligenceConfig {
	contextMemory: ContextMemoryConfig
	errorRecovery: ErrorRecoveryConfig
	strategyAdaptation: {
		enableRealTimeAdaptation: boolean
		performanceThreshold: number
		adaptationInterval: number
	}
	toolSelection: {
		enableMLRecommendations: boolean
		learningRate: number
		contextWeighting: number
	}
	problemDetection: {
		enablePredictiveAnalysis: boolean
		detectionSensitivity: number
		interventionThreshold: number
	}
	sequentialThinking: {
		maxThoughts: number
		minThoughts: number
		confidenceThreshold: number
		enableBranching: boolean
		enableRevisions: boolean
		thoughtTimeout: number
		performanceTracking: boolean
		learningEnabled: boolean
	}
	toolRepetition: {
		maxHistorySize: number
		consecutiveThreshold: number
		cyclicWindowSize: number
		semanticSimilarityThreshold: number
		interventionThreshold: number
		learningEnabled: boolean
		contextAwareAnalysis: boolean
		performanceTracking: boolean
		patternMemoryDuration: number
	}
	selfAssessment: {
		assessmentFrequency: number
		historicalDataRetention: number
		trendAnalysisWindow: number
		confidenceThreshold: number
		recommendationLimit: number
		enablePredictiveAnalysis: boolean
		enableLearningAdaptation: boolean
		performanceTracking: boolean
		detailedLogging: boolean
		integrationEnabled: boolean
	}
}

/**
 * Learning event for continuous improvement
 */
export interface LearningEvent {
	id: string
	timestamp: number
	source: "context" | "error" | "strategy" | "tool" | "problem" | "sequential_thinking"
	event: string
	data: Record<string, unknown>
	impact: "positive" | "negative" | "neutral"
	confidence: number
	learningValue: number
}

/**
 * Intelligence metrics for monitoring
 */
export interface IntelligenceMetrics {
	contextMemoryHitRate: number
	errorRecoverySuccessRate: number
	strategyAdaptationEffectiveness: number
	toolRecommendationAccuracy: number
	problemPredictionAccuracy: number
	overallIntelligenceScore: number
	learningVelocity: number
	adaptationSpeed: number
	lastUpdated: number
}

/**
 * Type definitions for the TRAE-Agent enhanced reflection system
 * Provides interfaces for self-assessment, sequential thinking, and performance evaluation
 */

import { ToolUse } from "../../shared/tools"
import type { UnifiedToolUse } from "../shared/types/unified-types"

/**
 * Represents a pattern of repetitive behavior detected in tool usage
 */
export interface RepetitionPattern {
	toolName: string
	consecutiveUses: number
	lastUsedAt: number
	semanticSimilarity: number
	contextHash: string
	parameters: Record<string, unknown>[]
}

/**
 * Multi-dimensional analysis result for repetition detection
 */
export interface RepetitionAnalysis {
	isRepetitive: boolean
	confidence: number
	patterns: RepetitionPattern[]
	contextualFactors: {
		timeSpan: number
		parameterVariation: number
		semanticDrift: number
	}
	recommendation: "allow" | "warn" | "block"
	reasoning: string
}

/**
 * Sequential thinking step in the reasoning process
 */
export interface ThinkingStep {
	id: string
	timestamp: number
	type: "observation" | "analysis" | "hypothesis" | "decision" | "reflection"
	content: string
	confidence: number
	dependencies: string[]
	metadata: Record<string, unknown>
}

/**
 * Structured reasoning chain for complex decision making
 */
export interface ReasoningChain {
	id: string
	startTime: number
	endTime?: number
	context: string
	steps: ThinkingStep[]
	conclusion?: string
	confidence: number
	alternatives: string[]
}

/**
 * Performance metrics for self-assessment
 */
export interface PerformanceMetrics {
	taskCompletionRate?: number // Make optional for test compatibility
	averageStepsToCompletion?: number // Make optional for test compatibility
	errorRate?: number // Make optional for test compatibility
	repetitionRate?: number // Make optional for test compatibility
	adaptabilityScore?: number // Make optional for test compatibility
	efficiencyScore?: number // Make optional for test compatibility
	lastCalculatedAt?: number // Make optional for test compatibility
}

/**
 * Self-assessment result with detailed analysis
 */
export interface SelfAssessment {
	id: string
	timestamp: number
	context: string
	metrics: PerformanceMetrics
	strengths: string[]
	weaknesses: string[]
	improvements: string[]
	confidence: number
	nextActions: string[]
}

/**
 * Reflection event for tracking system behavior
 */
export interface ReflectionEvent {
	id: string
	timestamp: number
	type: "tool_use" | "error" | "success" | "pattern_detected" | "assessment_completed"
	data: Record<string, unknown>
	context: string
	impact: "low" | "medium" | "high"
}

/**
 * Configuration for the reflection engine
 */
export interface ReflectionConfig {
	enableSequentialThinking: boolean
	enableSelfAssessment: boolean
	maxReasoningSteps: number
	assessmentInterval: number
	patternDetectionThreshold: number
	semanticSimilarityThreshold: number
	performanceWindowSize: number
	intelligenceConfig?: any // Add missing intelligenceConfig property
}

/**
 * Context information for reflection operations
 */
export interface ReflectionContext {
	taskId: string
	currentStep: number
	totalSteps: number
	recentTools?: UnifiedToolUse[] // Make optional for compatibility
	recentErrors?: string[] // Make optional for compatibility
	performance?: PerformanceMetrics // Make optional for compatibility
	environment?: Record<string, unknown> // Make optional for compatibility
	taskType?: string // Add missing taskType property
	step?: number // Add missing step property for compatibility
}

/**
 * Result of a reflection operation
 */
export interface ReflectionResult {
	success: boolean
	insights: string[]
	recommendations: string[]
	confidence: number
	nextSteps: string[]
	metadata: Record<string, unknown>
}

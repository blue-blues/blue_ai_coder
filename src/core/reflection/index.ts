/**
 * TRAE-Agent Enhanced Reflection Module
 * Exports all reflection system components for integration with BluesCode
 */

// Import classes and types
import { ReflectionEngine } from "./ReflectionEngine"
import { SequentialThinking, SequentialThinkingConfig } from "./SequentialThinking"
import { SelfAssessment } from "./SelfAssessment"
import type { ReflectionConfig } from "./types"

// Core reflection engine
export { ReflectionEngine } from "./ReflectionEngine"

// Sequential thinking capabilities
export { SequentialThinking } from "./SequentialThinking"
export type { SequentialThinkingConfig } from "./SequentialThinking"

// Self-assessment capabilities
export { SelfAssessment } from "./SelfAssessment"

// Type definitions
export type {
	RepetitionPattern,
	RepetitionAnalysis,
	ThinkingStep,
	ReasoningChain,
	PerformanceMetrics,
	SelfAssessment as SelfAssessmentType,
	ReflectionEvent,
	ReflectionConfig,
	ReflectionContext,
	ReflectionResult,
} from "./types"

/**
 * Create a default reflection engine with standard configuration
 */
export function createReflectionEngine(config?: Partial<ReflectionConfig>) {
	return new ReflectionEngine(config)
}

/**
 * Create a sequential thinking module with standard configuration
 */
export function createSequentialThinking(config?: Partial<SequentialThinkingConfig>) {
	const defaultConfig = { maxSteps: 10, confidenceThreshold: 0.6 }
	return new SequentialThinking({ ...defaultConfig, ...config })
}

/**
 * Create a self-assessment module with standard configuration
 */
export function createSelfAssessment(config?: any) {
	return new SelfAssessment(config || { windowSize: 100, assessmentInterval: 300000 })
}

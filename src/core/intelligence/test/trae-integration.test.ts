/**
 * TRAE Agent Integration Test
 *
 * Tests that the three TRAE components (Sequential Thinking, Tool Repetition Detection,
 * and Self-Assessment) are properly integrated with the intelligence system.
 */

import { describe, test, expect, vi } from "vitest"
import { createIntelligenceSystem, createPresetIntelligenceSystem } from "../index"
import type { IntelligenceContext } from "../types"
import type { ReflectionContext } from "../../reflection/types"

describe("TRAE Agent Integration", () => {
	test("should create intelligence system with all TRAE components", () => {
		const system = createIntelligenceSystem()

		// Verify all TRAE components are initialized
		expect(system.sequentialThinking).toBeDefined()
		expect(system.toolRepetitionDetector).toBeDefined()
		expect(system.selfAssessment).toBeDefined()

		// Verify existing components still work
		expect(system.contextMemory).toBeDefined()
		expect(system.errorRecovery).toBeDefined()
		expect(system.strategyAdapter).toBeDefined()
		expect(system.toolSelector).toBeDefined()
		expect(system.problemDetector).toBeDefined()

		system.dispose()
	})

	test("should create preset intelligence systems with TRAE components", () => {
		const defaultSystem = createPresetIntelligenceSystem("default")
		const conservativeSystem = createPresetIntelligenceSystem("conservative")
		const experimentalSystem = createPresetIntelligenceSystem("experimental")

		// Test default preset
		expect(defaultSystem.sequentialThinking).toBeDefined()
		expect(defaultSystem.toolRepetitionDetector).toBeDefined()
		expect(defaultSystem.selfAssessment).toBeDefined()

		// Test conservative preset
		expect(conservativeSystem.sequentialThinking).toBeDefined()
		expect(conservativeSystem.toolRepetitionDetector).toBeDefined()
		expect(conservativeSystem.selfAssessment).toBeDefined()

		// Test experimental preset
		expect(experimentalSystem.sequentialThinking).toBeDefined()
		expect(experimentalSystem.toolRepetitionDetector).toBeDefined()
		expect(experimentalSystem.selfAssessment).toBeDefined()

		// Clean up
		defaultSystem.dispose()
		conservativeSystem.dispose()
		experimentalSystem.dispose()
	})

	test("should properly dispose all TRAE components", () => {
		const system = createIntelligenceSystem()

		// Mock the dispose methods to verify they're called
		const sequentialThinkingDispose = vi.fn()
		const toolRepetitionDispose = vi.fn()
		const selfAssessmentDispose = vi.fn()

		if (system.sequentialThinking) {
			system.sequentialThinking.dispose = sequentialThinkingDispose
		}
		if (system.toolRepetitionDetector) {
			system.toolRepetitionDetector.dispose = toolRepetitionDispose
		}
		if (system.selfAssessment) {
			system.selfAssessment.dispose = selfAssessmentDispose
		}

		system.dispose()

		expect(sequentialThinkingDispose).toHaveBeenCalled()
		expect(toolRepetitionDispose).toHaveBeenCalled()
		expect(selfAssessmentDispose).toHaveBeenCalled()
	})

	test("should create intelligence system with custom TRAE configurations", () => {
		const customConfig = {
			sequentialThinking: {
				maxThoughts: 10,
				minThoughts: 3,
				confidenceThreshold: 0.9,
				enableBranching: false,
				enableRevisions: false,
				thoughtTimeout: 60000,
				performanceTracking: true,
				learningEnabled: true,
			},
			toolRepetition: {
				maxHistorySize: 50,
				consecutiveThreshold: 2,
				cyclicWindowSize: 5,
				semanticSimilarityThreshold: 0.9,
				interventionThreshold: 0.8,
				learningEnabled: true,
				contextAwareAnalysis: true,
				performanceTracking: true,
				patternMemoryDuration: 12 * 60 * 60 * 1000,
			},
			selfAssessment: {
				assessmentFrequency: 120000,
				historicalDataRetention: 7 * 24 * 60 * 60 * 1000,
				trendAnalysisWindow: 3 * 24 * 60 * 60 * 1000,
				confidenceThreshold: 0.8,
				recommendationLimit: 5,
				enablePredictiveAnalysis: true,
				enableLearningAdaptation: true,
				performanceTracking: true,
				detailedLogging: false,
				integrationEnabled: true,
			},
		}

		const system = createIntelligenceSystem(customConfig)

		expect(system.sequentialThinking).toBeDefined()
		expect(system.toolRepetitionDetector).toBeDefined()
		expect(system.selfAssessment).toBeDefined()

		system.dispose()
	})

	test("should maintain backward compatibility", async () => {
		const system = createIntelligenceSystem()

		// Create a mock intelligence context
		const mockContext: IntelligenceContext = {
			taskId: "test-task",
			currentStep: 1,
			totalSteps: 3,
			recentTools: [],
			recentErrors: [],
			performance: {
				taskCompletionRate: 0.8,
				errorRate: 0.1,
				efficiencyScore: 0.7,
				repetitionRate: 0.05,
			},
			memoryEntries: [],
			errorHistory: [],
			strategyPerformance: [],
			toolAnalytics: [],
			problemIndicators: [],
			adaptationNeeds: [],
			learningOpportunities: [],
		}

		// Test that the analyze method still works with new components
		const result = await system.analyze(mockContext)

		expect(result).toBeDefined()
		expect(result.confidence).toBeGreaterThanOrEqual(0)
		expect(result.reasoning).toBeInstanceOf(Array)
		expect(result.contextInsights).toBeInstanceOf(Array)
		expect(result.toolRecommendations).toBeInstanceOf(Array)
		expect(result.problemPredictions).toBeInstanceOf(Array)

		// Test that metrics still work
		const metrics = await system.getMetrics()
		expect(metrics).toBeDefined()
		expect(metrics.overallIntelligenceScore).toBeGreaterThanOrEqual(0)
		expect(metrics.lastUpdated).toBeDefined()

		system.dispose()
	})
})

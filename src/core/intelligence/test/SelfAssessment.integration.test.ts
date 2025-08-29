/**
 * Integration tests for the TRAE-Agent Self-Assessment Engine
 *
 * These tests verify that the SelfAssessment module integrates correctly
 * with the existing intelligence system components and provides accurate
 * performance evaluation capabilities.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest"
import { SelfAssessment, PerformanceAssessment, TrendAnalysis, HistoricalComparison } from "../SelfAssessment"
import { ReflectionContext, PerformanceMetrics } from "../../reflection/types"
import type { UnifiedToolUse } from "../../shared/types/unified-types"

describe("SelfAssessment Integration Tests", () => {
	let selfAssessment: SelfAssessment
	let mockReflectionContext: ReflectionContext

	beforeEach(() => {
		selfAssessment = new SelfAssessment({
			assessmentFrequency: 100, // Fast for testing
			confidenceThreshold: 0.7,
			enableLearningAdaptation: true,
			performanceTracking: true,
			detailedLogging: true,
		})

		mockReflectionContext = {
			taskId: "test-task-001",
			currentStep: 5,
			totalSteps: 10,
			taskType: "code_generation",
			recentTools: [
				{ name: "read_file", timestamp: Date.now() - 1000 },
				{ name: "write_to_file", timestamp: Date.now() - 500 },
				{ name: "apply_diff", timestamp: Date.now() - 200 },
			] as UnifiedToolUse[],
			recentErrors: ["Type error in line 42", "Missing import statement"],
			performance: {
				taskCompletionRate: 0.8,
				errorRate: 0.15,
				efficiencyScore: 0.75,
				repetitionRate: 0.05,
			} as PerformanceMetrics,
		}
	})

	afterEach(() => {
		selfAssessment.dispose()
	})

	describe("Core Assessment Functionality", () => {
		test("should perform comprehensive self-assessment", async () => {
			const assessment = await selfAssessment.performSelfAssessment(mockReflectionContext, "session")

			expect(assessment).toBeDefined()
			expect(assessment.id).toMatch(/^assessment-/)
			expect(assessment.assessmentType).toBe("session")
			expect(assessment.confidence).toBeGreaterThan(0)
			expect(assessment.confidence).toBeLessThanOrEqual(1)

			// Verify all required metrics are present
			expect(assessment.metrics).toHaveProperty("accuracy")
			expect(assessment.metrics).toHaveProperty("efficiency")
			expect(assessment.metrics).toHaveProperty("successRate")
			expect(assessment.metrics).toHaveProperty("adaptability")
			expect(assessment.metrics).toHaveProperty("learningRate")
			expect(assessment.metrics).toHaveProperty("resourceUtilization")
			expect(assessment.metrics).toHaveProperty("timeManagement")
			expect(assessment.metrics).toHaveProperty("errorRecovery")

			// Verify arrays are populated
			expect(Array.isArray(assessment.strengths)).toBe(true)
			expect(Array.isArray(assessment.weaknesses)).toBe(true)
			expect(Array.isArray(assessment.trends)).toBe(true)
			expect(Array.isArray(assessment.recommendations)).toBe(true)

			// Verify metadata
			expect(assessment.metadata).toHaveProperty("processingTime")
			expect(assessment.metadata).toHaveProperty("dataPoints")
		})

		test("should handle multiple assessment types", async () => {
			const types: PerformanceAssessment["assessmentType"][] = ["task", "session", "tool", "strategy", "overall"]

			for (const type of types) {
				const assessment = await selfAssessment.performSelfAssessment(mockReflectionContext, type)
				expect(assessment.assessmentType).toBe(type)
			}
		})

		test("should emit assessment events", async () => {
			const assessmentCompleted = vi.fn()
			selfAssessment.on("assessment_completed", assessmentCompleted)

			await selfAssessment.performSelfAssessment(mockReflectionContext)

			expect(assessmentCompleted).toHaveBeenCalledTimes(1)
			expect(assessmentCompleted.mock.calls[0][0]).toHaveProperty("id")
			expect(assessmentCompleted.mock.calls[0][0]).toHaveProperty("confidence")
		})
	})

	describe("Historical Analysis", () => {
		beforeEach(async () => {
			// Generate some historical data
			for (let i = 0; i < 5; i++) {
				const context = {
					...mockReflectionContext,
					taskId: `task-${i}`,
					performance: {
						taskCompletionRate: 0.6 + i * 0.08, // Improving trend
						errorRate: 0.2 - i * 0.03, // Decreasing errors
						efficiencyScore: 0.5 + i * 0.1,
						repetitionRate: 0.1 - i * 0.01,
					} as PerformanceMetrics,
				}
				await selfAssessment.performSelfAssessment(context, "session")
				await new Promise((resolve) => setTimeout(resolve, 50)) // Small delay for timestamps
			}
		})

		test("should provide historical comparison", async () => {
			const comparison = await selfAssessment.getHistoricalComparison("accuracy")

			expect(comparison).toBeDefined()
			expect(comparison?.metric).toBe("accuracy")
			expect(comparison?.currentValue).toBeGreaterThan(0)
			expect(comparison?.historicalAverage).toBeGreaterThan(0)
			expect(comparison?.percentileRank).toBeGreaterThanOrEqual(0)
			expect(comparison?.percentileRank).toBeLessThanOrEqual(100)
			expect(comparison?.bestPerformance).toHaveProperty("value")
			expect(comparison?.bestPerformance).toHaveProperty("timestamp")
			expect(comparison?.worstPerformance).toHaveProperty("value")
		})

		test("should return null for insufficient data", async () => {
			const newAssessment = new SelfAssessment()
			const comparison = await newAssessment.getHistoricalComparison("accuracy")
			expect(comparison).toBeNull()
			newAssessment.dispose()
		})

		test("should respect timeframe parameter", async () => {
			const recentComparison = await selfAssessment.getHistoricalComparison("accuracy", 1000) // 1 second
			const allTimeComparison = await selfAssessment.getHistoricalComparison("accuracy")

			expect(recentComparison).toBeDefined()
			expect(allTimeComparison).toBeDefined()
			// Recent should have fewer data points than all-time
		})
	})

	describe("Recommendation System", () => {
		test("should track recommendation outcomes", async () => {
			// First perform assessment to generate recommendations
			await selfAssessment.performSelfAssessment(mockReflectionContext)

			const stats = selfAssessment.getAssessmentStats()
			expect(stats.recommendationEffectiveness).toBeGreaterThanOrEqual(0)

			// Simulate recommendation outcome
			const outcomeRecorded = vi.fn()
			selfAssessment.on("recommendation_outcome", outcomeRecorded)

			// Create a mock recommendation ID
			const mockRecId = "test-recommendation-001"

			// Record outcome (this will only work if the recommendation exists)
			await selfAssessment.recordRecommendationOutcome(mockRecId, "successful", "Test feedback")

			// The event should not be emitted since the recommendation doesn't exist
			expect(outcomeRecorded).not.toHaveBeenCalled()
		})

		test("should emit learning events", async () => {
			const learningEvent = vi.fn()
			selfAssessment.on("learning_event", learningEvent)

			await selfAssessment.performSelfAssessment(mockReflectionContext)

			expect(learningEvent).toHaveBeenCalled()
			const eventData = learningEvent.mock.calls[0][0]
			expect(eventData).toHaveProperty("id")
			expect(eventData).toHaveProperty("source")
			expect(eventData).toHaveProperty("event")
			expect(eventData).toHaveProperty("confidence")
		})
	})

	describe("Performance Tracking", () => {
		test("should provide comprehensive statistics", async () => {
			// Generate some assessment history
			for (let i = 0; i < 3; i++) {
				await selfAssessment.performSelfAssessment(mockReflectionContext)
			}

			const stats = selfAssessment.getAssessmentStats()

			expect(stats.totalAssessments).toBeGreaterThan(0)
			expect(stats.averageConfidence).toBeGreaterThan(0)
			expect(stats.averageConfidence).toBeLessThanOrEqual(1)
			expect(stats.recommendationEffectiveness).toBeGreaterThanOrEqual(0)
			expect(stats.recommendationEffectiveness).toBeLessThanOrEqual(1)
			expect(Array.isArray(stats.strengthsProfile)).toBe(true)
			expect(Array.isArray(stats.weaknessesProfile)).toBe(true)
			expect(typeof stats.overallGrowth).toBe("number")
			expect(typeof stats.improvementTrends).toBe("object")
		})

		test("should handle active state changes", () => {
			const statusChanged = vi.fn()
			selfAssessment.on("status_changed", statusChanged)

			selfAssessment.setActive(false)
			expect(statusChanged).toHaveBeenCalledWith({ active: false })

			selfAssessment.setActive(true)
			expect(statusChanged).toHaveBeenCalledWith({ active: true })
		})

		test("should throw error when inactive", async () => {
			selfAssessment.setActive(false)

			await expect(selfAssessment.performSelfAssessment(mockReflectionContext)).rejects.toThrow(
				"Self-assessment engine is not active",
			)
		})
	})

	describe("Data Management", () => {
		test("should clear history properly", async () => {
			// Generate some data
			await selfAssessment.performSelfAssessment(mockReflectionContext)

			const historyCleared = vi.fn()
			selfAssessment.on("history_cleared", historyCleared)

			selfAssessment.clearHistory()

			expect(historyCleared).toHaveBeenCalled()

			// Stats should be reset
			const stats = selfAssessment.getAssessmentStats()
			expect(stats.totalAssessments).toBe(0)
			expect(stats.averageConfidence).toBe(0)
		})

		test("should handle disposal properly", () => {
			const initialListenerCount = selfAssessment.listenerCount("assessment_completed")
			selfAssessment.on("assessment_completed", () => {})
			expect(selfAssessment.listenerCount("assessment_completed")).toBe(initialListenerCount + 1)

			selfAssessment.dispose()

			expect(selfAssessment.listenerCount("assessment_completed")).toBe(0)
		})
	})

	describe("Error Handling", () => {
		test("should handle malformed context gracefully", async () => {
			const malformedContext = {
				taskId: "test",
				currentStep: 1,
				totalSteps: 5,
				taskType: "test",
				recentTools: null, // Malformed
				recentErrors: undefined, // Malformed
				performance: null, // Malformed
			} as any

			const assessment = await selfAssessment.performSelfAssessment(malformedContext)
			expect(assessment).toBeDefined()
			expect(assessment.confidence).toBeGreaterThan(0)
		})

		test("should emit error events on assessment failure", async () => {
			const assessmentError = vi.fn()
			selfAssessment.on("assessment_error", assessmentError)

			// Force an error by providing invalid context
			const invalidContext = null as any

			await expect(selfAssessment.performSelfAssessment(invalidContext)).rejects.toThrow()

			expect(assessmentError).toHaveBeenCalled()
		})
	})

	describe("Integration with Reflection System", () => {
		test("should work with various performance metric configurations", async () => {
			const scenarios = [
				{ taskCompletionRate: 0.9, errorRate: 0.05, efficiencyScore: 0.85 },
				{ taskCompletionRate: 0.6, errorRate: 0.25, efficiencyScore: 0.45 },
				{ taskCompletionRate: 0.75, errorRate: 0.15, efficiencyScore: 0.65 },
			]

			for (const scenario of scenarios) {
				const context = {
					...mockReflectionContext,
					performance: { ...scenario, repetitionRate: 0.05 } as PerformanceMetrics,
				}

				const assessment = await selfAssessment.performSelfAssessment(context)
				expect(assessment.confidence).toBeGreaterThan(0)

				// High performance should result in higher confidence
				if (scenario.taskCompletionRate > 0.8 && scenario.errorRate < 0.1) {
					expect(assessment.confidence).toBeGreaterThan(0.5)
				}
			}
		})

		test("should adapt to different tool usage patterns", async () => {
			const toolPatterns = [
				[{ name: "read_file" }, { name: "read_file" }, { name: "read_file" }], // Repetitive
				[{ name: "read_file" }, { name: "write_to_file" }, { name: "apply_diff" }], // Varied
				[], // Empty
			]

			for (const tools of toolPatterns) {
				const context = {
					...mockReflectionContext,
					recentTools: tools.map((tool) => ({ ...tool, timestamp: Date.now() })) as UnifiedToolUse[],
				}

				const assessment = await selfAssessment.performSelfAssessment(context)
				expect(assessment.metrics.adaptability).toBeGreaterThan(0)
			}
		})
	})
})

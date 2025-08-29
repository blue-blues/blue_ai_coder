// npx vitest run src/core/reflection/__tests__/ReflectionEngine.test.ts

import { describe, it, expect, beforeEach, afterEach, vitest } from "vitest"
import { EventEmitter } from "events"
import { ReflectionEngine } from "../ReflectionEngine"
import { SequentialThinking } from "../SequentialThinking"
import { SelfAssessment } from "../SelfAssessment"
import type {
	ReflectionConfig,
	ReflectionContext,
	ReflectionResult,
	ReflectionEvent,
	PerformanceMetrics,
} from "../types"
import type { UnifiedToolUse } from "../../shared/types/unified-types"
import { createTestTool } from "../../shared/types/unified-types"

// Mock the dependencies
vitest.mock("../SequentialThinking")
vitest.mock("../SelfAssessment")

const MockedSequentialThinking = vitest.mocked(SequentialThinking)
const MockedSelfAssessment = vitest.mocked(SelfAssessment)

describe("ReflectionEngine", () => {
	let reflectionEngine: ReflectionEngine
	let mockSequentialThinking: any
	let mockSelfAssessment: any
	let mockConfig: Partial<ReflectionConfig>
	let mockContext: ReflectionContext

	beforeEach(() => {
		// Reset all mocks
		vitest.clearAllMocks()

		// Create mock instances
		mockSequentialThinking = {
			analyze: vitest.fn(),
			updateConfig: vitest.fn(),
			getActiveChains: vitest.fn(),
			getCompletedChains: vitest.fn(),
			dispose: vitest.fn(),
			on: vitest.fn(),
			off: vitest.fn(),
			emit: vitest.fn(),
			removeAllListeners: vitest.fn(),
		} as any

		mockSelfAssessment = {
			assess: vitest.fn(),
			updateConfig: vitest.fn(),
			recordEvent: vitest.fn(),
			getRecentEvents: vitest.fn(),
			getPerformanceHistory: vitest.fn(),
			getAssessmentHistory: vitest.fn(),
			dispose: vitest.fn(),
			on: vitest.fn(),
			off: vitest.fn(),
			emit: vitest.fn(),
			removeAllListeners: vitest.fn(),
		} as any

		// Mock constructors
		MockedSequentialThinking.mockImplementation(() => mockSequentialThinking)
		MockedSelfAssessment.mockImplementation(() => mockSelfAssessment)

		mockConfig = {
			enableSequentialThinking: true,
			enableSelfAssessment: true,
			maxReasoningSteps: 5,
			assessmentInterval: 60000,
			patternDetectionThreshold: 0.8,
			semanticSimilarityThreshold: 0.9,
			performanceWindowSize: 50,
		}

		mockContext = {
			taskId: "test-task-123",
			currentStep: 5,
			totalSteps: 10,
			recentTools: [
				createTestTool("read_file", { path: "test.ts" }),
				createTestTool("write_to_file", { path: "output.ts" }),
			] as any,
			recentErrors: ["File not found", "Permission denied"],
			performance: {
				taskCompletionRate: 0.8,
				averageStepsToCompletion: 12,
				errorRate: 0.1,
				repetitionRate: 0.05,
				adaptabilityScore: 0.7,
				efficiencyScore: 0.85,
				lastCalculatedAt: Date.now(),
			},
			environment: {
				workspacePath: "/test/workspace",
				apiConfiguration: { apiProvider: "anthropic" as any },
			},
		}

		reflectionEngine = new ReflectionEngine(mockConfig)
	})

	afterEach(() => {
		reflectionEngine.dispose()
	})

	describe("initialization", () => {
		it("should initialize with default configuration when no config provided", () => {
			const defaultEngine = new ReflectionEngine()

			// Verify constructor was called with proper defaults
			expect(MockedSequentialThinking).toHaveBeenCalledWith({
				maxSteps: 10, // default maxReasoningSteps
				confidenceThreshold: 0.6,
			})

			expect(MockedSelfAssessment).toHaveBeenCalledWith({
				windowSize: 100, // default performanceWindowSize
				assessmentInterval: 300000, // default assessmentInterval
			})

			defaultEngine.dispose()
		})

		it("should initialize with custom configuration", () => {
			expect(MockedSequentialThinking).toHaveBeenCalledWith({
				maxSteps: 5,
				confidenceThreshold: 0.6,
			})

			expect(MockedSelfAssessment).toHaveBeenCalledWith({
				windowSize: 50,
				assessmentInterval: 60000,
			})
		})

		it("should set up event listeners for sub-components", () => {
			expect(mockSequentialThinking.on).toHaveBeenCalledWith("reasoning_completed", expect.any(Function))
			expect(mockSelfAssessment.on).toHaveBeenCalledWith("assessment_completed", expect.any(Function))
		})

		it("should start in active state", () => {
			expect(reflectionEngine.isEngineActive()).toBe(true)
		})
	})

	describe("reflect method", () => {
		/**
		 * Test successful reflection with both sequential thinking and self-assessment enabled
		 */
		it("should perform complete reflection when both components are enabled", async () => {
			// Setup mock responses
			const mockSequentialResult: ReflectionResult = {
				success: true,
				insights: ["Sequential insight 1", "Sequential insight 2"],
				recommendations: ["Sequential recommendation 1"],
				confidence: 0.85,
				nextSteps: ["Continue with approach"],
				metadata: { chainId: "chain-123" },
			}

			const mockAssessmentResult: ReflectionResult = {
				success: true,
				insights: ["Assessment insight 1"],
				recommendations: ["Assessment recommendation 1"],
				confidence: 0.9,
				nextSteps: ["Improve efficiency"],
				metadata: { assessmentId: "assessment-456" },
			}

			mockSequentialThinking.analyze.mockResolvedValue(mockSequentialResult)
			mockSelfAssessment.assess.mockResolvedValue(mockAssessmentResult)

			const result = await reflectionEngine.reflect(mockContext)

			expect(result.success).toBe(true)
			expect(result.insights.length).toBeGreaterThan(0)
			expect(result.recommendations.length).toBeGreaterThan(0)
			expect(result.confidence).toBeGreaterThan(0)
			expect(result.metadata).toMatchObject({
				contextId: "test-task-123",
				componentsUsed: {
					sequentialThinking: true,
					selfAssessment: true,
				},
			})
		})

		it("should handle sequential thinking disabled", async () => {
			// Create engine with sequential thinking disabled
			const config = { ...mockConfig, enableSequentialThinking: false }
			const engine = new ReflectionEngine(config)

			const mockAssessmentResult: ReflectionResult = {
				success: true,
				insights: ["Assessment insight only"],
				recommendations: ["Assessment recommendation only"],
				confidence: 0.8,
				nextSteps: ["Next step"],
				metadata: {},
			}

			mockSelfAssessment.assess.mockResolvedValue(mockAssessmentResult)

			const result = await engine.reflect(mockContext)

			expect(mockSequentialThinking.analyze).not.toHaveBeenCalled()
			expect(mockSelfAssessment.assess).toHaveBeenCalled()
			expect(result.success).toBe(true)

			engine.dispose()
		})

		it("should handle self-assessment disabled", async () => {
			// Create engine with self-assessment disabled
			const config = { ...mockConfig, enableSelfAssessment: false }
			const engine = new ReflectionEngine(config)

			const mockSequentialResult: ReflectionResult = {
				success: true,
				insights: ["Sequential insight only"],
				recommendations: ["Sequential recommendation only"],
				confidence: 0.75,
				nextSteps: [],
				metadata: {},
			}

			mockSequentialThinking.analyze.mockResolvedValue(mockSequentialResult)

			const result = await engine.reflect(mockContext)

			expect(mockSequentialThinking.analyze).toHaveBeenCalled()
			expect(mockSelfAssessment.assess).not.toHaveBeenCalled()
			expect(result.success).toBe(true)

			engine.dispose()
		})

		it("should return error when engine is inactive", async () => {
			reflectionEngine.setActive(false)

			const result = await reflectionEngine.reflect(mockContext)

			expect(result.success).toBe(false)
			expect(result.insights).toEqual([])
			expect(result.recommendations).toEqual(["Reflection engine is not active"])
			expect(result.confidence).toBe(0)
			expect(result.metadata).toMatchObject({ error: "Engine inactive" })

			expect(mockSequentialThinking.analyze).not.toHaveBeenCalled()
			expect(mockSelfAssessment.assess).not.toHaveBeenCalled()
		})

		it("should handle component failures gracefully", async () => {
			mockSequentialThinking.analyze.mockRejectedValue(new Error("Sequential thinking failed"))
			mockSelfAssessment.assess.mockResolvedValue({
				success: true,
				insights: ["Assessment worked"],
				recommendations: ["Keep going"],
				confidence: 0.7,
				nextSteps: [],
				metadata: {},
			})

			const result = await reflectionEngine.reflect(mockContext)

			expect(result.success).toBe(false)
			expect(result.recommendations).toEqual([
				expect.stringContaining("Error during reflection: Sequential thinking failed"),
			])
			expect(result.nextSteps).toEqual(["Review reflection engine configuration"])
		})
	})

	describe("state management", () => {
		it("should handle active/inactive state changes", () => {
			const statusSpy = vitest.fn()
			reflectionEngine.on("status_changed", statusSpy)

			expect(reflectionEngine.isEngineActive()).toBe(true)

			reflectionEngine.setActive(false)
			expect(reflectionEngine.isEngineActive()).toBe(false)
			expect(statusSpy).toHaveBeenCalledWith({ active: false })

			reflectionEngine.setActive(true)
			expect(reflectionEngine.isEngineActive()).toBe(true)
			expect(statusSpy).toHaveBeenCalledWith({ active: true })
		})
	})

	describe("resource cleanup", () => {
		it("should properly dispose of all resources", () => {
			reflectionEngine.dispose()

			expect(reflectionEngine.isEngineActive()).toBe(false)
			expect(mockSequentialThinking.dispose).toHaveBeenCalled()
			expect(mockSelfAssessment.dispose).toHaveBeenCalled()
		})
	})
})

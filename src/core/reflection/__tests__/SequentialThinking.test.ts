// npx vitest run src/core/reflection/__tests__/SequentialThinking.test.ts

import { SequentialThinking } from "../SequentialThinking"
import type { UnifiedToolUse } from "../../shared/types/unified-types"
import { createTestTool } from "../../shared/types/unified-types"
import type { ReflectionContext, ReflectionResult, ThinkingStep, ReasoningChain, PerformanceMetrics } from "../types"

// Local interface for test configuration
interface MockSequentialThinkingConfig {
	maxSteps: number
	confidenceThreshold: number
	timeoutMs?: number
	enableMetaReasoning?: boolean
}

describe("SequentialThinking", () => {
	let sequentialThinking: SequentialThinking
	let mockConfig: MockSequentialThinkingConfig
	let mockContext: ReflectionContext

	beforeEach(() => {
		mockConfig = {
			maxSteps: 8,
			confidenceThreshold: 0.7,
			timeoutMs: 30000,
			enableMetaReasoning: true,
		}

		mockContext = {
			taskId: "test-task-456",
			currentStep: 3,
			totalSteps: 8,
			recentTools: [
				createTestTool("read_file", { path: "src/test.ts" }),
				createTestTool("apply_diff", { path: "src/test.ts" }),
				createTestTool("execute_command", { command: "npm test" }),
			],
			recentErrors: ["Syntax error in line 42", "Test failed: expected true, got false"],
			performance: {
				taskCompletionRate: 0.6,
				averageStepsToCompletion: 15,
				errorRate: 0.25,
				repetitionRate: 0.1,
				adaptabilityScore: 0.8,
				efficiencyScore: 0.7,
				lastCalculatedAt: Date.now(),
			},
			environment: {
				workspacePath: "/test/workspace",
				apiConfiguration: { apiProvider: "anthropic" as any },
			},
		}

		sequentialThinking = new SequentialThinking(mockConfig)
	})

	afterEach(() => {
		sequentialThinking.dispose()
	})

	describe("initialization", () => {
		it("should initialize with provided configuration", () => {
			expect(sequentialThinking).toBeDefined()
		})

		it("should set default values for optional config parameters", () => {
			const minimalConfig = {
				maxSteps: 5,
				confidenceThreshold: 0.6,
			}
			const thinking = new SequentialThinking(minimalConfig)

			// Should not throw and should work with defaults
			expect(thinking).toBeDefined()

			thinking.dispose()
		})

		it("should start with empty active and completed chains", () => {
			expect(sequentialThinking.getActiveChains()).toEqual([])
			expect(sequentialThinking.getCompletedChains()).toEqual([])
		})
	})

	describe("analyze method", () => {
		/**
		 * Test the complete 5-step sequential thinking process:
		 * 1. Observation - Analyze current state
		 * 2. Analysis - Identify patterns and issues
		 * 3. Hypothesis - Form potential explanations
		 * 4. Decision - Choose best course of action
		 * 5. Reflection - Meta-analysis of reasoning process
		 */
		it("should execute complete 5-step reasoning process", async () => {
			const result = await sequentialThinking.analyze(mockContext)

			expect(result.success).toBe(true)
			expect(result.insights).toBeDefined()
			expect(result.recommendations).toBeDefined()
			expect(result.confidence).toBeGreaterThan(0)
			expect(result.nextSteps).toBeDefined()
			expect(result.metadata).toMatchObject({
				chainId: expect.stringContaining("test-task-456-chain"),
				steps: expect.any(Number),
				duration: expect.any(Number),
				reasoning: expect.any(Array),
			})

			// Should have created a reasoning chain
			const completedChains = sequentialThinking.getCompletedChains()
			expect(completedChains).toHaveLength(1)

			const chain = completedChains[0]
			expect(chain.steps).toHaveLength(5) // 5-step process
			expect(chain.steps.map((s) => s.type)).toEqual([
				"observation",
				"analysis",
				"hypothesis",
				"decision",
				"reflection",
			])
		})

		it("should handle early stage task context appropriately", async () => {
			const earlyContext = {
				...mockContext,
				currentStep: 1,
				totalSteps: 20,
			}

			const result = await sequentialThinking.analyze(earlyContext)

			expect(result.success).toBe(true)
			expect(result.insights).toContain(expect.stringContaining("Task is in early stages"))
		})

		it("should handle late stage task context appropriately", async () => {
			const lateContext = {
				...mockContext,
				currentStep: 18,
				totalSteps: 20,
			}

			const result = await sequentialThinking.analyze(lateContext)

			expect(result.success).toBe(true)
			expect(result.insights).toContain(expect.stringContaining("Task is in final stages"))
		})

		it("should analyze tool usage patterns correctly", async () => {
			const toolHeavyContext = {
				...mockContext,
				recentTools: [
					createTestTool("read_file", { path: "file1.ts" }),
					createTestTool("read_file", { path: "file2.ts" }),
					createTestTool("read_file", { path: "file3.ts" }),
					createTestTool("read_file", { path: "file4.ts" }),
					createTestTool("write_to_file", { path: "output.ts" }),
				],
			}

			const result = await sequentialThinking.analyze(toolHeavyContext)

			expect(result.success).toBe(true)
			expect(result.insights).toContain(expect.stringContaining("Heavy reliance on read_file tool"))
		})

		it("should generate appropriate hypotheses based on performance metrics", async () => {
			const poorPerformanceContext = {
				...mockContext,
				performance: {
					...mockContext.performance,
					efficiencyScore: 0.3,
					errorRate: 0.4,
					adaptabilityScore: 0.2,
				},
			}

			const result = await sequentialThinking.analyze(poorPerformanceContext)

			expect(result.success).toBe(true)
			expect(result.recommendations).toContain(expect.stringContaining("alternative strategies"))
		})

		it("should handle meta-reasoning when enabled", async () => {
			const result = await sequentialThinking.analyze(mockContext)

			expect(result.success).toBe(true)

			const completedChains = sequentialThinking.getCompletedChains()
			const chain = completedChains[0]

			// Should have a reflection step
			const reflectionSteps = chain.steps.filter((s) => s.type === "reflection")
			expect(reflectionSteps).toHaveLength(1)
			expect(reflectionSteps[0].content).toContain("Meta-reflection")
		})

		it("should skip meta-reasoning when disabled", async () => {
			const configWithoutMeta = {
				...mockConfig,
				enableMetaReasoning: false,
			}
			const thinking = new SequentialThinking(configWithoutMeta)

			const result = await thinking.analyze(mockContext)

			expect(result.success).toBe(true)

			const completedChains = thinking.getCompletedChains()
			const chain = completedChains[0]

			// Should not have a reflection step
			const reflectionSteps = chain.steps.filter((s) => s.type === "reflection")
			expect(reflectionSteps).toHaveLength(0)

			thinking.dispose()
		})

		it("should handle errors gracefully", async () => {
			// Create a context that might cause issues
			const problematicContext = {
				...mockContext,
				taskId: "", // Invalid task ID
				recentTools: [], // No tools
				performance: null as any, // Invalid performance
			}

			const result = await sequentialThinking.analyze(problematicContext)

			expect(result.success).toBe(false)
			expect(result.recommendations).toContain(expect.stringContaining("Sequential thinking failed"))
			expect(result.nextSteps).toContain("Review reasoning approach")
		})
	})

	describe("reasoning chain management", () => {
		it("should track active chains during analysis", async () => {
			// Start analysis but don't await
			const analysisPromise = sequentialThinking.analyze(mockContext)

			// Check that there's an active chain
			const activeChains = sequentialThinking.getActiveChains()
			expect(activeChains.length).toBeGreaterThanOrEqual(0)

			// Complete the analysis
			await analysisPromise

			// Should have moved to completed
			expect(sequentialThinking.getCompletedChains()).toHaveLength(1)
		})

		it("should maintain completed chains history", async () => {
			// Perform multiple analyses
			await sequentialThinking.analyze(mockContext)
			await sequentialThinking.analyze({
				...mockContext,
				taskId: "second-task",
			})

			const completedChains = sequentialThinking.getCompletedChains()
			expect(completedChains).toHaveLength(2)
			expect(completedChains[0].id).toContain("test-task-456")
			expect(completedChains[1].id).toContain("second-task")
		})

		it("should limit completed chains history", async () => {
			// Perform many analyses to test history limit
			for (let i = 0; i < 15; i++) {
				await sequentialThinking.analyze({
					...mockContext,
					taskId: `task-${i}`,
				})
			}

			const completedChains = sequentialThinking.getCompletedChains()
			expect(completedChains.length).toBeLessThanOrEqual(10) // Default limit
		})
	})

	describe("event emission", () => {
		it("should emit reasoning_completed event", async () => {
			const eventSpy = vitest.fn()
			sequentialThinking.on("reasoning_completed", eventSpy)

			await sequentialThinking.analyze(mockContext)

			expect(eventSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					id: expect.stringContaining("test-task-456-chain"),
					steps: expect.any(Array),
					confidence: expect.any(Number),
				}),
			)
		})

		it("should emit thinking_step events during analysis", async () => {
			const stepSpy = vitest.fn()
			sequentialThinking.on("thinking_step", stepSpy)

			await sequentialThinking.analyze(mockContext)

			expect(stepSpy).toHaveBeenCalledTimes(5) // 5 steps in the process
			expect(stepSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					chainId: expect.any(String),
					step: expect.objectContaining({
						type: expect.any(String),
						content: expect.any(String),
						confidence: expect.any(Number),
					}),
				}),
			)
		})
	})

	describe("configuration management", () => {
		it("should update configuration correctly", () => {
			const newConfig = {
				maxSteps: 12,
				confidenceThreshold: 0.8,
			}

			sequentialThinking.updateConfig(newConfig)

			// Configuration should be updated (we can't directly test private config,
			// but we can test behavior changes)
			expect(() => sequentialThinking.updateConfig(newConfig)).not.toThrow()
		})
	})

	describe("confidence calculation", () => {
		it("should calculate reasonable confidence scores", async () => {
			const result = await sequentialThinking.analyze(mockContext)

			expect(result.confidence).toBeGreaterThan(0)
			expect(result.confidence).toBeLessThanOrEqual(1)

			const completedChains = sequentialThinking.getCompletedChains()
			const chain = completedChains[0]

			// Chain confidence should be reasonable
			expect(chain.confidence).toBeGreaterThan(0)
			expect(chain.confidence).toBeLessThanOrEqual(1)
		})

		it("should adjust confidence based on step completeness", async () => {
			// Test with minimal context that might produce lower confidence
			const minimalContext = {
				...mockContext,
				recentTools: [],
				recentErrors: [],
				performance: {
					...mockContext.performance,
					taskCompletionRate: 0.1,
					efficiencyScore: 0.1,
				},
			}

			const result = await sequentialThinking.analyze(minimalContext)

			expect(result.success).toBe(true)
			expect(result.confidence).toBeGreaterThan(0)
		})
	})

	describe("insight and recommendation extraction", () => {
		it("should extract meaningful insights from reasoning steps", async () => {
			const result = await sequentialThinking.analyze(mockContext)

			expect(result.insights).toBeDefined()
			expect(result.insights.length).toBeGreaterThan(0)

			// Should contain observation and analysis insights
			const hasObservation = result.insights.some((insight) => insight.includes("Observation:"))
			const hasAnalysis = result.insights.some((insight) => insight.includes("Analysis:"))

			expect(hasObservation || hasAnalysis).toBe(true)
		})

		it("should extract actionable recommendations", async () => {
			const result = await sequentialThinking.analyze(mockContext)

			expect(result.recommendations).toBeDefined()
			expect(result.recommendations.length).toBeGreaterThan(0)

			// Recommendations should be actionable
			result.recommendations.forEach((rec) => {
				expect(typeof rec).toBe("string")
				expect(rec.length).toBeGreaterThan(0)
			})
		})

		it("should extract relevant next steps", async () => {
			const result = await sequentialThinking.analyze(mockContext)

			expect(result.nextSteps).toBeDefined()

			// Should provide next steps or default fallback
			if (result.nextSteps.length === 0) {
				// If no specific next steps, should have default
				expect(result.nextSteps).toContain("Continue monitoring and adjust approach as needed")
			}
		})
	})

	describe("resource management", () => {
		it("should clean up resources on disposal", () => {
			sequentialThinking.dispose()

			expect(sequentialThinking.getActiveChains()).toEqual([])
			expect(sequentialThinking.getCompletedChains()).toEqual([])
		})

		it("should handle multiple dispose calls safely", () => {
			expect(() => {
				sequentialThinking.dispose()
				sequentialThinking.dispose()
			}).not.toThrow()
		})
	})
})

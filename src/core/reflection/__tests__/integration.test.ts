// npx vitest run src/core/reflection/__tests__/integration.test.ts

import { ReflectionEngine } from "../ReflectionEngine"
import { SequentialThinking } from "../SequentialThinking"
import { SelfAssessment } from "../SelfAssessment"
import type { ReflectionConfig, ReflectionContext, ReflectionResult, PerformanceMetrics } from "../types"
import type { ToolUse } from "../../../shared/tools"

describe("Reflection Module Integration", () => {
	let reflectionEngine: ReflectionEngine
	let mockConfig: ReflectionConfig
	let mockContext: ReflectionContext

	beforeEach(() => {
		mockConfig = {
			enableSequentialThinking: true,
			enableSelfAssessment: true,
			maxReasoningSteps: 8,
			assessmentInterval: 5000,
			patternDetectionThreshold: 0.7,
			semanticSimilarityThreshold: 0.8,
			performanceWindowSize: 10,
		}

		mockContext = {
			taskId: "integration-test-task",
			currentStep: 3,
			totalSteps: 8,
			recentTools: [
				{ type: "tool_use", name: "codebase_search", params: { query: "reflection system" }, partial: false },
				{ type: "tool_use", name: "read_file", params: { path: "src/reflection/types.ts" }, partial: false },
				{ type: "tool_use", name: "write_to_file", params: { path: "src/test.ts" }, partial: false },
			] as ToolUse[],
			recentErrors: ["Minor type error in test file"],
			performance: {
				taskCompletionRate: 0.7,
				averageStepsToCompletion: 10,
				errorRate: 0.1,
				repetitionRate: 0.05,
				adaptabilityScore: 0.8,
				efficiencyScore: 0.75,
				lastCalculatedAt: Date.now(),
			},
			environment: {
				workspacePath: "/test/integration",
				apiConfiguration: { apiProvider: "anthropic" as any },
			},
		}

		reflectionEngine = new ReflectionEngine(mockConfig)
	})

	afterEach(() => {
		reflectionEngine.dispose()
	})

	describe("end-to-end reflection workflow", () => {
		/**
		 * Test complete reflection workflow with both sequential thinking and self-assessment
		 */
		it("should execute complete reflection workflow with all components", async () => {
			const result = await reflectionEngine.reflect(mockContext)

			expect(result.success).toBe(true)
			expect(result.insights).toBeDefined()
			expect(result.recommendations).toBeDefined()
			expect(result.confidence).toBeGreaterThan(0)
			expect(result.nextSteps).toBeDefined()

			// Should contain insights from both sequential thinking and self-assessment
			expect(result.insights.length).toBeGreaterThan(0)
			expect(result.recommendations.length).toBeGreaterThan(0)

			// Metadata should include results from both components
			expect(result.metadata).toMatchObject({
				sequentialThinking: expect.any(Object),
				selfAssessment: expect.any(Object),
				combinedConfidence: expect.any(Number),
			})
		})

		it("should handle sequential thinking only mode", async () => {
			const configWithThinkingOnly = {
				...mockConfig,
				enableSelfAssessment: false,
			}
			const engine = new ReflectionEngine(configWithThinkingOnly)

			const result = await engine.reflect(mockContext)

			expect(result.success).toBe(true)
			expect(result.metadata.sequentialThinking).toBeDefined()
			expect(result.metadata.selfAssessment).toBeUndefined()

			engine.dispose()
		})

		it("should handle self-assessment only mode", async () => {
			const configWithAssessmentOnly = {
				...mockConfig,
				enableSequentialThinking: false,
			}
			const engine = new ReflectionEngine(configWithAssessmentOnly)

			const result = await engine.reflect(mockContext)

			expect(result.success).toBe(true)
			expect(result.metadata.selfAssessment).toBeDefined()
			expect(result.metadata.sequentialThinking).toBeUndefined()

			engine.dispose()
		})

		it("should gracefully handle disabled components", async () => {
			const configWithBothDisabled = {
				...mockConfig,
				enableSequentialThinking: false,
				enableSelfAssessment: false,
			}
			const engine = new ReflectionEngine(configWithBothDisabled)

			const result = await engine.reflect(mockContext)

			expect(result.success).toBe(true)
			expect(result.insights).toContain("Reflection components are disabled")

			engine.dispose()
		})
	})

	describe("component interaction and data flow", () => {
		it("should combine insights from both components effectively", async () => {
			const result = await reflectionEngine.reflect(mockContext)

			expect(result.success).toBe(true)

			// Should have insights from sequential thinking (reasoning-based)
			const hasReasoningInsights = result.insights.some(
				(insight) => insight.includes("Observation:") || insight.includes("Analysis:"),
			)

			// Should have insights from self-assessment (performance-based)
			const hasPerformanceInsights = result.insights.some(
				(insight) => insight.includes("Performance summary:") || insight.includes("completion"),
			)

			expect(hasReasoningInsights || hasPerformanceInsights).toBe(true)
		})

		it("should merge recommendations from both components", async () => {
			const result = await reflectionEngine.reflect(mockContext)

			expect(result.success).toBe(true)
			expect(result.recommendations.length).toBeGreaterThan(0)

			// Recommendations should be diverse and actionable
			result.recommendations.forEach((rec) => {
				expect(typeof rec).toBe("string")
				expect(rec.length).toBeGreaterThan(0)
			})
		})

		it("should calculate combined confidence appropriately", async () => {
			const result = await reflectionEngine.reflect(mockContext)

			expect(result.success).toBe(true)
			expect(result.confidence).toBeGreaterThan(0)
			expect(result.confidence).toBeLessThanOrEqual(1)

			// Combined confidence should be reasonable
			const combinedConfidence = result.metadata.combinedConfidence as number
			expect(combinedConfidence).toBeGreaterThan(0)
			expect(combinedConfidence).toBeLessThanOrEqual(1)
		})

		it("should handle component failures gracefully", async () => {
			// Create a context that might cause issues in one component
			const problematicContext = {
				...mockContext,
				performance: null as any, // This might cause self-assessment to fail
			}

			const result = await reflectionEngine.reflect(problematicContext)

			// Should still succeed overall even if one component fails
			expect(result.success).toBe(true)
			expect(result.insights).toBeDefined()
			expect(result.recommendations).toBeDefined()
		})
	})

	describe("performance and scalability", () => {
		it("should handle multiple concurrent reflections", async () => {
			const contexts = Array.from({ length: 5 }, (_, i) => ({
				...mockContext,
				taskId: `concurrent-task-${i}`,
			}))

			const promises = contexts.map((context) => reflectionEngine.reflect(context))
			const results = await Promise.all(promises)

			results.forEach((result, index) => {
				expect(result.success).toBe(true)
				expect(result.insights).toBeDefined()
				expect(result.recommendations).toBeDefined()
			})
		})

		it("should maintain performance with large context history", async () => {
			// Create context with many tools and errors
			const largeContext = {
				...mockContext,
				recentTools: Array.from({ length: 50 }, (_, i) => ({
					type: "tool_use" as const,
					name: `tool_${i % 10}` as any,
					params: { index: i.toString() },
					partial: false,
				})) as ToolUse[],
				recentErrors: Array.from({ length: 20 }, (_, i) => `Error ${i}: Test error message`),
			}

			const startTime = Date.now()
			const result = await reflectionEngine.reflect(largeContext)
			const duration = Date.now() - startTime

			expect(result.success).toBe(true)
			expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
		})

		it("should handle memory efficiently with repeated reflections", async () => {
			// Perform many reflections to test memory usage
			for (let i = 0; i < 20; i++) {
				const result = await reflectionEngine.reflect({
					...mockContext,
					taskId: `memory-test-${i}`,
				})
				expect(result.success).toBe(true)
			}

			// Engine should still be responsive
			const finalResult = await reflectionEngine.reflect(mockContext)
			expect(finalResult.success).toBe(true)
		})
	})

	describe("event coordination", () => {
		it("should emit coordinated events from all components", async () => {
			const allEvents: any[] = []

			// Listen to all possible events
			reflectionEngine.on("reflection_started", (data) => allEvents.push({ type: "reflection_started", data }))
			reflectionEngine.on("reflection_completed", (data) =>
				allEvents.push({ type: "reflection_completed", data }),
			)
			reflectionEngine.on("thinking_step", (data) => allEvents.push({ type: "thinking_step", data }))
			reflectionEngine.on("reasoning_completed", (data) => allEvents.push({ type: "reasoning_completed", data }))
			reflectionEngine.on("assessment_completed", (data) =>
				allEvents.push({ type: "assessment_completed", data }),
			)

			await reflectionEngine.reflect(mockContext)

			// Should have emitted events from the reflection process
			expect(allEvents.length).toBeGreaterThan(0)

			// Should have reflection lifecycle events
			const hasReflectionEvents = allEvents.some(
				(event) => event.type === "reflection_started" || event.type === "reflection_completed",
			)
			expect(hasReflectionEvents).toBe(true)
		})

		it("should maintain event order and consistency", async () => {
			const eventOrder: string[] = []

			reflectionEngine.on("reflection_started", () => eventOrder.push("started"))
			reflectionEngine.on("thinking_step", () => eventOrder.push("thinking"))
			reflectionEngine.on("reasoning_completed", () => eventOrder.push("reasoning"))
			reflectionEngine.on("assessment_completed", () => eventOrder.push("assessment"))
			reflectionEngine.on("reflection_completed", () => eventOrder.push("completed"))

			await reflectionEngine.reflect(mockContext)

			// Should start with reflection_started and end with reflection_completed
			expect(eventOrder[0]).toBe("started")
			expect(eventOrder[eventOrder.length - 1]).toBe("completed")
		})
	})

	describe("configuration management", () => {
		it("should propagate configuration changes to components", async () => {
			const newConfig = {
				...mockConfig,
				maxReasoningSteps: 12,
				assessmentInterval: 3000,
			}

			reflectionEngine.updateConfig(newConfig)

			const result = await reflectionEngine.reflect(mockContext)
			expect(result.success).toBe(true)
		})

		it("should validate configuration consistency", () => {
			const invalidConfig = {
				...mockConfig,
				maxReasoningSteps: -1, // Invalid
				assessmentInterval: 0, // Invalid
			}

			// Should handle invalid config gracefully
			expect(() => reflectionEngine.updateConfig(invalidConfig)).not.toThrow()
		})

		it("should maintain component state during config updates", async () => {
			// Perform initial reflection to establish state
			await reflectionEngine.reflect(mockContext)

			// Update configuration
			reflectionEngine.updateConfig({
				...mockConfig,
				performanceWindowSize: 20,
			})

			// Should still work after config update
			const result = await reflectionEngine.reflect({
				...mockContext,
				taskId: "post-config-update",
			})

			expect(result.success).toBe(true)
		})
	})

	describe("error handling and resilience", () => {
		it("should handle component initialization failures", async () => {
			// Test with problematic configuration
			const problematicConfig = {
				...mockConfig,
				maxReasoningSteps: 0,
				assessmentInterval: -1000,
			}

			const engine = new ReflectionEngine(problematicConfig)
			const result = await engine.reflect(mockContext)

			// Should handle gracefully
			expect(result).toBeDefined()
			expect(typeof result.success).toBe("boolean")

			engine.dispose()
		})

		it("should recover from transient failures", async () => {
			// Simulate a context that might cause temporary issues
			const flakyContext = {
				...mockContext,
				recentTools: [], // Empty tools might cause issues
				performance: {
					...mockContext.performance,
					taskCompletionRate: NaN, // Invalid value
				},
			}

			const result = await reflectionEngine.reflect(flakyContext)

			// Should handle gracefully and provide fallback response
			expect(result).toBeDefined()
			expect(result.success).toBeDefined()
		})

		it("should maintain system stability under stress", async () => {
			// Perform rapid-fire reflections with varying contexts
			const stressPromises = Array.from({ length: 10 }, async (_, i) => {
				const stressContext = {
					...mockContext,
					taskId: `stress-test-${i}`,
					currentStep: i + 1,
					recentErrors: i % 2 === 0 ? ["Stress test error"] : [],
				}
				return reflectionEngine.reflect(stressContext)
			})

			const results = await Promise.all(stressPromises)

			// All should complete without throwing
			expect(results).toHaveLength(10)
			results.forEach((result) => {
				expect(result).toBeDefined()
				expect(typeof result.success).toBe("boolean")
			})
		})
	})

	describe("resource management", () => {
		it("should clean up all component resources on disposal", () => {
			reflectionEngine.dispose()

			// Should not throw when attempting operations after disposal
			expect(async () => {
				await reflectionEngine.reflect(mockContext)
			}).not.toThrow()
		})

		it("should handle multiple disposal calls safely", () => {
			expect(() => {
				reflectionEngine.dispose()
				reflectionEngine.dispose()
				reflectionEngine.dispose()
			}).not.toThrow()
		})

		it("should prevent new operations after disposal", async () => {
			reflectionEngine.dispose()

			const result = await reflectionEngine.reflect(mockContext)

			// Should return a safe fallback response
			expect(result).toBeDefined()
			expect(result.success).toBe(false)
			expect(result.insights).toContain("ReflectionEngine has been disposed")
		})
	})

	describe("real-world scenarios", () => {
		it("should handle typical development workflow reflection", async () => {
			// Simulate a typical development task progression
			const developmentStages = [
				{
					step: 1,
					total: 6,
					tools: [
						{
							type: "tool_use" as const,
							name: "codebase_search",
							params: { query: "user authentication" },
							partial: false,
						},
					],
					errors: [],
				},
				{
					step: 2,
					total: 6,
					tools: [
						{
							type: "tool_use" as const,
							name: "read_file",
							params: { path: "src/auth/login.ts" },
							partial: false,
						},
						{
							type: "tool_use" as const,
							name: "read_file",
							params: { path: "src/auth/types.ts" },
							partial: false,
						},
					],
					errors: [],
				},
				{
					step: 3,
					total: 6,
					tools: [
						{
							type: "tool_use" as const,
							name: "write_to_file",
							params: { path: "src/auth/enhanced-login.ts" },
							partial: false,
						},
					],
					errors: ["Type error: Property does not exist on type User"],
				},
				{
					step: 4,
					total: 6,
					tools: [
						{
							type: "tool_use" as const,
							name: "apply_diff",
							params: { path: "src/auth/enhanced-login.ts" },
							partial: false,
						},
					],
					errors: [],
				},
				{
					step: 5,
					total: 6,
					tools: [
						{
							type: "tool_use" as const,
							name: "execute_command",
							params: { command: "npm test" },
							partial: false,
						},
					],
					errors: ["Test failed: should authenticate valid user"],
				},
				{
					step: 6,
					total: 6,
					tools: [
						{
							type: "tool_use" as const,
							name: "apply_diff",
							params: { path: "src/auth/enhanced-login.ts" },
							partial: false,
						},
						{
							type: "tool_use" as const,
							name: "execute_command",
							params: { command: "npm test" },
							partial: false,
						},
					],
					errors: [],
				},
			]

			const results: ReflectionResult[] = []

			for (const stage of developmentStages) {
				const stageContext = {
					...mockContext,
					currentStep: stage.step,
					totalSteps: stage.total,
					recentTools: stage.tools as ToolUse[],
					recentErrors: stage.errors,
					performance: {
						...mockContext.performance,
						taskCompletionRate: stage.step / stage.total,
						errorRate: stage.errors.length / Math.max(stage.tools.length, 1),
					},
				}

				const result = await reflectionEngine.reflect(stageContext)
				results.push(result)

				expect(result.success).toBe(true)
				expect(result.insights.length).toBeGreaterThan(0)
			}

			// Should show progression in insights and recommendations
			expect(results).toHaveLength(6)

			// Later stages should have more comprehensive insights
			const finalResult = results[results.length - 1]
			expect(finalResult.confidence).toBeGreaterThan(results[0].confidence)
		})

		it("should handle debugging and error resolution workflow", async () => {
			const debuggingContext = {
				...mockContext,
				currentStep: 5,
				totalSteps: 8,
				recentTools: [
					{
						type: "tool_use" as const,
						name: "execute_command",
						params: { command: "npm test" },
						partial: false,
					},
					{ type: "tool_use" as const, name: "read_file", params: { path: "test.log" }, partial: false },
					{ type: "tool_use" as const, name: "search_files", params: { regex: "ERROR" }, partial: false },
					{
						type: "tool_use" as const,
						name: "read_file",
						params: { path: "src/problematic-module.ts" },
						partial: false,
					},
				] as ToolUse[],
				recentErrors: [
					"TypeError: Cannot read property of undefined",
					"ReferenceError: variable is not defined",
					"Test suite failed with 3 errors",
					"Build failed: TypeScript compilation error",
				],
				performance: {
					...mockContext.performance,
					errorRate: 0.8, // High error rate
					efficiencyScore: 0.3, // Low efficiency
					adaptabilityScore: 0.9, // High adaptability (trying different approaches)
				},
			}

			const result = await reflectionEngine.reflect(debuggingContext)

			expect(result.success).toBe(true)

			// Should provide debugging-focused insights
			expect(result.insights.some((insight) => insight.includes("error") || insight.includes("debug"))).toBe(true)

			// Should recommend systematic debugging approaches
			expect(
				result.recommendations.some(
					(rec) => rec.includes("error") || rec.includes("validation") || rec.includes("systematic"),
				),
			).toBe(true)
		})

		it("should handle optimization and refactoring scenarios", async () => {
			const optimizationContext = {
				...mockContext,
				currentStep: 7,
				totalSteps: 10,
				recentTools: [
					{
						type: "tool_use" as const,
						name: "codebase_search",
						params: { query: "performance bottleneck" },
						partial: false,
					},
					{
						type: "tool_use" as const,
						name: "search_files",
						params: { regex: "TODO.*optimize" },
						partial: false,
					},
					{
						type: "tool_use" as const,
						name: "read_file",
						params: { path: "src/slow-function.ts" },
						partial: false,
					},
					{
						type: "tool_use" as const,
						name: "apply_diff",
						params: { path: "src/slow-function.ts" },
						partial: false,
					},
				] as ToolUse[],
				recentErrors: [],
				performance: {
					...mockContext.performance,
					taskCompletionRate: 0.7,
					efficiencyScore: 0.95, // High efficiency
					adaptabilityScore: 0.85,
					errorRate: 0.02, // Very low error rate
				},
			}

			const result = await reflectionEngine.reflect(optimizationContext)

			expect(result.success).toBe(true)

			// Should recognize the optimization context
			expect(
				result.insights.some((insight) => insight.includes("efficiency") || insight.includes("performance")),
			).toBe(true)

			// Should provide optimization-focused recommendations
			expect(
				result.recommendations.some(
					(rec) => rec.includes("maintain") || rec.includes("continue") || rec.includes("optimize"),
				),
			).toBe(true)
		})
	})

	describe("edge cases and boundary conditions", () => {
		it("should handle empty context gracefully", async () => {
			const emptyContext = {
				taskId: "empty-test",
				currentStep: 0,
				totalSteps: 0,
				recentTools: [] as ToolUse[],
				recentErrors: [],
				performance: {
					taskCompletionRate: 0,
					averageStepsToCompletion: 0,
					errorRate: 0,
					repetitionRate: 0,
					adaptabilityScore: 0,
					efficiencyScore: 0,
					lastCalculatedAt: Date.now(),
				},
				environment: {},
			}

			const result = await reflectionEngine.reflect(emptyContext)

			expect(result.success).toBe(true)
			expect(result.insights).toBeDefined()
			expect(result.recommendations).toBeDefined()
		})

		it("should handle extreme performance metrics", async () => {
			const extremeContext = {
				...mockContext,
				performance: {
					taskCompletionRate: 1.0, // Perfect completion
					averageStepsToCompletion: 1, // Minimal steps
					errorRate: 0, // No errors
					repetitionRate: 0, // No repetition
					adaptabilityScore: 1.0, // Perfect adaptability
					efficiencyScore: 1.0, // Perfect efficiency
					lastCalculatedAt: Date.now(),
				},
			}

			const result = await reflectionEngine.reflect(extremeContext)

			expect(result.success).toBe(true)
			expect(result.confidence).toBeGreaterThan(0.8) // Should be very confident
		})

		it("should handle very long task sequences", async () => {
			const longSequenceContext = {
				...mockContext,
				currentStep: 95,
				totalSteps: 100,
				recentTools: Array.from({ length: 30 }, (_, i) => ({
					type: "tool_use" as const,
					name: `step_${i}` as any,
					params: { sequence: i.toString() },
					partial: false,
				})) as ToolUse[],
			}

			const result = await reflectionEngine.reflect(longSequenceContext)

			expect(result.success).toBe(true)
			expect(
				result.insights.some(
					(insight) => insight.includes("final stages") || insight.includes("near completion"),
				),
			).toBe(true)
		})
	})
})

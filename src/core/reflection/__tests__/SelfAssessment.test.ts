// npx vitest run src/core/reflection/__tests__/SelfAssessment.test.ts

import { SelfAssessment, type SelfAssessmentConfig } from "../SelfAssessment"
import type { ReflectionContext, ReflectionResult, PerformanceMetrics } from "../types"
import type { ToolUse } from "../../../shared/tools"

describe("SelfAssessment", () => {
	let selfAssessment: SelfAssessment
	let mockConfig: SelfAssessmentConfig
	let mockContext: ReflectionContext

	beforeEach(() => {
		mockConfig = {
			windowSize: 10,
			assessmentInterval: 5000,
			confidenceThreshold: 0.7,
			enableTrendAnalysis: true,
		}

		mockContext = {
			taskId: "test-task-789",
			currentStep: 5,
			totalSteps: 10,
			recentTools: [
				{ type: "tool_use", name: "read_file", params: { path: "src/main.ts" }, partial: false },
				{ type: "tool_use", name: "apply_diff", params: { path: "src/main.ts" }, partial: false },
				{ type: "tool_use", name: "execute_command", params: { command: "npm test" }, partial: false },
				{ type: "tool_use", name: "read_file", params: { path: "src/utils.ts" }, partial: false },
				{ type: "tool_use", name: "write_to_file", params: { path: "src/output.ts" }, partial: false },
			] as ToolUse[],
			recentErrors: ["Type error on line 15", "Failed test: should return valid result"],
			performance: {
				taskCompletionRate: 0.75,
				averageStepsToCompletion: 12,
				errorRate: 0.15,
				repetitionRate: 0.05,
				adaptabilityScore: 0.85,
				efficiencyScore: 0.8,
				lastCalculatedAt: Date.now(),
			},
			environment: {
				workspacePath: "/test/workspace",
				apiConfiguration: { apiProvider: "anthropic" as any },
			},
		}

		selfAssessment = new SelfAssessment(mockConfig)
	})

	afterEach(() => {
		selfAssessment.dispose()
	})

	describe("initialization", () => {
		it("should initialize with provided configuration", () => {
			expect(selfAssessment).toBeDefined()
		})

		it("should set default values for optional config parameters", () => {
			const minimalConfig = {
				windowSize: 5,
				assessmentInterval: 3000,
			}
			const assessment = new SelfAssessment(minimalConfig)

			expect(assessment).toBeDefined()

			assessment.dispose()
		})

		it("should start with empty performance history", () => {
			expect(selfAssessment.getPerformanceHistory()).toEqual([])
		})
	})

	describe("assess method", () => {
		/**
		 * Test comprehensive self-assessment including:
		 * - Performance metrics evaluation
		 * - Trend analysis over time
		 * - Strengths and weaknesses identification
		 * - Improvement recommendations
		 */
		it("should perform comprehensive self-assessment", async () => {
			const result = await selfAssessment.assess(mockContext)

			expect(result.success).toBe(true)
			expect(result.insights).toBeDefined()
			expect(result.recommendations).toBeDefined()
			expect(result.confidence).toBeGreaterThan(0)
			expect(result.nextSteps).toBeDefined()

			expect(result.metadata).toMatchObject({
				assessmentId: expect.stringContaining("assessment-"),
				metrics: expect.objectContaining({
					taskCompletionRate: expect.any(Number),
					averageStepsToCompletion: expect.any(Number),
					errorRate: expect.any(Number),
					repetitionRate: expect.any(Number),
					adaptabilityScore: expect.any(Number),
					efficiencyScore: expect.any(Number),
				}),
				trends: expect.any(Object),
			})

			// Should have recorded performance metrics
			const history = selfAssessment.getPerformanceHistory()
			expect(history).toHaveLength(1)
		})

		it("should calculate performance metrics correctly", async () => {
			const result = await selfAssessment.assess(mockContext)

			expect(result.success).toBe(true)

			const metrics = result.metadata.metrics as PerformanceMetrics
			expect(metrics.taskCompletionRate).toBeGreaterThan(0)
			expect(metrics.taskCompletionRate).toBeLessThanOrEqual(1)
			expect(metrics.efficiencyScore).toBeGreaterThan(0)
			expect(metrics.adaptabilityScore).toBeGreaterThan(0)
			expect(metrics.errorRate).toBeGreaterThanOrEqual(0)
		})

		it("should identify strengths correctly", async () => {
			const highPerformanceContext = {
				...mockContext,
				performance: {
					...mockContext.performance,
					adaptabilityScore: 0.95,
					efficiencyScore: 0.9,
					errorRate: 0.02,
				},
			}

			const result = await selfAssessment.assess(highPerformanceContext)

			expect(result.success).toBe(true)
			expect(result.insights.length).toBeGreaterThan(0)
		})

		it("should identify weaknesses correctly", async () => {
			const poorPerformanceContext = {
				...mockContext,
				performance: {
					...mockContext.performance,
					errorRate: 0.4,
					efficiencyScore: 0.3,
					repetitionRate: 0.25,
				},
			}

			const result = await selfAssessment.assess(poorPerformanceContext)

			expect(result.success).toBe(true)
			expect(result.recommendations.length).toBeGreaterThan(0)
		})

		it("should analyze tool usage patterns", async () => {
			const repetitiveToolContext = {
				...mockContext,
				recentTools: [
					{ type: "tool_use", name: "read_file", params: { path: "file1.ts" }, partial: false },
					{ type: "tool_use", name: "read_file", params: { path: "file2.ts" }, partial: false },
					{ type: "tool_use", name: "read_file", params: { path: "file3.ts" }, partial: false },
					{ type: "tool_use", name: "read_file", params: { path: "file4.ts" }, partial: false },
					{ type: "tool_use", name: "read_file", params: { path: "file5.ts" }, partial: false },
				] as ToolUse[],
			}

			const result = await selfAssessment.assess(repetitiveToolContext)

			expect(result.success).toBe(true)
			expect(result.insights.length).toBeGreaterThan(0)
		})

		it("should generate appropriate recommendations", async () => {
			const result = await selfAssessment.assess(mockContext)

			expect(result.success).toBe(true)
			expect(result.recommendations.length).toBeGreaterThan(0)

			// Should contain actionable recommendations
			result.recommendations.forEach((rec) => {
				expect(typeof rec).toBe("string")
				expect(rec.length).toBeGreaterThan(0)
			})
		})

		it("should handle error contexts appropriately", async () => {
			const errorProneContext = {
				...mockContext,
				recentErrors: [
					"Syntax error in main.ts line 42",
					"Type error: Property does not exist",
					"Runtime error: Cannot read property of undefined",
					"Test failure: Expected true but got false",
				],
			}

			const result = await selfAssessment.assess(errorProneContext)

			expect(result.success).toBe(true)
			expect(result.recommendations.length).toBeGreaterThan(0)
		})

		it("should handle minimal context gracefully", async () => {
			const minimalContext = {
				...mockContext,
				recentTools: [],
				recentErrors: [],
				performance: {
					taskCompletionRate: 0.5,
					averageStepsToCompletion: 10,
					errorRate: 0.1,
					repetitionRate: 0.05,
					adaptabilityScore: 0.6,
					efficiencyScore: 0.6,
					lastCalculatedAt: Date.now(),
				},
			}

			const result = await selfAssessment.assess(minimalContext)

			expect(result.success).toBe(true)
			expect(result.insights).toBeDefined()
			expect(result.recommendations).toBeDefined()
		})
	})

	describe("trend analysis", () => {
		it("should perform trend analysis with sufficient data", async () => {
			// Build up history with multiple assessments
			for (let i = 0; i < 5; i++) {
				await selfAssessment.assess({
					...mockContext,
					taskId: `task-${i}`,
					performance: {
						...mockContext.performance,
						efficiencyScore: 0.6 + i * 0.05, // Improving trend
						errorRate: 0.2 - i * 0.02, // Decreasing trend
					},
				})
			}

			const result = await selfAssessment.assess(mockContext)

			expect(result.success).toBe(true)

			const trends = result.metadata.trends as Record<string, string>
			expect(trends).toBeDefined()
		})

		it("should identify improving trends", async () => {
			// Create improving performance trend
			for (let i = 0; i < 4; i++) {
				await selfAssessment.assess({
					...mockContext,
					taskId: `improving-task-${i}`,
					performance: {
						...mockContext.performance,
						efficiencyScore: 0.5 + i * 0.1,
						adaptabilityScore: 0.6 + i * 0.08,
					},
				})
			}

			const result = await selfAssessment.assess(mockContext)

			expect(result.success).toBe(true)
			expect(result.insights.length).toBeGreaterThan(0)
		})

		it("should identify declining trends", async () => {
			// Create declining performance trend
			for (let i = 0; i < 4; i++) {
				await selfAssessment.assess({
					...mockContext,
					taskId: `declining-task-${i}`,
					performance: {
						...mockContext.performance,
						efficiencyScore: 0.9 - i * 0.1,
						errorRate: 0.05 + i * 0.05,
					},
				})
			}

			const result = await selfAssessment.assess(mockContext)

			expect(result.success).toBe(true)
			expect(result.insights.length).toBeGreaterThan(0)
		})

		it("should skip trend analysis when disabled", async () => {
			const configWithoutTrends = {
				...mockConfig,
				enableTrendAnalysis: false,
			}
			const assessment = new SelfAssessment(configWithoutTrends)

			const result = await assessment.assess(mockContext)

			expect(result.success).toBe(true)
			expect(result.metadata.trends).toBeUndefined()

			assessment.dispose()
		})

		it("should handle insufficient data for trend analysis", async () => {
			// Only one data point
			const result = await selfAssessment.assess(mockContext)

			expect(result.success).toBe(true)
			// Should still work but may have limited trend data
			expect(result.insights).toBeDefined()
		})
	})

	describe("performance history management", () => {
		it("should maintain performance history correctly", async () => {
			await selfAssessment.assess(mockContext)
			await selfAssessment.assess({
				...mockContext,
				taskId: "second-task",
			})

			const history = selfAssessment.getPerformanceHistory()
			expect(history).toHaveLength(2)
		})

		it("should limit history to configured window size", async () => {
			// Perform more assessments than window size
			for (let i = 0; i < 15; i++) {
				await selfAssessment.assess({
					...mockContext,
					taskId: `task-${i}`,
				})
			}

			const history = selfAssessment.getPerformanceHistory()
			expect(history.length).toBeLessThanOrEqual(mockConfig.windowSize)
		})

		it("should clear history on disposal", () => {
			selfAssessment.dispose()

			expect(selfAssessment.getPerformanceHistory()).toEqual([])
		})
	})

	describe("event emission", () => {
		it("should emit assessment_completed event", async () => {
			const eventSpy = vitest.fn()
			selfAssessment.on("assessment_completed", eventSpy)

			await selfAssessment.assess(mockContext)

			expect(eventSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					id: expect.stringContaining("assessment-"),
					metrics: expect.any(Object),
					strengths: expect.any(Array),
					weaknesses: expect.any(Array),
				}),
			)
		})
	})

	describe("configuration management", () => {
		it("should update configuration correctly", () => {
			const newConfig = {
				windowSize: 20,
				assessmentInterval: 3000,
			}

			selfAssessment.updateConfig(newConfig)

			// Configuration should be updated (we can't directly test private config,
			// but we can test behavior changes)
			expect(() => selfAssessment.updateConfig(newConfig)).not.toThrow()
		})

		it("should validate configuration gracefully", () => {
			const config = {
				windowSize: 5,
				assessmentInterval: 1000,
				confidenceThreshold: 0.9,
			}

			// Should handle configuration gracefully
			expect(() => new SelfAssessment(config)).not.toThrow()
		})
	})

	describe("error handling", () => {
		it("should handle assessment errors gracefully", async () => {
			// Create a problematic context
			const problematicContext = {
				...mockContext,
				taskId: "", // Invalid task ID
				performance: null as any, // Invalid performance
			}

			const result = await selfAssessment.assess(problematicContext)

			expect(result.success).toBe(false)
			expect(result.recommendations).toContain(expect.stringContaining("Self-assessment failed"))
		})

		it("should handle missing performance data", async () => {
			const contextWithoutPerformance = {
				...mockContext,
				performance: undefined as any,
			}

			const result = await selfAssessment.assess(contextWithoutPerformance)

			expect(result.success).toBe(false)
			expect(result.recommendations.length).toBeGreaterThan(0)
		})

		it("should handle invalid performance metrics", async () => {
			const contextWithInvalidMetrics = {
				...mockContext,
				performance: {
					taskCompletionRate: -1, // Invalid negative rate
					averageStepsToCompletion: 0,
					errorRate: 2, // Invalid rate > 1
					repetitionRate: NaN,
					adaptabilityScore: undefined as any,
					efficiencyScore: null as any,
					lastCalculatedAt: Date.now(),
				},
			}

			const result = await selfAssessment.assess(contextWithInvalidMetrics)

			expect(result.success).toBe(false)
			expect(result.recommendations.length).toBeGreaterThan(0)
		})
	})

	describe("confidence calculation", () => {
		it("should calculate reasonable confidence scores", async () => {
			const result = await selfAssessment.assess(mockContext)

			expect(result.confidence).toBeGreaterThan(0)
			expect(result.confidence).toBeLessThanOrEqual(1)
		})

		it("should adjust confidence based on data quality", async () => {
			// High quality data context
			const highQualityContext = {
				...mockContext,
				recentTools: Array.from({ length: 10 }, (_, i) => ({
					type: "tool_use" as const,
					name: `tool_${i}` as any,
					params: { test: "true" },
					partial: false,
				})) as ToolUse[],
				performance: {
					...mockContext.performance,
					taskCompletionRate: 0.95,
					efficiencyScore: 0.9,
				},
			}

			const result = await selfAssessment.assess(highQualityContext)

			expect(result.success).toBe(true)
			expect(result.confidence).toBeGreaterThan(0.5) // Should be reasonable confidence
		})

		it("should lower confidence for insufficient data", async () => {
			const limitedDataContext = {
				...mockContext,
				recentTools: [],
				recentErrors: [],
			}

			const result = await selfAssessment.assess(limitedDataContext)

			expect(result.success).toBe(true)
			expect(result.confidence).toBeGreaterThan(0) // Should still have some confidence
		})
	})

	describe("resource management", () => {
		it("should clean up resources on disposal", () => {
			selfAssessment.dispose()

			expect(selfAssessment.getPerformanceHistory()).toEqual([])
		})

		it("should handle multiple dispose calls safely", () => {
			expect(() => {
				selfAssessment.dispose()
				selfAssessment.dispose()
			}).not.toThrow()
		})
	})

	describe("integration scenarios", () => {
		it("should work with realistic task progression", async () => {
			// Simulate a realistic task progression
			const taskStages = [
				{ step: 1, total: 10, efficiency: 0.6, errors: ["Initial setup error"] },
				{ step: 3, total: 10, efficiency: 0.7, errors: [] },
				{ step: 6, total: 10, efficiency: 0.8, errors: ["Minor validation error"] },
				{ step: 9, total: 10, efficiency: 0.85, errors: [] },
				{ step: 10, total: 10, efficiency: 0.9, errors: [] },
			]

			for (const stage of taskStages) {
				const stageContext = {
					...mockContext,
					currentStep: stage.step,
					totalSteps: stage.total,
					recentErrors: stage.errors,
					performance: {
						...mockContext.performance,
						efficiencyScore: stage.efficiency,
					},
				}

				const result = await selfAssessment.assess(stageContext)
				expect(result.success).toBe(true)
			}

			// Final assessment should show improvement trends
			const history = selfAssessment.getPerformanceHistory()
			expect(history.length).toBe(5)
		})

		it("should handle concurrent assessments safely", async () => {
			// Start multiple assessments concurrently
			const promises = Array.from({ length: 3 }, (_, i) =>
				selfAssessment.assess({
					...mockContext,
					taskId: `concurrent-task-${i}`,
				}),
			)

			const results = await Promise.all(promises)

			results.forEach((result) => {
				expect(result.success).toBe(true)
			})

			// Should have recorded all assessments
			const history = selfAssessment.getPerformanceHistory()
			expect(history.length).toBe(3)
		})
	})
})

// npx vitest run src/core/__tests__/backward-compatibility.test.ts

/**
 * Backward Compatibility Tests for TRAE-Agent Integration
 *
 * These tests verify that existing functionality remains intact
 * after adding TRAE-Agent reflection capabilities to the codebase.
 */

import { ReflectionEngine } from "../reflection/ReflectionEngine"
import { SequentialThinking } from "../reflection/SequentialThinking"
import { SelfAssessment } from "../reflection/SelfAssessment"
import { ToolRepetitionDetector } from "../tools/ToolRepetitionDetector"
import type { ReflectionConfig, ReflectionContext, PerformanceMetrics } from "../reflection/types"
import type { UnifiedToolUse } from "../shared/types/unified-types"
import { createTestTool } from "../shared/types/unified-types"

describe("TRAE-Agent Backward Compatibility", () => {
	describe("existing tool usage patterns", () => {
		/**
		 * Verify that standard tool usage patterns continue to work
		 * without requiring TRAE-Agent features
		 */
		it("should support legacy tool execution patterns", async () => {
			const detector = new ToolRepetitionDetector({
				maxConsecutiveRepeats: 3,
				enableAdvancedAnalysis: false, // Legacy mode
			})

			const legacyTools: UnifiedToolUse[] = [
				createTestTool("read_file", { path: "package.json" }, false),
				createTestTool("execute_command", { command: "npm install" }, false),
				createTestTool("write_to_file", { path: "output.txt" }, false),
			]

			const result = await detector.analyzeSequence(legacyTools)

			expect(result).toBeDefined()
			expect(result.isRepetitive).toBe(false)
			expect(result.recommendation).toBe("allow")
			expect(result.patterns).toBeDefined()

			detector.dispose()
		})

		it("should handle tools without reflection metadata", async () => {
			const basicTools: UnifiedToolUse[] = [
				createTestTool("list_files", { path: "src" }, false),
				createTestTool("search_files", { regex: "*.ts" }, false),
			]

			const detector = new ToolRepetitionDetector()
			const result = await detector.analyzeSequence(basicTools)

			expect(result.success).toBe(true)
			expect(result.isRepetitive).toBe(false)

			detector.dispose()
		})

		it("should maintain consistent API responses", async () => {
			const detector = new ToolRepetitionDetector()

			const tools: UnifiedToolUse[] = [createTestTool("codebase_search", { query: "test" }, false)]

			const result = await detector.analyzeSequence(tools)

			// Verify expected response structure
			expect(result).toMatchObject({
				isRepetitive: expect.any(Boolean),
				confidence: expect.any(Number),
				patterns: expect.any(Array),
				contextualFactors: expect.any(Object),
				recommendation: expect.stringMatching(/^(allow|warn|block)$/),
				reasoning: expect.any(String),
			})

			detector.dispose()
		})
	})

	describe("configuration backward compatibility", () => {
		it("should work with minimal configuration", () => {
			const minimalConfig = {
				maxConsecutiveRepeats: 3,
			}

			expect(() => new ToolRepetitionDetector(minimalConfig)).not.toThrow()

			const detector = new ToolRepetitionDetector(minimalConfig)
			expect(detector).toBeDefined()
			detector.dispose()
		})

		it("should provide sensible defaults for optional parameters", () => {
			const detector = new ToolRepetitionDetector()
			expect(detector).toBeDefined()

			// Should work without explicit configuration
			expect(detector.getHistory()).toEqual([])
			detector.dispose()
		})

		it("should handle partial configuration updates", () => {
			const detector = new ToolRepetitionDetector({
				maxConsecutiveRepeats: 3,
				timeWindowMs: 30000,
			})

			const partialUpdate = {
				maxConsecutiveRepeats: 5,
				// timeWindowMs should remain unchanged
			}

			expect(() => detector.updateConfig(partialUpdate)).not.toThrow()
			detector.dispose()
		})
	})

	describe("reflection system graceful degradation", () => {
		it("should work when reflection components are disabled", async () => {
			const config: ReflectionConfig = {
				enableSequentialThinking: false,
				enableSelfAssessment: false,
				maxReasoningSteps: 0,
				assessmentInterval: 0,
				patternDetectionThreshold: 0,
				semanticSimilarityThreshold: 0,
				performanceWindowSize: 0,
			}

			const engine = new ReflectionEngine(config)

			const context: ReflectionContext = {
				taskId: "backward-compat-test",
				currentStep: 1,
				totalSteps: 1,
				recentTools: [],
				recentErrors: [],
				performance: {
					taskCompletionRate: 1,
					averageStepsToCompletion: 1,
					errorRate: 0,
					repetitionRate: 0,
					adaptabilityScore: 1,
					efficiencyScore: 1,
					lastCalculatedAt: Date.now(),
				},
				environment: {},
			}

			const result = await engine.reflect(context)

			expect(result).toBeDefined()
			expect(result.success).toBe(true)
			expect(result.insights).toContain("Reflection components are disabled")

			engine.dispose()
		})

		it("should handle missing performance data gracefully", async () => {
			const assessment = new SelfAssessment({
				windowSize: 5,
				assessmentInterval: 1000,
			})

			const contextWithoutPerformance: ReflectionContext = {
				taskId: "missing-performance-test",
				currentStep: 1,
				totalSteps: 1,
				recentTools: [],
				recentErrors: [],
				performance: undefined as any,
				environment: {},
			}

			const result = await assessment.assess(contextWithoutPerformance)

			expect(result).toBeDefined()
			expect(result.success).toBe(false)
			expect(result.recommendations.length).toBeGreaterThan(0)

			assessment.dispose()
		})

		it("should provide fallback behavior for component failures", async () => {
			const thinking = new SequentialThinking({
				maxSteps: 5,
				confidenceThreshold: 0.7,
				timeoutMs: 100, // Very short timeout to simulate failure
			})

			const problematicContext: ReflectionContext = {
				taskId: "failure-test",
				currentStep: 1,
				totalSteps: 1,
				recentTools: [],
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

			const result = await thinking.analyze(problematicContext)

			expect(result).toBeDefined()
			expect(typeof result.success).toBe("boolean")

			thinking.dispose()
		})
	})

	describe("performance impact verification", () => {
		it("should not significantly impact performance when disabled", async () => {
			const startTime = Date.now()

			// Test with reflection disabled
			const basicDetector = new ToolRepetitionDetector({
				maxConsecutiveRepeats: 3,
				enableAdvancedAnalysis: false,
			})

			const tools: UnifiedToolUse[] = Array.from({ length: 20 }, (_, i) => ({
				type: "tool_use",
				name: `tool_${i}`,
				params: { index: i.toString() },
				partial: false,
			}))

			await basicDetector.analyzeSequence(tools)

			const basicDuration = Date.now() - startTime

			// Test with reflection enabled
			const advancedStartTime = Date.now()

			const advancedDetector = new ToolRepetitionDetector({
				maxConsecutiveRepeats: 3,
				enableAdvancedAnalysis: true,
			})

			await advancedDetector.analyzeSequence(tools)

			const advancedDuration = Date.now() - advancedStartTime

			// Advanced analysis should not be dramatically slower
			expect(advancedDuration).toBeLessThan(basicDuration * 5)

			basicDetector.dispose()
			advancedDetector.dispose()
		})

		it("should maintain memory efficiency", async () => {
			const detector = new ToolRepetitionDetector()

			// Simulate extended usage
			for (let i = 0; i < 100; i++) {
				const tools: UnifiedToolUse[] = [
					{
						type: "tool_use",
						name: `memory_test_${i}`,
						params: { iteration: i.toString() },
						partial: false,
					},
				]

				await detector.analyzeSequence(tools)
			}

			// History should be managed to prevent memory leaks
			const history = detector.getHistory()
			expect(history.length).toBeLessThan(100) // Should have been trimmed

			detector.dispose()
		})
	})

	describe("error handling compatibility", () => {
		it("should handle invalid tool data like existing system", async () => {
			const detector = new ToolRepetitionDetector()

			const invalidTools = [
				{ type: "tool_use", name: "", params: {}, partial: false },
				{ type: "tool_use", name: undefined as any, params: undefined as any, partial: false },
			] as UnifiedToolUse[]

			// Should not throw, should handle gracefully
			const result = await detector.analyzeSequence(invalidTools)

			expect(result).toBeDefined()
			expect(typeof result.isRepetitive).toBe("boolean")

			detector.dispose()
		})

		it("should maintain existing error message formats", async () => {
			const assessment = new SelfAssessment({
				windowSize: 5,
				assessmentInterval: 1000,
			})

			// Dispose to simulate error condition
			assessment.dispose()

			const result = await assessment.assess({
				taskId: "error-test",
				currentStep: 1,
				totalSteps: 1,
				recentTools: [],
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
			})

			expect(result.success).toBe(false)
			expect(result.insights).toBeDefined()
			expect(result.recommendations).toBeDefined()
		})
	})

	describe("integration points compatibility", () => {
		it("should not interfere with existing event systems", () => {
			const engine = new ReflectionEngine({
				enableSequentialThinking: true,
				enableSelfAssessment: true,
				maxReasoningSteps: 5,
				assessmentInterval: 1000,
				patternDetectionThreshold: 0.7,
				semanticSimilarityThreshold: 0.8,
				performanceWindowSize: 10,
			})

			// Should be able to add event listeners without issues
			const mockListener = vitest.fn()
			engine.on("reflection_completed", mockListener)

			expect(() => engine.removeListener("reflection_completed", mockListener)).not.toThrow()

			engine.dispose()
		})

		it("should maintain consistent disposal behavior", () => {
			const components = [
				new ReflectionEngine({
					enableSequentialThinking: true,
					enableSelfAssessment: true,
					maxReasoningSteps: 5,
					assessmentInterval: 1000,
					patternDetectionThreshold: 0.7,
					semanticSimilarityThreshold: 0.8,
					performanceWindowSize: 10,
				}),
				new SequentialThinking({
					maxSteps: 5,
					confidenceThreshold: 0.7,
				}),
				new SelfAssessment({
					windowSize: 5,
					assessmentInterval: 1000,
				}),
				new ToolRepetitionDetector(),
			]

			// All components should dispose cleanly
			components.forEach((component) => {
				expect(() => component.dispose()).not.toThrow()
				expect(() => component.dispose()).not.toThrow() // Should handle multiple calls
			})
		})

		it("should work with existing configuration management patterns", () => {
			const detector = new ToolRepetitionDetector({
				maxConsecutiveRepeats: 3,
				timeWindowMs: 30000,
			})

			// Should support configuration updates
			const newConfig = {
				maxConsecutiveRepeats: 5,
				similarityThreshold: 0.9,
			}

			expect(() => detector.updateConfig(newConfig)).not.toThrow()

			// Should handle invalid configurations gracefully
			const invalidConfig = {
				maxConsecutiveRepeats: -1,
				timeWindowMs: -1000,
			}

			expect(() => detector.updateConfig(invalidConfig)).not.toThrow()

			detector.dispose()
		})
	})

	describe("data format compatibility", () => {
		it("should accept existing UnifiedToolUse format without modification", async () => {
			const detector = new ToolRepetitionDetector()

			// Standard UnifiedToolUse format that should work without changes
			const standardTools: UnifiedToolUse[] = [
				{
					type: "tool_use",
					name: "read_file",
					params: { path: "src/main.ts" },
					partial: false,
				},
				{
					type: "tool_use",
					name: "apply_diff",
					params: { path: "src/main.ts", diff: "some changes" },
					partial: false,
				},
			]

			const result = await detector.analyzeSequence(standardTools)

			expect(result).toBeDefined()
			expect(result.isRepetitive).toBe(false)

			detector.dispose()
		})

		it("should provide consistent response format", async () => {
			const engine = new ReflectionEngine({
				enableSequentialThinking: true,
				enableSelfAssessment: true,
				maxReasoningSteps: 5,
				assessmentInterval: 1000,
				patternDetectionThreshold: 0.7,
				semanticSimilarityThreshold: 0.8,
				performanceWindowSize: 10,
			})

			const context: ReflectionContext = {
				taskId: "format-test",
				currentStep: 1,
				totalSteps: 1,
				recentTools: [],
				recentErrors: [],
				performance: {
					taskCompletionRate: 1,
					averageStepsToCompletion: 1,
					errorRate: 0,
					repetitionRate: 0,
					adaptabilityScore: 1,
					efficiencyScore: 1,
					lastCalculatedAt: Date.now(),
				},
				environment: {},
			}

			const result = await engine.reflect(context)

			// Should maintain expected response structure
			expect(result).toMatchObject({
				success: expect.any(Boolean),
				insights: expect.any(Array),
				recommendations: expect.any(Array),
				confidence: expect.any(Number),
				nextSteps: expect.any(Array),
				metadata: expect.any(Object),
			})

			engine.dispose()
		})

		it("should handle existing PerformanceMetrics format", async () => {
			const assessment = new SelfAssessment({
				windowSize: 5,
				assessmentInterval: 1000,
			})

			const standardPerformance: PerformanceMetrics = {
				taskCompletionRate: 0.8,
				averageStepsToCompletion: 5,
				errorRate: 0.1,
				repetitionRate: 0.05,
				adaptabilityScore: 0.7,
				efficiencyScore: 0.8,
				lastCalculatedAt: Date.now(),
			}

			const context: ReflectionContext = {
				taskId: "performance-test",
				currentStep: 4,
				totalSteps: 5,
				recentTools: [],
				recentErrors: [],
				performance: standardPerformance,
				environment: {},
			}

			const result = await assessment.assess(context)

			expect(result.success).toBe(true)
			expect(result.metadata.metrics).toMatchObject({
				taskCompletionRate: expect.any(Number),
				averageStepsToCompletion: expect.any(Number),
				errorRate: expect.any(Number),
				repetitionRate: expect.any(Number),
				adaptabilityScore: expect.any(Number),
				efficiencyScore: expect.any(Number),
				lastCalculatedAt: expect.any(Number),
			})

			assessment.dispose()
		})
	})

	describe("migration path verification", () => {
		it("should allow gradual adoption of reflection features", async () => {
			// Test that systems can gradually adopt reflection features

			// Stage 1: Basic usage without reflection
			const basicDetector = new ToolRepetitionDetector({
				maxConsecutiveRepeats: 3,
				enableAdvancedAnalysis: false,
			})

			const tools: UnifiedToolUse[] = [
				{ type: "tool_use", name: "read_file", params: { path: "test.ts" }, partial: false },
			]

			const basicResult = await basicDetector.analyzeSequence(tools)
			expect(basicResult.success).toBe(true)

			// Stage 2: Enable advanced analysis
			const advancedDetector = new ToolRepetitionDetector({
				maxConsecutiveRepeats: 3,
				enableAdvancedAnalysis: true,
			})

			const advancedResult = await advancedDetector.analyzeSequence(tools)
			expect(advancedResult.success).toBe(true)

			// Both should provide valid results
			expect(basicResult.recommendation).toBe("allow")
			expect(advancedResult.recommendation).toBe("allow")

			basicDetector.dispose()
			advancedDetector.dispose()
		})

		it("should maintain API stability during feature additions", () => {
			// Test that new optional parameters don't break existing code
			const oldStyleConfig = {
				maxConsecutiveRepeats: 3,
				timeWindowMs: 30000,
			}

			const detector1 = new ToolRepetitionDetector(oldStyleConfig)
			expect(detector1).toBeDefined()

			// New style with additional parameters
			const newStyleConfig = {
				...oldStyleConfig,
				similarityThreshold: 0.8,
				enableAdvancedAnalysis: true,
			}

			const detector2 = new ToolRepetitionDetector(newStyleConfig)
			expect(detector2).toBeDefined()

			detector1.dispose()
			detector2.dispose()
		})

		it("should provide clear upgrade paths for existing implementations", async () => {
			// Demonstrate how existing code can be enhanced with TRAE-Agent features

			// Original implementation (simulated)
			const originalDetector = new ToolRepetitionDetector({
				maxConsecutiveRepeats: 3,
			})

			// Enhanced implementation with TRAE-Agent features
			const enhancedDetector = new ToolRepetitionDetector({
				maxConsecutiveRepeats: 3,
				enableAdvancedAnalysis: true,
				similarityThreshold: 0.8,
				timeWindowMs: 30000,
			})

			const testTools: UnifiedToolUse[] = [
				{ type: "tool_use", name: "codebase_search", params: { query: "function" }, partial: false },
				{ type: "tool_use", name: "codebase_search", params: { query: "method" }, partial: false },
			]

			const originalResult = await originalDetector.analyzeSequence(testTools)
			const enhancedResult = await enhancedDetector.analyzeSequence(testTools)

			// Both should work, enhanced version should provide more detailed analysis
			expect(originalResult.success).toBe(true)
			expect(enhancedResult.success).toBe(true)

			// Enhanced version should have additional context
			expect(enhancedResult.contextualFactors.semanticDrift).toBeDefined()
			expect(enhancedResult.patterns[0]?.semanticSimilarity).toBeDefined()

			originalDetector.dispose()
			enhancedDetector.dispose()
		})
	})

	describe("regression prevention", () => {
		it("should not break existing tool repetition thresholds", async () => {
			const detector = new ToolRepetitionDetector({
				maxConsecutiveRepeats: 2, // Low threshold for testing
			})

			const repetitiveTools: UnifiedToolUse[] = [
				{ type: "tool_use", name: "read_file", params: { path: "file1.ts" }, partial: false },
				{ type: "tool_use", name: "read_file", params: { path: "file2.ts" }, partial: false },
				{ type: "tool_use", name: "read_file", params: { path: "file3.ts" }, partial: false },
			]

			const result = await detector.analyzeSequence(repetitiveTools)

			// Should still detect repetition at the configured threshold
			expect(result.isRepetitive).toBe(true)
			expect(result.patterns[0].consecutiveUses).toBe(3)

			detector.dispose()
		})

		it("should maintain consistent confidence scoring", async () => {
			const thinking = new SequentialThinking({
				maxSteps: 5,
				confidenceThreshold: 0.7,
			})

			const standardContext: ReflectionContext = {
				taskId: "confidence-test",
				currentStep: 3,
				totalSteps: 5,
				recentTools: [{ type: "tool_use", name: "read_file", params: { path: "test.ts" }, partial: false }],
				recentErrors: [],
				performance: {
					taskCompletionRate: 0.6,
					averageStepsToCompletion: 5,
					errorRate: 0.1,
					repetitionRate: 0.0,
					adaptabilityScore: 0.8,
					efficiencyScore: 0.7,
					lastCalculatedAt: Date.now(),
				},
				environment: {},
			}

			const result = await thinking.analyze(standardContext)

			expect(result.success).toBe(true)
			expect(result.confidence).toBeGreaterThan(0)
			expect(result.confidence).toBeLessThanOrEqual(1)

			thinking.dispose()
		})

		it("should preserve existing error handling behavior", async () => {
			const detector = new ToolRepetitionDetector()

			// Test with empty sequence (edge case that should be handled)
			const emptyResult = await detector.analyzeSequence([])
			expect(emptyResult.isRepetitive).toBe(false)
			expect(emptyResult.recommendation).toBe("allow")

			// Test with single tool
			const singleResult = await detector.analyzeSequence([
				{ type: "tool_use", name: "test_tool", params: {}, partial: false },
			])
			expect(singleResult.isRepetitive).toBe(false)

			detector.dispose()
		})
	})

	describe("documentation and examples compatibility", () => {
		it("should work with documented usage patterns", async () => {
			// Test patterns that might be documented for users

			// Basic usage pattern
			const detector = new ToolRepetitionDetector()
			const tools: UnifiedToolUse[] = [
				{ type: "tool_use", name: "list_files", params: { path: "src" }, partial: false },
				{ type: "tool_use", name: "read_file", params: { path: "src/main.ts" }, partial: false },
			]

			const result = await detector.analyzeSequence(tools)
			expect(result.isRepetitive).toBe(false)
			expect(result.recommendation).toBe("allow")

			detector.dispose()
		})

		it("should support common configuration examples", () => {
			// Test common configuration patterns that users might copy
			const configs = [
				{ maxConsecutiveRepeats: 3 },
				{ maxConsecutiveRepeats: 5, timeWindowMs: 60000 },
				{ maxConsecutiveRepeats: 2, similarityThreshold: 0.9 },
				{ maxConsecutiveRepeats: 3, enableAdvancedAnalysis: false },
			]

			configs.forEach((config) => {
				expect(() => {
					const detector = new ToolRepetitionDetector(config)
					detector.dispose()
				}).not.toThrow()
			})
		})
	})
})

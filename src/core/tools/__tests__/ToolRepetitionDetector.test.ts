// npx vitest run src/core/tools/__tests__/ToolRepetitionDetector.test.ts

import { ToolRepetitionDetector } from "../ToolRepetitionDetector"
import type { RepetitionPattern, RepetitionAnalysis } from "../../reflection/types"
import type { UnifiedToolUse } from "../../shared/types/unified-types"
import { createTestTool } from "../../shared/types/unified-types"

describe("ToolRepetitionDetector", () => {
	let detector: ToolRepetitionDetector
	let mockToolUses: UnifiedToolUse[]

	beforeEach(() => {
		detector = new ToolRepetitionDetector({
			maxConsecutiveRepeats: 3,
			timeWindowMs: 30000,
			similarityThreshold: 0.8,
			enableAdvancedAnalysis: true,
		})

		mockToolUses = [
			createTestTool("read_file", { path: "src/main.ts" }),
			createTestTool("apply_diff", { path: "src/main.ts" }),
			createTestTool("execute_command", { command: "npm test" }),
		]
	})

	afterEach(() => {
		detector.dispose()
	})

	describe("initialization", () => {
		it("should initialize with default configuration", () => {
			const defaultDetector = new ToolRepetitionDetector()
			expect(defaultDetector).toBeDefined()
			defaultDetector.dispose()
		})

		it("should initialize with custom configuration", () => {
			expect(detector).toBeDefined()
		})

		it("should start with empty history", () => {
			expect(detector.getHistory()).toEqual([])
		})
	})

	describe("basic repetition detection", () => {
		it("should detect no repetition for diverse tools", async () => {
			const result = await detector.analyzeSequence(mockToolUses)

			expect(result.isRepetitive).toBe(false)
			expect(result.confidence).toBeGreaterThan(0)
			expect(result.recommendation).toBe("allow")
		})

		it("should detect simple consecutive repetitions", async () => {
			const repetitiveTools = [
				{ type: "tool_use" as const, name: "read_file", params: { path: "file1.ts" }, partial: false },
				{ type: "tool_use" as const, name: "read_file", params: { path: "file2.ts" }, partial: false },
				{ type: "tool_use" as const, name: "read_file", params: { path: "file3.ts" }, partial: false },
				{ type: "tool_use" as const, name: "read_file", params: { path: "file4.ts" }, partial: false },
			]

			const result = await detector.analyzeSequence(repetitiveTools)

			expect(result.isRepetitive).toBe(true)
			expect(result.patterns.length).toBeGreaterThan(0)
			expect(result.patterns[0].toolName).toBe("read_file")
			expect(result.patterns[0].consecutiveUses).toBe(4)
		})

		it("should respect consecutive repeat threshold", async () => {
			const borderlineTools = [
				{ type: "tool_use" as const, name: "search_files", params: { regex: "test1" }, partial: false },
				{ type: "tool_use" as const, name: "search_files", params: { regex: "test2" }, partial: false },
				{ type: "tool_use" as const, name: "search_files", params: { regex: "test3" }, partial: false },
			]

			const result = await detector.analyzeSequence(borderlineTools)

			// Should be at threshold (3 consecutive = maxConsecutiveRepeats)
			expect(result.isRepetitive).toBe(true)
			expect(result.recommendation).toBe("warn")
		})

		it("should handle single tool use", async () => {
			const singleTool = [mockToolUses[0]]

			const result = await detector.analyzeSequence(singleTool)

			expect(result.isRepetitive).toBe(false)
			expect(result.patterns).toEqual([])
		})
	})

	describe("TRAE-Agent enhanced analysis", () => {
		/**
		 * Test advanced pattern detection including semantic similarity,
		 * contextual factors, and multi-dimensional analysis
		 */
		it("should perform semantic similarity analysis", async () => {
			const semanticallySimilarTools = [
				{ type: "tool_use" as const, name: "read_file", params: { path: "src/auth/login.ts" }, partial: false },
				{
					type: "tool_use" as const,
					name: "read_file",
					params: { path: "src/auth/register.ts" },
					partial: false,
				},
				{
					type: "tool_use" as const,
					name: "read_file",
					params: { path: "src/auth/logout.ts" },
					partial: false,
				},
				{
					type: "tool_use" as const,
					name: "read_file",
					params: { path: "src/auth/validate.ts" },
					partial: false,
				},
			]

			const result = await detector.analyzeSequence(semanticallySimilarTools)

			expect(result.isRepetitive).toBe(true)
			expect(result.patterns[0].semanticSimilarity).toBeGreaterThan(0.7)
			expect(result.contextualFactors.semanticDrift).toBeLessThan(0.3)
		})

		it("should analyze parameter variation patterns", async () => {
			const varyingParameterTools = [
				{
					type: "tool_use" as const,
					name: "apply_diff",
					params: { path: "file1.ts", diff: "change1" },
					partial: false,
				},
				{
					type: "tool_use" as const,
					name: "apply_diff",
					params: { path: "file2.ts", diff: "change2" },
					partial: false,
				},
				{
					type: "tool_use" as const,
					name: "apply_diff",
					params: { path: "file3.ts", diff: "change3" },
					partial: false,
				},
			]

			const result = await detector.analyzeSequence(varyingParameterTools)

			expect(result.contextualFactors.parameterVariation).toBeGreaterThan(0)
			expect(result.patterns[0].parameters).toHaveLength(3)
		})

		it("should detect cyclic patterns", async () => {
			const cyclicTools = [
				{ type: "tool_use" as const, name: "read_file", params: { path: "test.ts" }, partial: false },
				{ type: "tool_use" as const, name: "apply_diff", params: { path: "test.ts" }, partial: false },
				{ type: "tool_use" as const, name: "execute_command", params: { command: "npm test" }, partial: false },
				{ type: "tool_use" as const, name: "read_file", params: { path: "test.ts" }, partial: false },
				{ type: "tool_use" as const, name: "apply_diff", params: { path: "test.ts" }, partial: false },
				{ type: "tool_use" as const, name: "execute_command", params: { command: "npm test" }, partial: false },
			]

			const result = await detector.analyzeSequence(cyclicTools)

			expect(result.isRepetitive).toBe(true)
			expect(result.reasoning).toContain("cyclic")
		})

		it("should calculate contextual factors correctly", async () => {
			const timeSpreadTools = [
				{ type: "tool_use" as const, name: "codebase_search", params: { query: "function1" }, partial: false },
				{ type: "tool_use" as const, name: "codebase_search", params: { query: "function2" }, partial: false },
				{ type: "tool_use" as const, name: "codebase_search", params: { query: "function3" }, partial: false },
			]

			const result = await detector.analyzeSequence(timeSpreadTools)

			expect(result.contextualFactors).toMatchObject({
				timeSpan: expect.any(Number),
				parameterVariation: expect.any(Number),
				semanticDrift: expect.any(Number),
			})
		})
	})

	describe("recommendation system", () => {
		it('should recommend "allow" for non-repetitive patterns', async () => {
			const result = await detector.analyzeSequence(mockToolUses)

			expect(result.recommendation).toBe("allow")
			expect(result.reasoning).toContain("No significant repetition detected")
		})

		it('should recommend "warn" for moderate repetition', async () => {
			const moderateRepetition = [
				{ type: "tool_use" as const, name: "list_files", params: { path: "src" }, partial: false },
				{ type: "tool_use" as const, name: "list_files", params: { path: "lib" }, partial: false },
				{ type: "tool_use" as const, name: "list_files", params: { path: "test" }, partial: false },
			]

			const result = await detector.analyzeSequence(moderateRepetition)

			expect(result.recommendation).toBe("warn")
			expect(result.reasoning).toContain("Moderate repetition detected")
		})

		it('should recommend "block" for excessive repetition', async () => {
			const excessiveRepetition = Array.from({ length: 8 }, (_, i) => ({
				type: "tool_use" as const,
				name: "read_file",
				params: { path: `file${i}.ts` },
				partial: false,
			}))

			const result = await detector.analyzeSequence(excessiveRepetition)

			expect(result.recommendation).toBe("block")
			expect(result.reasoning).toContain("Excessive repetition detected")
		})

		it("should provide detailed reasoning for recommendations", async () => {
			const complexPattern = [
				{ type: "tool_use" as const, name: "search_files", params: { regex: "pattern1" }, partial: false },
				{ type: "tool_use" as const, name: "search_files", params: { regex: "pattern2" }, partial: false },
				{ type: "tool_use" as const, name: "search_files", params: { regex: "pattern3" }, partial: false },
				{ type: "tool_use" as const, name: "search_files", params: { regex: "pattern4" }, partial: false },
				{ type: "tool_use" as const, name: "search_files", params: { regex: "pattern5" }, partial: false },
			]

			const result = await detector.analyzeSequence(complexPattern)

			expect(result.reasoning).toBeDefined()
			expect(result.reasoning.length).toBeGreaterThan(0)
			expect(typeof result.reasoning).toBe("string")
		})
	})

	describe("history management", () => {
		it("should add tools to history", async () => {
			await detector.analyzeSequence(mockToolUses)

			const history = detector.getHistory()
			expect(history.length).toBeGreaterThan(0)
		})

		it("should maintain history window size", async () => {
			// Add many tool sequences
			for (let i = 0; i < 20; i++) {
				const tools = [
					{ type: "tool_use" as const, name: `tool_${i}`, params: { index: i.toString() }, partial: false },
				]
				await detector.analyzeSequence(tools)
			}

			const history = detector.getHistory()
			expect(history.length).toBeLessThanOrEqual(50) // Default history limit
		})

		it("should clear history on disposal", () => {
			detector.dispose()

			expect(detector.getHistory()).toEqual([])
		})
	})

	describe("configuration management", () => {
		it("should update configuration correctly", () => {
			const newConfig = {
				maxConsecutiveRepeats: 5,
				timeWindowMs: 60000,
				similarityThreshold: 0.9,
			}

			detector.updateConfig(newConfig)

			// Configuration should be updated (we can't directly test private config,
			// but we can test behavior changes)
			expect(() => detector.updateConfig(newConfig)).not.toThrow()
		})

		it("should handle invalid configuration gracefully", () => {
			const invalidConfig = {
				maxConsecutiveRepeats: -1,
				timeWindowMs: -5000,
				similarityThreshold: 1.5,
			}

			expect(() => detector.updateConfig(invalidConfig)).not.toThrow()
		})
	})

	describe("performance optimization", () => {
		it("should handle large tool sequences efficiently", async () => {
			const largeSequence = Array.from({ length: 100 }, (_, i) => ({
				type: "tool_use" as const,
				name: `tool_${i % 10}`,
				params: { index: i.toString() },
				partial: false,
			}))

			const startTime = Date.now()
			const result = await detector.analyzeSequence(largeSequence)
			const duration = Date.now() - startTime

			expect(result).toBeDefined()
			expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
		})

		it("should handle concurrent analysis requests", async () => {
			const sequences = Array.from({ length: 5 }, (_, i) => [
				{
					type: "tool_use" as const,
					name: `concurrent_tool_${i}`,
					params: { id: i.toString() },
					partial: false,
				},
			])

			const promises = sequences.map((seq) => detector.analyzeSequence(seq))
			const results = await Promise.all(promises)

			expect(results).toHaveLength(5)
			results.forEach((result) => {
				expect(result).toBeDefined()
				expect(typeof result.isRepetitive).toBe("boolean")
			})
		})
	})

	describe("error handling", () => {
		it("should handle empty tool sequences", async () => {
			const result = await detector.analyzeSequence([])

			expect(result).toBeDefined()
			expect(result.isRepetitive).toBe(false)
			expect(result.patterns).toEqual([])
			expect(result.recommendation).toBe("allow")
		})

		it("should handle malformed tool data gracefully", async () => {
			const malformedTools = [
				{ type: "tool_use" as const, name: "", params: {}, partial: false },
				{ type: "tool_use" as const, name: null as any, params: null as any, partial: false },
			]

			const result = await detector.analyzeSequence(malformedTools)

			expect(result).toBeDefined()
			expect(typeof result.isRepetitive).toBe("boolean")
		})

		it("should recover from analysis errors", async () => {
			// Create a scenario that might cause analysis issues
			const problematicTools: UnifiedToolUse[] = [createTestTool("test_tool", { circular: {} })]

			// Add circular reference to params after creation
			const circularRef = { self: problematicTools }
			;(problematicTools[0].params as any).circular = circularRef

			const result = await detector.analyzeSequence(problematicTools)

			expect(result).toBeDefined()
			expect(typeof result.isRepetitive).toBe("boolean")
		})

		it("should handle analysis timeouts gracefully", async () => {
			// Create a detector with very short timeout for testing
			const timeoutDetector = new ToolRepetitionDetector({
				maxConsecutiveRepeats: 3,
				timeWindowMs: 1, // Very short timeout
				similarityThreshold: 0.8,
				enableAdvancedAnalysis: true,
			})

			const result = await timeoutDetector.analyzeSequence(mockToolUses)

			expect(result).toBeDefined()
			expect(typeof result.isRepetitive).toBe("boolean")

			timeoutDetector.dispose()
		})
	})

	describe("integration with reflection system", () => {
		/**
		 * Test integration with TRAE-Agent reflection components
		 */
		it("should provide analysis compatible with reflection context", async () => {
			const reflectionCompatibleTools = [
				{
					type: "tool_use" as const,
					name: "codebase_search",
					params: { query: "authentication" },
					partial: false,
				},
				{ type: "tool_use" as const, name: "read_file", params: { path: "src/auth/login.ts" }, partial: false },
				{
					type: "tool_use" as const,
					name: "apply_diff",
					params: { path: "src/auth/login.ts" },
					partial: false,
				},
			]

			const result = await detector.analyzeSequence(reflectionCompatibleTools)

			// Should provide structured analysis data suitable for reflection
			expect(result.patterns).toBeDefined()
			expect(result.contextualFactors).toBeDefined()
			expect(result.reasoning).toBeDefined()

			// Analysis should be compatible with reflection system expectations
			expect(result.confidence).toBeGreaterThan(0)
			expect(result.confidence).toBeLessThanOrEqual(1)
		})

		it("should detect patterns relevant to task efficiency", async () => {
			const inefficientPattern = [
				{ type: "tool_use" as const, name: "read_file", params: { path: "config.json" }, partial: false },
				{ type: "tool_use" as const, name: "write_to_file", params: { path: "config.json" }, partial: false },
				{ type: "tool_use" as const, name: "read_file", params: { path: "config.json" }, partial: false },
				{ type: "tool_use" as const, name: "write_to_file", params: { path: "config.json" }, partial: false },
				{ type: "tool_use" as const, name: "read_file", params: { path: "config.json" }, partial: false },
			]

			const result = await detector.analyzeSequence(inefficientPattern)

			expect(result.isRepetitive).toBe(true)
			expect(result.reasoning).toContain("inefficient")
			expect(result.recommendation).toBe("warn")
		})

		it("should provide actionable insights for performance improvement", async () => {
			const searchHeavyPattern = Array.from({ length: 6 }, (_, i) => ({
				type: "tool_use" as const,
				name: "codebase_search",
				params: { query: `search_term_${i}` },
				partial: false,
			}))

			const result = await detector.analyzeSequence(searchHeavyPattern)

			expect(result.isRepetitive).toBe(true)
			expect(result.reasoning).toContain("search")
			expect(result.patterns[0].toolName).toBe("codebase_search")
		})
	})

	describe("advanced pattern recognition", () => {
		it("should detect alternating patterns", async () => {
			const alternatingPattern = [
				{ type: "tool_use" as const, name: "read_file", params: { path: "file1.ts" }, partial: false },
				{ type: "tool_use" as const, name: "write_to_file", params: { path: "file1.ts" }, partial: false },
				{ type: "tool_use" as const, name: "read_file", params: { path: "file2.ts" }, partial: false },
				{ type: "tool_use" as const, name: "write_to_file", params: { path: "file2.ts" }, partial: false },
				{ type: "tool_use" as const, name: "read_file", params: { path: "file3.ts" }, partial: false },
				{ type: "tool_use" as const, name: "write_to_file", params: { path: "file3.ts" }, partial: false },
			]

			const result = await detector.analyzeSequence(alternatingPattern)

			expect(result.isRepetitive).toBe(true)
			expect(result.reasoning).toContain("pattern")
		})

		it("should detect parameter-based patterns", async () => {
			const parameterPattern = [
				{
					type: "tool_use" as const,
					name: "search_files",
					params: { regex: "\.ts$", path: "src" },
					partial: false,
				},
				{
					type: "tool_use" as const,
					name: "search_files",
					params: { regex: "\.js$", path: "src" },
					partial: false,
				},
				{
					type: "tool_use" as const,
					name: "search_files",
					params: { regex: "\.tsx$", path: "src" },
					partial: false,
				},
				{
					type: "tool_use" as const,
					name: "search_files",
					params: { regex: "\.jsx$", path: "src" },
					partial: false,
				},
			]

			const result = await detector.analyzeSequence(parameterPattern)

			expect(result.isRepetitive).toBe(true)
			expect(result.patterns[0].parameters).toHaveLength(4)
			expect(result.contextualFactors.parameterVariation).toBeGreaterThan(0)
		})

		it("should analyze semantic context of tool usage", async () => {
			const contextualPattern = [
				{
					type: "tool_use" as const,
					name: "codebase_search",
					params: { query: "user authentication" },
					partial: false,
				},
				{
					type: "tool_use" as const,
					name: "codebase_search",
					params: { query: "login validation" },
					partial: false,
				},
				{
					type: "tool_use" as const,
					name: "codebase_search",
					params: { query: "password hashing" },
					partial: false,
				},
				{
					type: "tool_use" as const,
					name: "codebase_search",
					params: { query: "session management" },
					partial: false,
				},
			]

			const result = await detector.analyzeSequence(contextualPattern)

			expect(result.isRepetitive).toBe(true)
			expect(result.patterns[0].semanticSimilarity).toBeGreaterThan(0.6)
			expect(result.contextualFactors.semanticDrift).toBeLessThan(0.5)
		})
	})

	describe("backward compatibility", () => {
		it("should maintain compatibility with existing tool usage patterns", async () => {
			// Test with legacy tool usage patterns
			const legacyPattern = [
				{ type: "tool_use" as const, name: "execute_command", params: { command: "ls -la" }, partial: false },
				{ type: "tool_use" as const, name: "read_file", params: { path: "package.json" }, partial: false },
				{ type: "tool_use" as const, name: "write_to_file", params: { path: "output.txt" }, partial: false },
			]

			const result = await detector.analyzeSequence(legacyPattern)

			expect(result).toBeDefined()
			expect(result.isRepetitive).toBe(false)
			expect(result.recommendation).toBe("allow")
		})

		it("should handle tools without advanced analysis when disabled", async () => {
			const basicDetector = new ToolRepetitionDetector({
				maxConsecutiveRepeats: 3,
				timeWindowMs: 30000,
				similarityThreshold: 0.8,
				enableAdvancedAnalysis: false,
			})

			const result = await basicDetector.analyzeSequence(mockToolUses)

			expect(result).toBeDefined()
			expect(result.isRepetitive).toBe(false)
			// Should still provide basic analysis without advanced features
			expect(result.patterns).toBeDefined()
			expect(result.recommendation).toBe("allow")

			basicDetector.dispose()
		})

		it("should provide consistent results regardless of analysis mode", async () => {
			const basicDetector = new ToolRepetitionDetector({
				maxConsecutiveRepeats: 3,
				enableAdvancedAnalysis: false,
			})

			const repetitiveTools = Array.from({ length: 5 }, () => ({
				type: "tool_use" as const,
				name: "read_file",
				params: { path: "test.ts" },
				partial: false,
			}))

			const advancedResult = await detector.analyzeSequence(repetitiveTools)
			const basicResult = await basicDetector.analyzeSequence(repetitiveTools)

			// Both should detect the repetition
			expect(advancedResult.isRepetitive).toBe(true)
			expect(basicResult.isRepetitive).toBe(true)

			// Both should have similar recommendations for obvious cases
			expect(advancedResult.recommendation).toBe(basicResult.recommendation)

			basicDetector.dispose()
		})
	})

	describe("resource management and cleanup", () => {
		it("should properly dispose of resources", () => {
			detector.dispose()

			expect(detector.getHistory()).toEqual([])
		})

		it("should handle operations after disposal gracefully", async () => {
			detector.dispose()

			const result = await detector.analyzeSequence(mockToolUses)

			expect(result).toBeDefined()
			expect(result.isRepetitive).toBe(false)
			expect(result.reasoning).toContain("disposed")
		})

		it("should clean up event listeners on disposal", () => {
			const eventSpy = vitest.fn()
			detector.on("pattern_detected", eventSpy)

			detector.dispose()

			// Should not throw when trying to emit events after disposal
			expect(() => detector.emit("pattern_detected", {} as any)).not.toThrow()
		})
	})
})

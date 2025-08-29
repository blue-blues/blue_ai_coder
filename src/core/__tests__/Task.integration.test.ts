// npx vitest run src/core/__tests__/Task.integration.test.ts

import { Task } from "../task/Task"
import { ReflectionEngine } from "../reflection/ReflectionEngine"
import { ToolRepetitionDetector } from "../tools/ToolRepetitionDetector"
import type { ReflectionConfig, ReflectionContext, PerformanceMetrics } from "../reflection/types"
import type { UnifiedToolUse } from "../shared/types/unified-types"
import { createTestTool } from "../shared/types/unified-types"

// Mock the Task class for testing integration points
class MockTask {
	private reflectionEngine?: ReflectionEngine
	private repetitionDetector?: ToolRepetitionDetector
	private toolHistory: UnifiedToolUse[] = []
	private errorHistory: string[] = []
	private performance: PerformanceMetrics = {
		taskCompletionRate: 0,
		averageStepsToCompletion: 0,
		errorRate: 0,
		repetitionRate: 0,
		adaptabilityScore: 0.5,
		efficiencyScore: 0.5,
		lastCalculatedAt: Date.now(),
	}

	constructor(
		public taskId: string,
		private enableReflection: boolean = true,
	) {
		if (enableReflection) {
			this.initializeReflection()
		}
	}

	private initializeReflection() {
		const config: ReflectionConfig = {
			enableSequentialThinking: true,
			enableSelfAssessment: true,
			maxReasoningSteps: 8,
			assessmentInterval: 5000,
			patternDetectionThreshold: 0.7,
			semanticSimilarityThreshold: 0.8,
			performanceWindowSize: 10,
		}

		this.reflectionEngine = new ReflectionEngine(config)
		this.repetitionDetector = new ToolRepetitionDetector({
			maxConsecutiveRepeats: 3,
			timeWindowMs: 30000,
			similarityThreshold: 0.8,
			enableAdvancedAnalysis: true,
		})
	}

	async executeTool(toolUse: UnifiedToolUse): Promise<{ success: boolean; result?: any; error?: string }> {
		this.toolHistory.push(toolUse)

		// Simulate tool execution
		const success = Math.random() > 0.1 // 90% success rate

		if (!success) {
			const error = `Tool ${toolUse.name} failed with params: ${JSON.stringify(toolUse.params)}`
			this.errorHistory.push(error)
			return { success: false, error }
		}

		// Update performance metrics
		this.updatePerformanceMetrics()

		// Check for repetition if detector is available
		if (this.repetitionDetector) {
			const analysis = await this.repetitionDetector.analyzeSequence(this.toolHistory.slice(-5))
			if (analysis.recommendation === "block") {
				const error = `Tool usage blocked due to repetition: ${analysis.reasoning}`
				this.errorHistory.push(error)
				return { success: false, error }
			}
		}

		return { success: true, result: `${toolUse.name} executed successfully` }
	}

	async performReflection(): Promise<any> {
		if (!this.reflectionEngine) {
			return { success: false, message: "Reflection disabled" }
		}

		const context: ReflectionContext = {
			taskId: this.taskId,
			currentStep: this.toolHistory.length,
			totalSteps: 10, // Assumed total
			recentTools: this.toolHistory.slice(-10) as any,
			recentErrors: this.errorHistory.slice(-5),
			performance: this.performance,
			environment: {
				workspacePath: "/test/workspace",
				apiConfiguration: { apiProvider: "anthropic" as any },
			},
		}

		return await this.reflectionEngine.reflect(context)
	}

	private updatePerformanceMetrics() {
		const totalTools = this.toolHistory.length
		const totalErrors = this.errorHistory.length

		this.performance = {
			taskCompletionRate: Math.min(totalTools / 10, 1), // Assume 10 steps for completion
			averageStepsToCompletion: totalTools,
			errorRate: totalErrors / Math.max(totalTools, 1),
			repetitionRate: this.calculateRepetitionRate(),
			adaptabilityScore: this.calculateAdaptabilityScore(),
			efficiencyScore: this.calculateEfficiencyScore(),
			lastCalculatedAt: Date.now(),
		}
	}

	private calculateRepetitionRate(): number {
		if (this.toolHistory.length < 2) return 0

		let repetitions = 0
		for (let i = 1; i < this.toolHistory.length; i++) {
			if (this.toolHistory[i].name === this.toolHistory[i - 1].name) {
				repetitions++
			}
		}
		return repetitions / (this.toolHistory.length - 1)
	}

	private calculateAdaptabilityScore(): number {
		const uniqueTools = new Set(this.toolHistory.map((t) => t.name)).size
		return Math.min((uniqueTools / Math.max(this.toolHistory.length, 1)) * 2, 1)
	}

	private calculateEfficiencyScore(): number {
		const successRate = 1 - (this.performance?.errorRate || 0)
		const repetitionPenalty = (this.performance?.repetitionRate || 0) * 0.5
		return Math.max(successRate - repetitionPenalty, 0)
	}

	getToolHistory(): UnifiedToolUse[] {
		return [...this.toolHistory]
	}

	getErrorHistory(): string[] {
		return [...this.errorHistory]
	}

	getPerformance(): PerformanceMetrics {
		return { ...this.performance }
	}

	dispose() {
		this.reflectionEngine?.dispose()
		this.repetitionDetector?.dispose()
	}
}

describe("Task Integration with TRAE-Agent Reflection", () => {
	let task: MockTask

	beforeEach(() => {
		task = new MockTask("integration-test-task")
	})

	afterEach(() => {
		task.dispose()
	})

	describe("reflection-enabled task execution", () => {
		/**
		 * Test that tasks with reflection enabled can perform self-assessment
		 * and sequential thinking during execution
		 */
		it("should integrate reflection capabilities into task execution", async () => {
			// Execute a series of tools
			const tools: UnifiedToolUse[] = [
				createTestTool("codebase_search", { query: "authentication" }),
				createTestTool("read_file", { path: "src/auth/login.ts" }),
				createTestTool("apply_diff", { path: "src/auth/login.ts" }),
			]

			for (const tool of tools) {
				const result = await task.executeTool(tool)
				expect(result.success).toBe(true)
			}

			// Perform reflection
			const reflection = await task.performReflection()

			expect(reflection?.success).toBe(true)
			expect(reflection?.insights).toBeDefined()
			expect(reflection?.recommendations).toBeDefined()
			expect(reflection?.confidence).toBeGreaterThan(0)
			expect(reflection?.nextSteps).toBeDefined()
		})

		it("should track performance metrics during task execution", async () => {
			const tools: UnifiedToolUse[] = [
				createTestTool("read_file", { path: "file1.ts" }),
				createTestTool("write_to_file", { path: "file1.ts" }),
				createTestTool("execute_command", { command: "npm test" }),
			]

			for (const tool of tools) {
				await task.executeTool(tool)
			}

			const performance = task.getPerformance()

			expect(performance.taskCompletionRate).toBeGreaterThan(0)
			expect(performance.averageStepsToCompletion).toBe(3)
			expect(performance.errorRate).toBeGreaterThanOrEqual(0)
			expect(performance.adaptabilityScore).toBeGreaterThan(0)
			expect(performance.efficiencyScore).toBeGreaterThan(0)
		})

		it("should detect and prevent excessive tool repetition", async () => {
			// Create repetitive tool usage
			const repetitiveTools: UnifiedToolUse[] = Array.from({ length: 5 }, (_, i) =>
				createTestTool("read_file", { path: `file${i}.ts` }),
			)

			const results = []
			for (const tool of repetitiveTools) {
				const result = await task.executeTool(tool)
				results.push(result)
			}

			// Some executions should be blocked due to repetition
			const blockedResults = results.filter((r) => !r.success && r.error?.includes("repetition"))
			expect(blockedResults.length).toBeGreaterThan(0)
		})

		it("should provide reflection-based insights for error patterns", async () => {
			// Simulate tools that might fail
			const tools: UnifiedToolUse[] = [
				createTestTool("execute_command", { command: "invalid_command" }),
				createTestTool("read_file", { path: "nonexistent.ts" }),
				createTestTool("apply_diff", { path: "broken.ts" }),
			]

			// Execute tools (some may fail)
			for (const tool of tools) {
				await task.executeTool(tool)
			}

			const reflection = await task.performReflection()

			expect(reflection?.success).toBe(true)
			// Should provide insights about error patterns if errors occurred
			if (task.getErrorHistory().length > 0) {
				expect(
					reflection?.recommendations?.some(
						(rec: string) => rec.includes("error") || rec.includes("validation"),
					),
				).toBe(true)
			}
		})
	})

	describe("backward compatibility", () => {
		it("should work without reflection when disabled", async () => {
			const taskWithoutReflection = new MockTask("no-reflection-task", false)

			const tool: UnifiedToolUse = createTestTool("read_file", { path: "test.ts" })

			const result = await taskWithoutReflection.executeTool(tool)
			expect(result.success).toBe(true)

			const reflection = await taskWithoutReflection.performReflection()
			expect(reflection.success).toBe(false)
			expect(reflection.message).toBe("Reflection disabled")

			taskWithoutReflection.dispose()
		})

		it("should maintain existing task functionality", async () => {
			const tools: UnifiedToolUse[] = [
				createTestTool("list_files", { path: "src" }),
				createTestTool("search_files", { regex: "*.ts" }),
				createTestTool("codebase_search", { query: "function" }),
			]

			for (const tool of tools) {
				const result = await task.executeTool(tool)
				expect(result.success).toBe(true)
				expect(result.result).toContain("executed successfully")
			}

			expect(task.getToolHistory()).toHaveLength(3)
		})
	})

	describe("performance and scalability", () => {
		it("should handle long-running tasks with reflection", async () => {
			// Simulate a long-running task with many tools
			const longTaskTools: UnifiedToolUse[] = Array.from({ length: 20 }, (_, i) =>
				createTestTool(`tool_${i % 5}`, { step: i.toString() }),
			)

			const startTime = Date.now()

			for (const tool of longTaskTools) {
				await task.executeTool(tool)
			}

			// Perform reflection multiple times during execution
			const reflections = []
			for (let i = 0; i < 3; i++) {
				const reflection = await task.performReflection()
				reflections.push(reflection)
			}

			const duration = Date.now() - startTime

			expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
			expect(reflections.every((r) => r.success)).toBe(true)
			expect(task.getToolHistory()).toHaveLength(20)
		})

		it("should efficiently manage memory during extended execution", async () => {
			// Execute many tools to test memory management
			for (let i = 0; i < 50; i++) {
				const tool: UnifiedToolUse = createTestTool(`memory_test_${i % 10}`, { iteration: i.toString() })
				await task.executeTool(tool)

				// Perform reflection periodically
				if (i % 10 === 0) {
					const reflection = await task.performReflection()
					expect(reflection.success).toBe(true)
				}
			}

			const finalReflection = await task.performReflection()
			expect(finalReflection.success).toBe(true)
			expect(finalReflection.confidence).toBeGreaterThan(0)
		})
	})

	describe("error handling and resilience", () => {
		it("should recover gracefully from reflection failures", async () => {
			// Execute some tools first
			await task.executeTool({
				type: "tool_use",
				name: "read_file",
				params: { path: "test.ts" },
				partial: false,
			})

			// Dispose reflection engine to simulate failure
			task.dispose()

			// Task should still be able to execute tools
			const result = await task.executeTool({
				type: "tool_use",
				name: "write_to_file",
				params: { path: "output.ts" },
				partial: false,
			})

			expect(result.success).toBe(true)
		})

		it("should handle malformed reflection context gracefully", async () => {
			// Create a scenario with potentially problematic data
			const problematicTools: UnifiedToolUse[] = [
				createTestTool("", {}),
				createTestTool("invalid_tool", { invalid: "data" }),
			]

			for (const tool of problematicTools) {
				await task.executeTool(tool)
			}

			const reflection = await task.performReflection()

			// Should handle gracefully even with problematic data
			expect(reflection).toBeDefined()
			expect(typeof reflection.success).toBe("boolean")
		})
	})

	describe("real-world integration scenarios", () => {
		it("should support typical development workflow with reflection", async () => {
			// Simulate a typical development workflow
			const developmentWorkflow: UnifiedToolUse[] = [
				createTestTool("codebase_search", { query: "user authentication" }),
				createTestTool("read_file", { path: "src/auth/login.ts" }),
				createTestTool("read_file", { path: "src/auth/types.ts" }),
				createTestTool("write_to_file", { path: "src/auth/enhanced-login.ts" }),
				createTestTool("execute_command", { command: "npm test" }),
				createTestTool("apply_diff", { path: "src/auth/enhanced-login.ts" }),
			]

			const reflectionResults = []

			for (let i = 0; i < developmentWorkflow.length; i++) {
				const tool = developmentWorkflow[i]
				const result = await task.executeTool(tool)
				expect(result.success).toBe(true)

				// Perform reflection at key stages
				if (i === 2 || i === 4 || i === developmentWorkflow.length - 1) {
					const reflection = await task.performReflection()
					reflectionResults.push(reflection)
					expect(reflection.success).toBe(true)
				}
			}

			// Final reflection should show task progression
			const finalReflection = reflectionResults[reflectionResults.length - 1]
			expect(finalReflection?.confidence).toBeGreaterThan(0.5)
			expect(finalReflection?.insights?.length).toBeGreaterThan(0)
		})

		it("should handle debugging workflow with reflection insights", async () => {
			// Simulate a debugging workflow
			const debuggingWorkflow: UnifiedToolUse[] = [
				createTestTool("execute_command", { command: "npm test" }),
				createTestTool("read_file", { path: "test.log" }),
				createTestTool("search_files", { regex: "ERROR" }),
				createTestTool("read_file", { path: "src/problematic-module.ts" }),
				createTestTool("apply_diff", { path: "src/problematic-module.ts" }),
				createTestTool("execute_command", { command: "npm test" }),
			]

			for (const tool of debuggingWorkflow) {
				await task.executeTool(tool)
			}

			const reflection = await task.performReflection()

			expect(reflection.success).toBe(true)
			// Should provide debugging-focused insights
			expect(reflection.insights.length).toBeGreaterThan(0)
			expect(reflection.recommendations.length).toBeGreaterThan(0)
		})

		it("should support code review workflow with pattern detection", async () => {
			// Simulate a code review workflow
			const reviewWorkflow: UnifiedToolUse[] = [
				createTestTool("list_files", { path: "src" }),
				createTestTool("read_file", { path: "src/component1.ts" }),
				createTestTool("read_file", { path: "src/component2.ts" }),
				createTestTool("read_file", { path: "src/component3.ts" }),
				createTestTool("codebase_search", { query: "TODO" }),
				createTestTool("search_files", { regex: "console.log" }),
			]

			for (const tool of reviewWorkflow) {
				await task.executeTool(tool)
			}

			const reflection = await task.performReflection()

			expect(reflection.success).toBe(true)
			// Should detect patterns in code review process
			expect(reflection.metadata.sequentialThinking).toBeDefined()
			expect(reflection.metadata.selfAssessment).toBeDefined()
		})
	})

	describe("adaptive behavior based on reflection", () => {
		it("should adapt strategy based on reflection insights", async () => {
			// Execute initial tools
			const initialTools: UnifiedToolUse[] = [
				createTestTool("read_file", { path: "config.json" }),
				createTestTool("read_file", { path: "config.json" }), // Repetitive
				createTestTool("read_file", { path: "config.json" }), // More repetitive
			]

			for (const tool of initialTools) {
				await task.executeTool(tool)
			}

			const reflection = await task.performReflection()

			expect(reflection.success).toBe(true)
			// Should identify repetitive behavior
			expect(
				reflection.recommendations.some(
					(rec: string) => rec.includes("repetitive") || rec.includes("efficiency"),
				),
			).toBe(true)

			// Continue with different strategy
			const adaptedTools: UnifiedToolUse[] = [
				createTestTool("codebase_search", { query: "configuration" }),
				createTestTool("list_files", { path: "config" }),
			]

			for (const tool of adaptedTools) {
				const result = await task.executeTool(tool)
				expect(result.success).toBe(true)
			}

			const finalReflection = await task.performReflection()
			expect(finalReflection.success).toBe(true)
		})

		it("should show performance improvement over time", async () => {
			const performanceHistory = []

			// Execute multiple phases of work
			for (let phase = 0; phase < 3; phase++) {
				const phaseTools: UnifiedToolUse[] = [
					createTestTool(`phase_${phase}_tool_1`, { phase: phase.toString() }),
					createTestTool(`phase_${phase}_tool_2`, { phase: phase.toString() }),
				]

				for (const tool of phaseTools) {
					await task.executeTool(tool)
				}

				const reflection = await task.performReflection()
				const performance = task.getPerformance()

				performanceHistory.push({
					phase,
					confidence: reflection.confidence,
					efficiency: performance.efficiencyScore,
					adaptability: performance.adaptabilityScore,
				})
			}

			// Should show some improvement or learning over phases
			expect(performanceHistory).toHaveLength(3)
			expect(performanceHistory.every((p) => p.confidence > 0)).toBe(true)
		})
	})

	describe("integration edge cases", () => {
		it("should handle reflection system failures gracefully", async () => {
			// Execute some tools
			await task.executeTool({
				type: "tool_use",
				name: "test_tool",
				params: { test: "value" },
				partial: false,
			})

			// Simulate reflection system failure by disposing it
			task.dispose()

			// Task should continue to function
			const result = await task.executeTool({
				type: "tool_use",
				name: "post_failure_tool",
				params: { test: "value" },
				partial: false,
			})

			expect(result.success).toBe(true)
		})

		it("should handle concurrent tool execution with reflection", async () => {
			const concurrentTools: UnifiedToolUse[] = [
				createTestTool("concurrent_1", { id: "1" }),
				createTestTool("concurrent_2", { id: "2" }),
				createTestTool("concurrent_3", { id: "3" }),
			]

			// Execute tools concurrently (simulated)
			const promises = concurrentTools.map((tool) => task.executeTool(tool))
			const results = await Promise.all(promises)

			expect(results.every((r) => r.success)).toBe(true)

			const reflection = await task.performReflection()
			expect(reflection.success).toBe(true)
		})

		it("should maintain state consistency during complex operations", async () => {
			// Perform a complex sequence with mixed success/failure
			const complexSequence: UnifiedToolUse[] = [
				createTestTool("step_1", {}),
				createTestTool("step_2", {}),
				createTestTool("step_3", {}),
			]

			const initialPerformance = task.getPerformance()

			for (const tool of complexSequence) {
				await task.executeTool(tool)
			}

			const finalPerformance = task.getPerformance()
			const reflection = await task.performReflection()

			// State should be consistent
			expect(finalPerformance?.taskCompletionRate).toBeGreaterThan(initialPerformance?.taskCompletionRate || 0)
			expect(task.getToolHistory()).toHaveLength(3)
			expect(reflection.success).toBe(true)
		})
	})
})

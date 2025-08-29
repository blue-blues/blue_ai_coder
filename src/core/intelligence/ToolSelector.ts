/**
 * TRAE-Agent Tool Selection System
 * Provides ML-based tool recommendation and intelligent tool choosing
 */

import { EventEmitter } from "events"
import {
	ToolPerformance,
	ToolRecommendation,
	ToolAlternative,
	ToolSelectionContext,
	LearningEvent,
	IntelligenceContext,
} from "./types"
import { ReflectionContext } from "../reflection/types"
import { ToolUse } from "../../shared/tools"

export class ToolSelector extends EventEmitter {
	private toolPerformances: Map<string, ToolPerformance> = new Map()
	private toolUsageHistory: Array<{
		timestamp: number
		toolName: string
		context: string
		success: boolean
		executionTime: number
		userFeedback?: number
	}> = []
	private contextPatterns: Map<
		string,
		{
			pattern: string
			recommendedTools: string[]
			successRate: number
			frequency: number
			lastUsed: number
		}
	> = new Map()
	private isActive: boolean = true
	private config: {
		enableMLRecommendations: boolean
		learningRate: number
		contextWeighting: number
		minUsageForRecommendation: number
		confidenceThreshold: number
	}

	constructor(
		config: Partial<{
			enableMLRecommendations: boolean
			learningRate: number
			contextWeighting: number
			minUsageForRecommendation: number
			confidenceThreshold: number
		}> = {},
	) {
		super()

		this.config = {
			enableMLRecommendations: true,
			learningRate: 0.1,
			contextWeighting: 0.7,
			minUsageForRecommendation: 3,
			confidenceThreshold: 0.6,
			...config,
		}

		this.initializeToolPerformanceTracking()
	}

	/**
	 * Get intelligent tool recommendations based on context and ML analysis
	 */
	public async getToolRecommendations(context: ToolSelectionContext): Promise<ToolRecommendation[]> {
		if (!this.isActive || !this.config.enableMLRecommendations) {
			return this.getFallbackRecommendations(context)
		}

		const recommendations: ToolRecommendation[] = []

		// Analyze context patterns
		const contextPattern = this.analyzeContextPattern(context)
		const patternBasedTools = this.getPatternBasedRecommendations(contextPattern, context)

		// Analyze tool performance for current context
		const performanceBasedTools = this.getPerformanceBasedRecommendations(context)

		// Combine and score recommendations
		const combinedTools = this.combineRecommendations(patternBasedTools, performanceBasedTools)

		for (const toolName of combinedTools) {
			if (!context.availableTools.includes(toolName)) continue

			const performance = this.toolPerformances.get(toolName)
			if (!performance) continue

			const confidence = this.calculateToolConfidence(toolName, context, performance)
			if (confidence < this.config.confidenceThreshold) continue

			const recommendation: ToolRecommendation = {
				toolName,
				confidence,
				reasoning: this.generateToolReasoning(toolName, context, performance),
				expectedSuccess: performance.successRate,
				estimatedTime: performance.averageExecutionTime,
				alternatives: this.findToolAlternatives(toolName, context),
				contextMatch: this.calculateContextMatch(toolName, context),
				learningBased: true,
			}

			recommendations.push(recommendation)
		}

		// Sort by confidence and context match
		const sortedRecommendations = recommendations.sort((a, b) => {
			const scoreA = a.confidence * 0.6 + a.contextMatch * 0.4
			const scoreB = b.confidence * 0.6 + b.contextMatch * 0.4
			return scoreB - scoreA
		})

		this.emit("recommendations_generated", {
			context: context.taskType,
			recommendations: sortedRecommendations.slice(0, 5), // Top 5
		})

		return sortedRecommendations.slice(0, 5)
	}

	/**
	 * Record tool usage for learning and performance tracking
	 */
	public async recordToolUsage(
		toolName: string,
		context: ToolSelectionContext,
		success: boolean,
		executionTime: number,
		userFeedback?: number,
	): Promise<void> {
		if (!this.isActive) return

		// Record usage history
		const usageRecord = {
			timestamp: Date.now(),
			toolName,
			context: this.contextToString(context),
			success,
			executionTime,
			userFeedback,
		}

		this.toolUsageHistory.push(usageRecord)

		// Maintain history size
		if (this.toolUsageHistory.length > 10000) {
			this.toolUsageHistory = this.toolUsageHistory.slice(-5000)
		}

		// Update tool performance
		await this.updateToolPerformance(toolName, context, success, executionTime, userFeedback)

		// Update context patterns
		await this.updateContextPatterns(context, toolName, success)

		// Learn from usage
		await this.learnFromToolUsage(usageRecord, context)

		this.emit("tool_usage_recorded", usageRecord)
	}

	/**
	 * Get tool selection statistics and insights
	 */
	public getToolStats(): {
		totalUsages: number
		uniqueTools: number
		averageSuccessRate: number
		mostUsedTools: Array<{ tool: string; usageCount: number; successRate: number }>
		contextPatterns: number
		learningVelocity: number
	} {
		const totalUsages = this.toolUsageHistory.length
		const uniqueTools = new Set(this.toolUsageHistory.map((u) => u.toolName)).size
		const successfulUsages = this.toolUsageHistory.filter((u) => u.success).length
		const averageSuccessRate = totalUsages > 0 ? successfulUsages / totalUsages : 0

		// Calculate tool usage frequency and success rates
		const toolStats = new Map<string, { count: number; successes: number }>()
		this.toolUsageHistory.forEach((usage) => {
			const current = toolStats.get(usage.toolName) || { count: 0, successes: 0 }
			current.count++
			if (usage.success) current.successes++
			toolStats.set(usage.toolName, current)
		})

		const mostUsedTools = Array.from(toolStats.entries())
			.map(([tool, stats]) => ({
				tool,
				usageCount: stats.count,
				successRate: stats.count > 0 ? stats.successes / stats.count : 0,
			}))
			.sort((a, b) => b.usageCount - a.usageCount)
			.slice(0, 10)

		// Calculate learning velocity (recent vs historical performance)
		const recentUsages = this.toolUsageHistory.filter((u) => Date.now() - u.timestamp < 86400000) // Last 24 hours
		const recentSuccessRate =
			recentUsages.length > 0
				? recentUsages.filter((u) => u.success).length / recentUsages.length
				: averageSuccessRate
		const learningVelocity = recentSuccessRate - averageSuccessRate

		return {
			totalUsages,
			uniqueTools,
			averageSuccessRate,
			mostUsedTools,
			contextPatterns: this.contextPatterns.size,
			learningVelocity,
		}
	}

	/**
	 * Optimize tool selection based on historical performance
	 */
	public async optimizeToolSelection(context: ToolSelectionContext): Promise<{
		optimizedTools: string[]
		reasoning: string[]
		expectedImprovement: number
	}> {
		if (!this.isActive) {
			return { optimizedTools: [], reasoning: [], expectedImprovement: 0 }
		}

		const currentRecommendations = await this.getToolRecommendations(context)
		const optimizedTools: string[] = []
		const reasoning: string[] = []

		// Find the best performing tools for similar contexts
		const similarContexts = this.findSimilarContexts(context)
		const bestPerformers = this.identifyBestPerformers(similarContexts)

		for (const performer of bestPerformers) {
			if (
				context.availableTools.includes(performer.tool) &&
				performer.successRate > 0.8 &&
				performer.usageCount >= this.config.minUsageForRecommendation
			) {
				optimizedTools.push(performer.tool)
				reasoning.push(
					`${performer.tool}: ${Math.round(performer.successRate * 100)}% success rate in similar contexts`,
				)
			}
		}

		// Calculate expected improvement
		const currentPerformance = this.calculateContextPerformance(context)
		const optimizedPerformance = this.estimateOptimizedPerformance(optimizedTools, context)
		const expectedImprovement = optimizedPerformance - currentPerformance

		this.emit("optimization_completed", {
			context: context.taskType,
			optimizedTools,
			expectedImprovement,
		})

		return {
			optimizedTools: optimizedTools.slice(0, 3), // Top 3 optimized tools
			reasoning,
			expectedImprovement,
		}
	}

	/**
	 * Set active state
	 */
	public setActive(active: boolean): void {
		this.isActive = active
		this.emit("status_changed", { active })
	}

	// Private helper methods

	private initializeToolPerformanceTracking(): void {
		// Initialize with common tools and baseline performance
		const commonTools = [
			"read_file",
			"write_to_file",
			"apply_diff",
			"search_files",
			"list_files",
			"execute_command",
			"browser_action",
			"ask_followup_question",
		]

		commonTools.forEach((tool) => {
			this.toolPerformances.set(tool, {
				toolName: tool,
				context: "default",
				successRate: 0.7, // Default baseline
				averageExecutionTime: 5000, // 5 seconds default
				errorRate: 0.1,
				userFeedbackScore: 0.75,
				contextRelevance: 0.5,
				lastUsed: Date.now(),
				usageCount: 0,
			})
		})
	}

	private analyzeContextPattern(context: ToolSelectionContext): string {
		// Create a pattern signature from context
		const elements = [
			context.taskType,
			context.currentContext.substring(0, 50), // First 50 chars
			context.previousAttempts.length > 0 ? "has_attempts" : "no_attempts",
			context.timeConstraints ? "time_constrained" : "no_time_limit",
			context.qualityRequirements?.join(",") || "no_quality_reqs",
		]

		return elements.join("|")
	}

	private getPatternBasedRecommendations(pattern: string, context: ToolSelectionContext): string[] {
		const matchingPatterns = Array.from(this.contextPatterns.values())
			.filter((p) => this.calculatePatternSimilarity(pattern, p.pattern) > 0.6)
			.sort((a, b) => b.successRate - a.successRate)

		const recommendations: string[] = []
		for (const patternData of matchingPatterns.slice(0, 3)) {
			recommendations.push(...patternData.recommendedTools)
		}

		return [...new Set(recommendations)] // Remove duplicates
	}

	private getPerformanceBasedRecommendations(context: ToolSelectionContext): string[] {
		const recommendations: string[] = []

		for (const [toolName, performance] of this.toolPerformances.entries()) {
			if (!context.availableTools.includes(toolName)) continue

			// Score based on success rate, recency, and context relevance
			const score =
				performance.successRate * 0.4 +
				performance.contextRelevance * 0.3 +
				this.calculateRecencyScore(performance.lastUsed) * 0.3

			if (score > 0.6) {
				recommendations.push(toolName)
			}
		}

		return recommendations.sort((a, b) => {
			const perfA = this.toolPerformances.get(a)!
			const perfB = this.toolPerformances.get(b)!
			return perfB.successRate - perfA.successRate
		})
	}

	private combineRecommendations(patternBased: string[], performanceBased: string[]): string[] {
		// Weight pattern-based recommendations higher
		const combined = new Map<string, number>()

		patternBased.forEach((tool, index) => {
			combined.set(tool, (combined.get(tool) || 0) + (3 - index) * this.config.contextWeighting)
		})

		performanceBased.forEach((tool, index) => {
			combined.set(tool, (combined.get(tool) || 0) + (3 - index) * (1 - this.config.contextWeighting))
		})

		return Array.from(combined.entries())
			.sort(([, a], [, b]) => b - a)
			.map(([tool]) => tool)
	}

	private calculateToolConfidence(
		toolName: string,
		context: ToolSelectionContext,
		performance: ToolPerformance,
	): number {
		let confidence = performance.successRate * 0.4 // Base success rate

		// Context relevance
		confidence += performance.contextRelevance * 0.2

		// Usage frequency bonus
		const usageBonus = Math.min(performance.usageCount / 100, 0.1)
		confidence += usageBonus

		// User feedback
		confidence += (performance.userFeedbackScore - 0.5) * 0.2

		// Recent usage bonus
		const recencyBonus = this.calculateRecencyScore(performance.lastUsed) * 0.1
		confidence += recencyBonus

		return Math.min(confidence, 1.0)
	}

	private generateToolReasoning(
		toolName: string,
		context: ToolSelectionContext,
		performance: ToolPerformance,
	): string[] {
		const reasoning: string[] = []

		if (performance.successRate > 0.8) {
			reasoning.push(`High success rate (${Math.round(performance.successRate * 100)}%)`)
		}

		if (performance.averageExecutionTime < 3000) {
			reasoning.push("Fast execution time")
		}

		if (performance.userFeedbackScore > 0.8) {
			reasoning.push("Positive user feedback")
		}

		if (performance.contextRelevance > 0.7) {
			reasoning.push("Highly relevant for current context")
		}

		if (performance.usageCount > 50) {
			reasoning.push("Extensively tested and proven")
		}

		// Context-specific reasoning
		if (context.timeConstraints && performance.averageExecutionTime < 5000) {
			reasoning.push("Suitable for time-constrained tasks")
		}

		if (context.qualityRequirements?.includes("high_accuracy") && performance.errorRate < 0.05) {
			reasoning.push("Low error rate for quality requirements")
		}

		return reasoning.length > 0 ? reasoning : ["Standard recommendation based on performance"]
	}

	private findToolAlternatives(toolName: string, context: ToolSelectionContext): ToolAlternative[] {
		const alternatives: ToolAlternative[] = []

		// Find similar tools based on functionality
		const similarTools = this.findSimilarTools(toolName, context)

		for (const similarTool of similarTools.slice(0, 2)) {
			const performance = this.toolPerformances.get(similarTool)
			if (!performance) continue

			const alternative: ToolAlternative = {
				toolName: similarTool,
				confidence: performance.successRate,
				tradeoffs: this.calculateTradeoffs(toolName, similarTool),
				advantages: this.getToolAdvantages(similarTool, performance),
				disadvantages: this.getToolDisadvantages(similarTool, performance),
			}

			alternatives.push(alternative)
		}

		return alternatives
	}

	private calculateContextMatch(toolName: string, context: ToolSelectionContext): number {
		const performance = this.toolPerformances.get(toolName)
		if (!performance) return 0

		let match = performance.contextRelevance * 0.5

		// Task type matching
		if (context.taskType.includes("file") && ["read_file", "write_to_file", "search_files"].includes(toolName)) {
			match += 0.3
		}

		if (context.taskType.includes("search") && ["search_files", "codebase_search"].includes(toolName)) {
			match += 0.3
		}

		if (context.taskType.includes("execute") && toolName === "execute_command") {
			match += 0.3
		}

		// Previous attempts consideration
		if (context.previousAttempts.some((attempt) => attempt.name === toolName)) {
			match -= 0.2 // Penalize recently failed tools
		}

		return Math.min(match, 1.0)
	}

	private getFallbackRecommendations(context: ToolSelectionContext): ToolRecommendation[] {
		// Simple fallback based on task type
		const fallbackMap: Record<string, string[]> = {
			file_operation: ["read_file", "write_to_file", "apply_diff"],
			search: ["search_files", "codebase_search"],
			execution: ["execute_command"],
			interaction: ["ask_followup_question", "browser_action"],
			default: ["read_file", "search_files", "execute_command"],
		}

		const toolNames = fallbackMap[context.taskType] || fallbackMap["default"]

		return toolNames
			.filter((tool) => context.availableTools.includes(tool))
			.map((tool) => ({
				toolName: tool,
				confidence: 0.5,
				reasoning: ["Fallback recommendation"],
				expectedSuccess: 0.7,
				estimatedTime: 5000,
				alternatives: [],
				contextMatch: 0.5,
				learningBased: false,
			}))
	}

	private async updateToolPerformance(
		toolName: string,
		context: ToolSelectionContext,
		success: boolean,
		executionTime: number,
		userFeedback?: number,
	): Promise<void> {
		let performance = this.toolPerformances.get(toolName)

		if (!performance) {
			performance = {
				toolName,
				context: context.taskType,
				successRate: success ? 1 : 0,
				averageExecutionTime: executionTime,
				errorRate: success ? 0 : 1,
				userFeedbackScore: userFeedback || 0.5,
				contextRelevance: 0.5,
				lastUsed: Date.now(),
				usageCount: 1,
			}
		} else {
			// Update using exponential moving average
			const alpha = this.config.learningRate
			performance.successRate = performance.successRate * (1 - alpha) + (success ? 1 : 0) * alpha
			performance.averageExecutionTime = performance.averageExecutionTime * (1 - alpha) + executionTime * alpha
			performance.errorRate = performance.errorRate * (1 - alpha) + (success ? 0 : 1) * alpha

			if (userFeedback !== undefined) {
				performance.userFeedbackScore = performance.userFeedbackScore * (1 - alpha) + userFeedback * alpha
			}

			performance.lastUsed = Date.now()
			performance.usageCount++
		}

		this.toolPerformances.set(toolName, performance)
		this.emit("performance_updated", { toolName, performance })
	}

	private async updateContextPatterns(
		context: ToolSelectionContext,
		toolName: string,
		success: boolean,
	): Promise<void> {
		const pattern = this.analyzeContextPattern(context)
		let patternData = this.contextPatterns.get(pattern)

		if (!patternData) {
			patternData = {
				pattern,
				recommendedTools: [toolName],
				successRate: success ? 1 : 0,
				frequency: 1,
				lastUsed: Date.now(),
			}
		} else {
			// Update pattern data
			if (!patternData.recommendedTools.includes(toolName)) {
				patternData.recommendedTools.push(toolName)
			}

			const alpha = this.config.learningRate
			patternData.successRate = patternData.successRate * (1 - alpha) + (success ? 1 : 0) * alpha
			patternData.frequency++
			patternData.lastUsed = Date.now()
		}

		this.contextPatterns.set(pattern, patternData)
	}

	private async learnFromToolUsage(
		usageRecord: {
			timestamp: number
			toolName: string
			context: string
			success: boolean
			executionTime: number
			userFeedback?: number
		},
		context: ToolSelectionContext,
	): Promise<void> {
		const learningEvent: LearningEvent = {
			id: this.generateId(),
			timestamp: usageRecord.timestamp,
			source: "tool",
			event: `Tool usage: ${usageRecord.toolName}`,
			data: {
				toolName: usageRecord.toolName,
				success: usageRecord.success,
				executionTime: usageRecord.executionTime,
				userFeedback: usageRecord.userFeedback,
				context: usageRecord.context,
			},
			impact: usageRecord.success ? "positive" : "negative",
			confidence: 0.8,
			learningValue: usageRecord.success ? 0.7 : 0.5,
		}

		this.emit("learning_event", learningEvent)
	}

	private findSimilarTools(toolName: string, context: ToolSelectionContext): string[] {
		// Define tool similarity groups
		const similarityGroups: Record<string, string[]> = {
			read_file: ["search_files", "list_files", "codebase_search"],
			write_to_file: ["apply_diff", "search_and_replace"],
			search_files: ["read_file", "codebase_search", "list_files"],
			execute_command: ["browser_action"],
			browser_action: ["execute_command"],
			apply_diff: ["write_to_file", "search_and_replace"],
		}

		return similarityGroups[toolName] || []
	}

	private calculateTradeoffs(tool1: string, tool2: string): string[] {
		const tradeoffs: string[] = []

		const perf1 = this.toolPerformances.get(tool1)
		const perf2 = this.toolPerformances.get(tool2)

		if (!perf1 || !perf2) return tradeoffs

		if (perf1.averageExecutionTime < perf2.averageExecutionTime) {
			tradeoffs.push(`${tool1} is faster than ${tool2}`)
		} else {
			tradeoffs.push(`${tool2} is faster than ${tool1}`)
		}

		if (perf1.successRate > perf2.successRate) {
			tradeoffs.push(`${tool1} has higher success rate`)
		} else {
			tradeoffs.push(`${tool2} has higher success rate`)
		}

		return tradeoffs
	}

	private getToolAdvantages(toolName: string, performance: ToolPerformance): string[] {
		const advantages: string[] = []

		if (performance.successRate > 0.8) {
			advantages.push("High reliability")
		}

		if (performance.averageExecutionTime < 3000) {
			advantages.push("Fast execution")
		}

		if (performance.userFeedbackScore > 0.8) {
			advantages.push("User-friendly")
		}

		if (performance.errorRate < 0.1) {
			advantages.push("Low error rate")
		}

		return advantages
	}

	private getToolDisadvantages(toolName: string, performance: ToolPerformance): string[] {
		const disadvantages: string[] = []

		if (performance.successRate < 0.6) {
			disadvantages.push("Lower reliability")
		}

		if (performance.averageExecutionTime > 10000) {
			disadvantages.push("Slower execution")
		}

		if (performance.errorRate > 0.2) {
			disadvantages.push("Higher error rate")
		}

		if (performance.usageCount < 5) {
			disadvantages.push("Limited usage history")
		}

		return disadvantages
	}

	private calculatePatternSimilarity(pattern1: string, pattern2: string): number {
		const parts1 = pattern1.split("|")
		const parts2 = pattern2.split("|")

		let matches = 0
		for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
			if (parts1[i] === parts2[i]) matches++
		}

		return matches / Math.max(parts1.length, parts2.length)
	}

	private calculateRecencyScore(lastUsed: number): number {
		const daysSince = (Date.now() - lastUsed) / (24 * 60 * 60 * 1000)
		return Math.exp(-daysSince / 30) // Decay over 30 days
	}

	private findSimilarContexts(context: ToolSelectionContext): string[] {
		const currentPattern = this.analyzeContextPattern(context)
		const similarPatterns: string[] = []

		for (const [pattern] of this.contextPatterns.entries()) {
			if (this.calculatePatternSimilarity(currentPattern, pattern) > 0.6) {
				similarPatterns.push(pattern)
			}
		}

		return similarPatterns
	}

	private identifyBestPerformers(patterns: string[]): Array<{
		tool: string
		successRate: number
		usageCount: number
	}> {
		const performers = new Map<string, { successRate: number; usageCount: number }>()

		patterns.forEach((pattern) => {
			const patternData = this.contextPatterns.get(pattern)
			if (!patternData) return

			patternData.recommendedTools.forEach((tool) => {
				const performance = this.toolPerformances.get(tool)
				if (!performance) return

				const existing = performers.get(tool) || { successRate: 0, usageCount: 0 }
				existing.successRate = Math.max(existing.successRate, performance.successRate)
				existing.usageCount += performance.usageCount
				performers.set(tool, existing)
			})
		})

		return Array.from(performers.entries())
			.map(([tool, data]) => ({ tool, ...data }))
			.sort((a, b) => b.successRate - a.successRate)
	}

	private calculateContextPerformance(context: ToolSelectionContext): number {
		// Estimate current context performance based on available tools
		let totalPerformance = 0
		let count = 0

		context.availableTools.forEach((tool) => {
			const performance = this.toolPerformances.get(tool)
			if (performance) {
				totalPerformance += performance.successRate
				count++
			}
		})

		return count > 0 ? totalPerformance / count : 0.5
	}

	private estimateOptimizedPerformance(tools: string[], context: ToolSelectionContext): number {
		let totalPerformance = 0
		let count = 0

		tools.forEach((tool) => {
			const performance = this.toolPerformances.get(tool)
			if (performance) {
				totalPerformance += performance.successRate
				count++
			}
		})

		return count > 0 ? totalPerformance / count : 0.5
	}

	private contextToString(context: ToolSelectionContext): string {
		return JSON.stringify({
			taskType: context.taskType,
			currentContext: context.currentContext.substring(0, 100),
			availableTools: context.availableTools.length,
			previousAttempts: context.previousAttempts.length,
			hasTimeConstraints: !!context.timeConstraints,
			hasQualityRequirements: !!context.qualityRequirements,
		})
	}

	private generateId(): string {
		return `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	/**
	 * Clean up resources
	 */
	public dispose(): void {
		this.setActive(false)
		this.removeAllListeners()
		this.toolPerformances.clear()
		this.toolUsageHistory.length = 0
		this.contextPatterns.clear()
	}
}

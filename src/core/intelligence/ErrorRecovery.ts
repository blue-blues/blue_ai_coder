/**
 * TRAE-Agent Error Recovery System
 * Provides intelligent error correction patterns and adaptive retry strategies
 */

import { EventEmitter } from "events"
import { ErrorPattern, RecoveryStrategy, ErrorRecoveryConfig, LearningEvent, IntelligenceContext } from "./types"
import { ReflectionContext } from "../reflection/types"

export class ErrorRecovery extends EventEmitter {
	private config: ErrorRecoveryConfig
	private errorPatterns: Map<string, ErrorPattern> = new Map()
	private recoveryStrategies: Map<string, RecoveryStrategy> = new Map()
	private activeRecoveries: Map<string, { strategy: RecoveryStrategy; startTime: number; attempts: number }> =
		new Map()
	private isActive: boolean = true

	constructor(config: Partial<ErrorRecoveryConfig> = {}) {
		super()

		this.config = {
			enablePredictiveRecovery: true,
			maxRetryAttempts: 3,
			recoveryTimeout: 300000, // 5 minutes
			adaptiveStrategies: true,
			learningEnabled: true,
			fallbackEnabled: true,
			...config,
		}

		this.initializeDefaultStrategies()
	}

	/**
	 * Record an error and attempt intelligent recovery
	 */
	public async handleError(
		error: Error | string,
		context: ReflectionContext,
		metadata: Record<string, unknown> = {},
	): Promise<{
		recovered: boolean
		strategy?: RecoveryStrategy
		nextSteps: string[]
		preventionSuggestions: string[]
	}> {
		if (!this.isActive) {
			return {
				recovered: false,
				nextSteps: ["Error recovery is disabled"],
				preventionSuggestions: [],
			}
		}

		const errorMessage = error instanceof Error ? error.message : error
		const errorType = this.classifyError(errorMessage, context)

		// Record error pattern
		await this.recordErrorPattern(errorType, errorMessage, context, metadata)

		// Find best recovery strategy
		const strategy = await this.selectRecoveryStrategy(errorType, errorMessage, context)

		if (!strategy) {
			return {
				recovered: false,
				nextSteps: ["No suitable recovery strategy found"],
				preventionSuggestions: this.generatePreventionSuggestions(errorType, errorMessage),
			}
		}

		// Attempt recovery
		const recoveryResult = await this.executeRecoveryStrategy(strategy, errorType, context, metadata)

		// Learn from recovery attempt
		if (this.config.learningEnabled) {
			await this.learnFromRecovery(errorType, strategy, recoveryResult, context)
		}

		return {
			recovered: recoveryResult.success,
			strategy,
			nextSteps: recoveryResult.nextSteps,
			preventionSuggestions: this.generatePreventionSuggestions(errorType, errorMessage),
		}
	}

	/**
	 * Predict potential errors based on current context
	 */
	public async predictPotentialErrors(context: ReflectionContext): Promise<
		Array<{
			errorType: string
			probability: number
			preventionSteps: string[]
			earlyWarningSignals: string[]
		}>
	> {
		if (!this.isActive || !this.config.enablePredictiveRecovery) {
			return []
		}

		const predictions: Array<{
			errorType: string
			probability: number
			preventionSteps: string[]
			earlyWarningSignals: string[]
		}> = []

		for (const [errorType, pattern] of this.errorPatterns.entries()) {
			const probability = this.calculateErrorProbability(pattern, context)

			if (probability > 0.3) {
				// 30% threshold for prediction
				predictions.push({
					errorType,
					probability,
					preventionSteps: pattern.preventionMethods || [],
					earlyWarningSignals: this.getEarlyWarningSignals(pattern, context),
				})
			}
		}

		return predictions.sort((a, b) => b.probability - a.probability)
	}

	/**
	 * Get recovery statistics and insights
	 */
	public getRecoveryStats(): {
		totalErrors: number
		successfulRecoveries: number
		averageRecoveryTime: number
		mostCommonErrors: Array<{ type: string; count: number }>
		bestStrategies: Array<{ name: string; successRate: number }>
	} {
		const patterns = Array.from(this.errorPatterns.values())
		const strategies = Array.from(this.recoveryStrategies.values())

		const totalErrors = patterns.reduce((sum, p) => sum + p.frequency, 0)
		const successfulRecoveries = strategies.reduce(
			(sum, s) => sum + (s.successRate > 0.5 ? Math.floor(s.successRate * 100) : 0),
			0,
		)

		return {
			totalErrors,
			successfulRecoveries,
			averageRecoveryTime:
				strategies.reduce((sum, s) => sum + s.averageRecoveryTime, 0) / Math.max(strategies.length, 1),
			mostCommonErrors: patterns
				.sort((a, b) => b.frequency - a.frequency)
				.slice(0, 5)
				.map((p) => ({ type: p.errorType, count: p.frequency })),
			bestStrategies: strategies
				.filter((s) => s.successRate > 0.5)
				.sort((a, b) => b.successRate - a.successRate)
				.slice(0, 5)
				.map((s) => ({ name: s.name, successRate: s.successRate })),
		}
	}

	/**
	 * Add a custom recovery strategy
	 */
	public addRecoveryStrategy(strategy: RecoveryStrategy): void {
		this.recoveryStrategies.set(strategy.id, strategy)
		this.emit("strategy_added", strategy)
	}

	/**
	 * Update strategy performance based on results
	 */
	public updateStrategyPerformance(strategyId: string, success: boolean, recoveryTime: number): void {
		const strategy = this.recoveryStrategies.get(strategyId)
		if (!strategy) return

		// Update success rate using exponential moving average
		const alpha = 0.1 // Learning rate
		strategy.successRate = strategy.successRate * (1 - alpha) + (success ? 1 : 0) * alpha

		// Update average recovery time
		strategy.averageRecoveryTime = strategy.averageRecoveryTime * (1 - alpha) + recoveryTime * alpha

		this.emit("strategy_updated", strategy)
	}

	/**
	 * Set active state
	 */
	public setActive(active: boolean): void {
		this.isActive = active
		this.emit("status_changed", { active })
	}

	// Private helper methods

	private initializeDefaultStrategies(): void {
		const defaultStrategies: RecoveryStrategy[] = [
			{
				id: "retry_with_delay",
				name: "Retry with Exponential Backoff",
				description: "Retry the operation with increasing delays",
				steps: [
					"Wait for initial delay",
					"Retry the operation",
					"If failed, double the delay and retry",
					"Continue until max attempts reached",
				],
				successRate: 0.7,
				averageRecoveryTime: 30000,
				applicableContexts: ["network_error", "timeout_error", "rate_limit"],
				prerequisites: [],
				fallbackStrategy: "manual_intervention",
			},
			{
				id: "context_adjustment",
				name: "Adjust Context and Retry",
				description: "Modify the context or parameters and retry",
				steps: [
					"Analyze the error context",
					"Identify adjustable parameters",
					"Apply context modifications",
					"Retry with new context",
				],
				successRate: 0.6,
				averageRecoveryTime: 45000,
				applicableContexts: ["parameter_error", "validation_error", "context_error"],
				prerequisites: ["context_analysis"],
				fallbackStrategy: "retry_with_delay",
			},
			{
				id: "alternative_approach",
				name: "Use Alternative Approach",
				description: "Switch to an alternative method or tool",
				steps: [
					"Identify alternative approaches",
					"Evaluate feasibility of alternatives",
					"Switch to best alternative",
					"Execute with new approach",
				],
				successRate: 0.8,
				averageRecoveryTime: 60000,
				applicableContexts: ["tool_error", "method_error", "resource_error"],
				prerequisites: ["alternative_identification"],
				fallbackStrategy: "manual_intervention",
			},
			{
				id: "manual_intervention",
				name: "Request Manual Intervention",
				description: "Escalate to user for manual resolution",
				steps: [
					"Document the error thoroughly",
					"Provide context and attempted solutions",
					"Request user guidance",
					"Apply user-provided solution",
				],
				successRate: 0.9,
				averageRecoveryTime: 120000,
				applicableContexts: ["critical_error", "unknown_error", "complex_error"],
				prerequisites: [],
				fallbackStrategy: undefined,
			},
		]

		defaultStrategies.forEach((strategy) => {
			this.recoveryStrategies.set(strategy.id, strategy)
		})
	}

	private classifyError(errorMessage: string, context: ReflectionContext): string {
		const message = errorMessage.toLowerCase()

		// Network and API errors
		if (message.includes("network") || message.includes("connection") || message.includes("timeout")) {
			return "network_error"
		}

		// Permission and access errors
		if (message.includes("permission") || message.includes("access") || message.includes("unauthorized")) {
			return "permission_error"
		}

		// File system errors
		if (message.includes("file not found") || message.includes("directory") || message.includes("path")) {
			return "file_system_error"
		}

		// Tool-specific errors
		if (context.recentTools && context.recentTools.length > 0) {
			const lastTool = context.recentTools[context.recentTools.length - 1]
			if (lastTool.name) {
				return `${lastTool.name}_error`
			}
		}

		// Validation errors
		if (message.includes("invalid") || message.includes("validation") || message.includes("format")) {
			return "validation_error"
		}

		// Rate limiting
		if (message.includes("rate limit") || message.includes("too many requests")) {
			return "rate_limit_error"
		}

		return "unknown_error"
	}

	private async recordErrorPattern(
		errorType: string,
		errorMessage: string,
		context: ReflectionContext,
		metadata: Record<string, unknown>,
	): Promise<void> {
		const existingPattern = this.errorPatterns.get(errorType)

		if (existingPattern) {
			existingPattern.frequency++
			existingPattern.lastOccurred = Date.now()

			// Update severity based on frequency and context
			if (existingPattern.frequency > 10) {
				existingPattern.severity = "high"
			} else if (existingPattern.frequency > 5) {
				existingPattern.severity = "medium"
			}
		} else {
			const newPattern: ErrorPattern = {
				id: this.generateId(),
				errorType,
				errorMessage,
				context: this.contextToString(context),
				frequency: 1,
				lastOccurred: Date.now(),
				recoveryStrategies: this.findApplicableStrategies(errorType),
				preventionMethods: this.generatePreventionMethods(errorType, errorMessage),
				severity: "low",
			}

			this.errorPatterns.set(errorType, newPattern)
		}

		this.emit("error_recorded", { errorType, errorMessage, metadata })
	}

	private async selectRecoveryStrategy(
		errorType: string,
		errorMessage: string,
		context: ReflectionContext,
	): Promise<RecoveryStrategy | undefined> {
		const pattern = this.errorPatterns.get(errorType)
		const applicableStrategies = pattern?.recoveryStrategies || this.findApplicableStrategies(errorType)

		if (applicableStrategies.length === 0) {
			return this.recoveryStrategies.get("manual_intervention")
		}

		// Score strategies based on success rate, context match, and recency
		const scoredStrategies = applicableStrategies
			.map((strategy) => ({
				strategy,
				score: this.scoreStrategy(strategy, errorType, context),
			}))
			.sort((a, b) => b.score - a.score)

		return scoredStrategies[0]?.strategy
	}

	private scoreStrategy(strategy: RecoveryStrategy, errorType: string, context: ReflectionContext): number {
		let score = strategy.successRate * 0.6 // Base success rate weight

		// Context applicability
		const contextMatch = strategy.applicableContexts.some((ctx) => errorType.includes(ctx) || ctx === "any")
		if (contextMatch) score += 0.2

		// Recency bonus (prefer recently successful strategies)
		const timeSinceUpdate = Date.now() - (strategy as any).lastUpdated || 0
		const recencyBonus = Math.exp(-timeSinceUpdate / (24 * 60 * 60 * 1000)) * 0.1 // Decay over days
		score += recencyBonus

		// Efficiency bonus (faster recovery preferred)
		const efficiencyBonus = Math.max(0, (120000 - strategy.averageRecoveryTime) / 120000) * 0.1
		score += efficiencyBonus

		return score
	}

	private async executeRecoveryStrategy(
		strategy: RecoveryStrategy,
		errorType: string,
		context: ReflectionContext,
		metadata: Record<string, unknown>,
	): Promise<{ success: boolean; nextSteps: string[]; recoveryTime: number }> {
		const startTime = Date.now()
		const recoveryId = this.generateId()

		this.activeRecoveries.set(recoveryId, {
			strategy,
			startTime,
			attempts: 1,
		})

		try {
			// Simulate strategy execution (in real implementation, this would execute actual recovery steps)
			const success = await this.simulateRecoveryExecution(strategy, errorType, context)
			const recoveryTime = Date.now() - startTime

			// Update strategy performance
			this.updateStrategyPerformance(strategy.id, success, recoveryTime)

			this.activeRecoveries.delete(recoveryId)

			return {
				success,
				nextSteps: success ? ["Recovery completed successfully"] : strategy.steps,
				recoveryTime,
			}
		} catch (error) {
			this.activeRecoveries.delete(recoveryId)

			return {
				success: false,
				nextSteps: [
					"Recovery strategy failed to execute",
					...(strategy.fallbackStrategy ? [`Try fallback: ${strategy.fallbackStrategy}`] : []),
				],
				recoveryTime: Date.now() - startTime,
			}
		}
	}

	private async simulateRecoveryExecution(
		strategy: RecoveryStrategy,
		errorType: string,
		context: ReflectionContext,
	): Promise<boolean> {
		// Simulate recovery based on strategy type and error context
		await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 500))

		// Success probability based on strategy and error type
		const baseSuccessRate = strategy.successRate
		const contextBonus = strategy.applicableContexts.some((ctx) => errorType.includes(ctx) || ctx === "any")
			? 0.1
			: 0

		const successProbability = Math.min(baseSuccessRate + contextBonus, 0.95)
		return Math.random() < successProbability
	}

	private findApplicableStrategies(errorType: string): RecoveryStrategy[] {
		const applicable: RecoveryStrategy[] = []

		for (const strategy of this.recoveryStrategies.values()) {
			if (strategy.applicableContexts.some((ctx) => errorType.includes(ctx) || ctx === "any")) {
				applicable.push(strategy)
			}
		}

		return applicable
	}

	private generatePreventionMethods(errorType: string, errorMessage: string): string[] {
		const methods: string[] = []

		switch (errorType) {
			case "network_error":
				methods.push(
					"Implement connection pooling",
					"Add network retry logic",
					"Use circuit breaker pattern",
					"Monitor network health",
				)
				break
			case "permission_error":
				methods.push(
					"Validate permissions before operations",
					"Implement proper authentication",
					"Use least privilege principle",
					"Regular permission audits",
				)
				break
			case "file_system_error":
				methods.push(
					"Validate file paths before use",
					"Check file existence before operations",
					"Implement proper error handling",
					"Use absolute paths when possible",
				)
				break
			case "validation_error":
				methods.push(
					"Add input validation",
					"Use schema validation",
					"Implement type checking",
					"Add boundary condition checks",
				)
				break
			case "rate_limit_error":
				methods.push(
					"Implement rate limiting client-side",
					"Use exponential backoff",
					"Monitor API usage",
					"Cache responses when possible",
				)
				break
			default:
				methods.push(
					"Add comprehensive error handling",
					"Implement logging and monitoring",
					"Use defensive programming practices",
					"Add input validation",
				)
		}

		return methods
	}

	private generatePreventionSuggestions(errorType: string, errorMessage: string): string[] {
		const suggestions: string[] = []
		const pattern = this.errorPatterns.get(errorType)

		if (pattern && pattern.preventionMethods) {
			suggestions.push(...pattern.preventionMethods)
		}

		// Add context-specific suggestions
		if (errorMessage.includes("timeout")) {
			suggestions.push("Increase timeout values", "Optimize operation performance")
		}

		if (errorMessage.includes("not found")) {
			suggestions.push("Validate resource existence", "Use proper error handling")
		}

		return [...new Set(suggestions)] // Remove duplicates
	}

	private calculateErrorProbability(pattern: ErrorPattern, context: ReflectionContext): number {
		// Base probability on frequency and recency
		const timeSinceLastOccurrence = Date.now() - pattern.lastOccurred
		const daysSince = timeSinceLastOccurrence / (24 * 60 * 60 * 1000)

		// Higher frequency and recent occurrences increase probability
		const frequencyFactor = Math.min(pattern.frequency / 10, 1.0)
		const recencyFactor = Math.exp(-daysSince / 7) // Decay over weeks

		// Context similarity
		const contextSimilarity = this.calculateContextSimilarity(pattern.context, this.contextToString(context))

		return frequencyFactor * 0.4 + recencyFactor * 0.3 + contextSimilarity * 0.3
	}

	private getEarlyWarningSignals(pattern: ErrorPattern, context: ReflectionContext): string[] {
		const signals: string[] = []

		// Performance degradation signals
		if (context.performance) {
			if (context.performance.errorRate && context.performance.errorRate > 0.1) {
				signals.push("Elevated error rate detected")
			}
			if (context.performance.efficiencyScore && context.performance.efficiencyScore < 0.6) {
				signals.push("Decreased efficiency observed")
			}
		}

		// Tool usage patterns
		if (context.recentTools && context.recentTools.length > 0) {
			const toolNames = context.recentTools.map((t) => t.name || "unknown")
			if (toolNames.some((name) => pattern.errorType.includes(name))) {
				signals.push(`Similar tool usage pattern to previous ${pattern.errorType}`)
			}
		}

		// Error frequency signals
		if (pattern.frequency > 5) {
			signals.push(`High frequency of ${pattern.errorType} (${pattern.frequency} occurrences)`)
		}

		return signals
	}

	private async learnFromRecovery(
		errorType: string,
		strategy: RecoveryStrategy,
		result: { success: boolean; recoveryTime: number },
		context: ReflectionContext,
	): Promise<void> {
		const learningEvent: LearningEvent = {
			id: this.generateId(),
			timestamp: Date.now(),
			source: "error",
			event: `${errorType} recovery using ${strategy.name}`,
			data: {
				errorType,
				strategyId: strategy.id,
				success: result.success,
				recoveryTime: result.recoveryTime,
				context: this.contextToString(context),
			},
			impact: result.success ? "positive" : "negative",
			confidence: 0.8,
			learningValue: result.success ? 0.9 : 0.7,
		}

		// Update strategy effectiveness based on learning
		if (this.config.adaptiveStrategies) {
			this.updateStrategyPerformance(strategy.id, result.success, result.recoveryTime)
		}

		this.emit("learning_event", learningEvent)
	}

	private contextToString(context: ReflectionContext): string {
		return JSON.stringify({
			taskId: context.taskId,
			step: context.currentStep,
			tools: context.recentTools?.map((t) => t.name || "unknown"),
			errors: context.recentErrors?.slice(0, 3),
			performance: context.performance,
		})
	}

	private calculateContextSimilarity(context1: string, context2: string): number {
		// Simple token-based similarity
		const tokens1 = new Set(context1.toLowerCase().split(/\W+/))
		const tokens2 = new Set(context2.toLowerCase().split(/\W+/))

		const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)))
		const union = new Set([...tokens1, ...tokens2])

		return intersection.size / union.size
	}

	private generateId(): string {
		return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	/**
	 * Clean up resources
	 */
	public dispose(): void {
		this.setActive(false)
		this.removeAllListeners()
		this.errorPatterns.clear()
		this.recoveryStrategies.clear()
		this.activeRecoveries.clear()
	}
}

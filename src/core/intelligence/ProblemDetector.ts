/**
 * TRAE-Agent Problem Detection System
 * Provides predictive problem identification and proactive intervention suggestions
 */

import { EventEmitter } from "events"
import {
	ProblemIndicator,
	ProblemPrediction,
	InterventionSuggestion,
	LearningEvent,
	IntelligenceContext,
} from "./types"
import { ReflectionContext, PerformanceMetrics } from "../reflection/types"

export class ProblemDetector extends EventEmitter {
	private problemHistory: Array<{
		timestamp: number
		problemType: string
		indicators: ProblemIndicator[]
		actualOutcome: "occurred" | "prevented" | "unknown"
		interventionTaken?: string
	}> = []
	private indicatorPatterns: Map<
		string,
		{
			pattern: string
			frequency: number
			accuracy: number
			lastSeen: number
			triggers: string[]
		}
	> = new Map()
	private activeMonitoring: Map<
		string,
		{
			indicators: ProblemIndicator[]
			predictions: ProblemPrediction[]
			startTime: number
		}
	> = new Map()
	private isActive: boolean = true
	private config: {
		enablePredictiveAnalysis: boolean
		detectionSensitivity: number
		interventionThreshold: number
		maxActiveMonitoring: number
		historyRetentionDays: number
	}

	constructor(
		config: Partial<{
			enablePredictiveAnalysis: boolean
			detectionSensitivity: number
			interventionThreshold: number
			maxActiveMonitoring: number
			historyRetentionDays: number
		}> = {},
	) {
		super()

		this.config = {
			enablePredictiveAnalysis: true,
			detectionSensitivity: 0.7,
			interventionThreshold: 0.8,
			maxActiveMonitoring: 20,
			historyRetentionDays: 30,
			...config,
		}

		this.initializeProblemPatterns()
		this.setupPeriodicAnalysis()
	}

	/**
	 * Analyze current context for potential problems and provide predictions
	 */
	public async analyzePotentialProblems(context: ReflectionContext): Promise<ProblemPrediction[]> {
		if (!this.isActive || !this.config.enablePredictiveAnalysis) {
			return []
		}

		const predictions: ProblemPrediction[] = []

		// Detect current indicators
		const indicators = await this.detectProblemIndicators(context)

		if (indicators.length === 0) {
			return []
		}

		// Group indicators by problem type
		const indicatorsByType = this.groupIndicatorsByType(indicators)

		// Generate predictions for each problem type
		for (const [problemType, typeIndicators] of indicatorsByType.entries()) {
			const prediction = await this.generateProblemPrediction(problemType, typeIndicators, context)

			if (prediction && prediction.probability >= this.config.detectionSensitivity) {
				predictions.push(prediction)
			}
		}

		// Sort by probability and impact
		const sortedPredictions = predictions.sort((a, b) => {
			const scoreA = a.probability * this.getImpactWeight(a.impact)
			const scoreB = b.probability * this.getImpactWeight(b.impact)
			return scoreB - scoreA
		})

		// Start monitoring high-priority predictions
		this.startActiveMonitoring(sortedPredictions, context)

		this.emit("problems_analyzed", {
			context: context.taskId,
			predictions: sortedPredictions,
			totalIndicators: indicators.length,
		})

		return sortedPredictions
	}

	/**
	 * Get proactive intervention suggestions for predicted problems
	 */
	public async getInterventionSuggestions(
		predictions: ProblemPrediction[],
		context: ReflectionContext,
	): Promise<InterventionSuggestion[]> {
		if (!this.isActive) return []

		const suggestions: InterventionSuggestion[] = []

		for (const prediction of predictions) {
			if (prediction.probability >= this.config.interventionThreshold) {
				const interventions = await this.generateInterventions(prediction, context)
				suggestions.push(...interventions)
			}
		}

		// Sort by priority and effectiveness
		const sortedSuggestions = suggestions.sort((a, b) => {
			const scoreA = a.priority * 0.6 + a.effectiveness * 0.4
			const scoreB = b.priority * 0.6 + b.effectiveness * 0.4
			return scoreB - scoreA
		})

		this.emit("interventions_suggested", {
			context: context.taskId,
			suggestions: sortedSuggestions.slice(0, 5), // Top 5
		})

		return sortedSuggestions.slice(0, 5)
	}

	/**
	 * Record the outcome of a prediction for learning
	 */
	public async recordPredictionOutcome(
		prediction: ProblemPrediction,
		actualOutcome: "occurred" | "prevented" | "false_positive",
		interventionTaken?: string,
	): Promise<void> {
		if (!this.isActive) return

		const record = {
			timestamp: Date.now(),
			problemType: prediction.problemType,
			indicators: prediction.indicators,
			actualOutcome: actualOutcome === "false_positive" ? ("unknown" as const) : actualOutcome,
			interventionTaken,
		}

		this.problemHistory.push(record)

		// Update pattern accuracy
		await this.updatePatternAccuracy(prediction, actualOutcome === "occurred")

		// Learn from the outcome
		await this.learnFromOutcome(prediction, actualOutcome, interventionTaken)

		this.emit("outcome_recorded", record)
	}

	/**
	 * Get problem detection statistics and insights
	 */
	public getProblemStats(): {
		totalPredictions: number
		accuratePreventions: number
		falsePositives: number
		mostCommonProblems: Array<{ type: string; frequency: number }>
		patternAccuracy: number
		interventionEffectiveness: number
	} {
		const totalPredictions = this.problemHistory.length
		const accuratePreventions = this.problemHistory.filter((p) => p.actualOutcome === "prevented").length
		const falsePositives = this.problemHistory.filter((p) => p.actualOutcome === "unknown").length

		// Calculate most common problems
		const problemFrequency = new Map<string, number>()
		this.problemHistory.forEach((record) => {
			problemFrequency.set(record.problemType, (problemFrequency.get(record.problemType) || 0) + 1)
		})

		const mostCommonProblems = Array.from(problemFrequency.entries())
			.map(([type, frequency]) => ({ type, frequency }))
			.sort((a, b) => b.frequency - a.frequency)
			.slice(0, 5)

		// Calculate pattern accuracy
		const patterns = Array.from(this.indicatorPatterns.values())
		const patternAccuracy =
			patterns.length > 0 ? patterns.reduce((sum, p) => sum + p.accuracy, 0) / patterns.length : 0

		// Calculate intervention effectiveness
		const interventions = this.problemHistory.filter((p) => p.interventionTaken)
		const successfulInterventions = interventions.filter((p) => p.actualOutcome === "prevented")
		const interventionEffectiveness =
			interventions.length > 0 ? successfulInterventions.length / interventions.length : 0

		return {
			totalPredictions,
			accuratePreventions,
			falsePositives,
			mostCommonProblems,
			patternAccuracy,
			interventionEffectiveness,
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

	private initializeProblemPatterns(): void {
		// Initialize common problem patterns
		const commonPatterns = [
			{
				pattern: "performance_degradation",
				triggers: ["high_error_rate", "slow_execution", "memory_usage"],
				frequency: 0,
				accuracy: 0.7,
				lastSeen: 0,
			},
			{
				pattern: "tool_failure_cascade",
				triggers: ["consecutive_failures", "similar_errors", "resource_exhaustion"],
				frequency: 0,
				accuracy: 0.8,
				lastSeen: 0,
			},
			{
				pattern: "context_mismatch",
				triggers: ["low_relevance", "parameter_errors", "validation_failures"],
				frequency: 0,
				accuracy: 0.6,
				lastSeen: 0,
			},
			{
				pattern: "resource_constraints",
				triggers: ["timeout_errors", "memory_limit", "rate_limiting"],
				frequency: 0,
				accuracy: 0.9,
				lastSeen: 0,
			},
		]

		commonPatterns.forEach((pattern) => {
			this.indicatorPatterns.set(pattern.pattern, pattern)
		})
	}

	private setupPeriodicAnalysis(): void {
		// Periodic cleanup and pattern analysis
		setInterval(() => {
			this.cleanupOldHistory()
			this.updatePatternFrequencies()
			this.reviewActiveMonitoring()
		}, 300000) // Every 5 minutes
	}

	private async detectProblemIndicators(context: ReflectionContext): Promise<ProblemIndicator[]> {
		const indicators: ProblemIndicator[] = []

		// Performance-based indicators
		if (context.performance) {
			indicators.push(...this.detectPerformanceIndicators(context.performance, context))
		}

		// Error-based indicators
		if (context.recentErrors && context.recentErrors.length > 0) {
			indicators.push(...this.detectErrorIndicators(context.recentErrors, context))
		}

		// Tool usage indicators
		if (context.recentTools && context.recentTools.length > 0) {
			indicators.push(...this.detectToolUsageIndicators(context.recentTools, context))
		}

		// Context-based indicators
		indicators.push(...this.detectContextIndicators(context))

		return indicators.filter((indicator) => indicator.confidence >= this.config.detectionSensitivity)
	}

	private detectPerformanceIndicators(
		performance: PerformanceMetrics,
		context: ReflectionContext,
	): ProblemIndicator[] {
		const indicators: ProblemIndicator[] = []

		// High error rate indicator
		if (performance.errorRate && performance.errorRate > 0.3) {
			indicators.push({
				id: this.generateId(),
				type: "performance",
				severity: performance.errorRate > 0.5 ? "critical" : "high",
				confidence: Math.min(performance.errorRate * 2, 1.0),
				description: `High error rate detected: ${Math.round(performance.errorRate * 100)}%`,
				triggers: ["high_error_rate"],
				predictions: ["system_instability", "task_failure"],
				preventiveMeasures: [
					"Review recent changes",
					"Implement additional error handling",
					"Reduce task complexity",
				],
				detectedAt: Date.now(),
			})
		}

		// Low efficiency indicator
		if (performance.efficiencyScore && performance.efficiencyScore < 0.4) {
			indicators.push({
				id: this.generateId(),
				type: "performance",
				severity: performance.efficiencyScore < 0.2 ? "high" : "medium",
				confidence: 1 - performance.efficiencyScore,
				description: `Low efficiency detected: ${Math.round(performance.efficiencyScore * 100)}%`,
				triggers: ["low_efficiency"],
				predictions: ["prolonged_execution", "resource_waste"],
				preventiveMeasures: [
					"Optimize tool selection",
					"Reduce unnecessary steps",
					"Improve strategy selection",
				],
				detectedAt: Date.now(),
			})
		}

		// High repetition rate indicator
		if (performance.repetitionRate && performance.repetitionRate > 0.2) {
			indicators.push({
				id: this.generateId(),
				type: "performance",
				severity: "medium",
				confidence: Math.min(performance.repetitionRate * 3, 1.0),
				description: `High repetition rate: ${Math.round(performance.repetitionRate * 100)}%`,
				triggers: ["high_repetition"],
				predictions: ["stuck_loop", "strategy_failure"],
				preventiveMeasures: [
					"Break repetitive patterns",
					"Try alternative approaches",
					"Add variation to strategy",
				],
				detectedAt: Date.now(),
			})
		}

		return indicators
	}

	private detectErrorIndicators(errors: string[], context: ReflectionContext): ProblemIndicator[] {
		const indicators: ProblemIndicator[] = []

		// Analyze error patterns
		const errorTypes = this.categorizeErrors(errors)
		const totalErrors = errors.length

		// Frequent similar errors
		for (const [errorType, count] of Object.entries(errorTypes)) {
			if (count >= 3) {
				indicators.push({
					id: this.generateId(),
					type: "error",
					severity: count >= 5 ? "critical" : "high",
					confidence: Math.min(count / 5, 1.0),
					description: `Recurring ${errorType} errors: ${count} occurrences`,
					triggers: ["recurring_errors", errorType],
					predictions: ["system_failure", "task_abandonment"],
					preventiveMeasures: [
						`Address root cause of ${errorType}`,
						"Implement error recovery",
						"Add input validation",
					],
					detectedAt: Date.now(),
				})
			}
		}

		// Error escalation pattern
		if (totalErrors > 5 && context.currentStep < context.totalSteps * 0.5) {
			indicators.push({
				id: this.generateId(),
				type: "error",
				severity: "high",
				confidence: 0.8,
				description: "Error escalation pattern detected early in task",
				triggers: ["error_escalation", "early_failures"],
				predictions: ["task_failure", "resource_exhaustion"],
				preventiveMeasures: ["Review task approach", "Simplify initial steps", "Add error prevention"],
				detectedAt: Date.now(),
			})
		}

		return indicators
	}

	private detectToolUsageIndicators(tools: any[], context: ReflectionContext): ProblemIndicator[] {
		const indicators: ProblemIndicator[] = []

		// Tool usage frequency analysis
		const toolFrequency = new Map<string, number>()
		tools.forEach((tool) => {
			const toolName = tool.name || "unknown"
			toolFrequency.set(toolName, (toolFrequency.get(toolName) || 0) + 1)
		})

		// Over-reliance on single tool
		const totalTools = tools.length
		for (const [toolName, count] of toolFrequency.entries()) {
			if (count / totalTools > 0.7 && totalTools > 5) {
				indicators.push({
					id: this.generateId(),
					type: "resource",
					severity: "medium",
					confidence: 0.7,
					description: `Over-reliance on ${toolName}: ${Math.round((count / totalTools) * 100)}% usage`,
					triggers: ["tool_overuse", toolName],
					predictions: ["strategy_limitation", "single_point_failure"],
					preventiveMeasures: [
						"Diversify tool usage",
						"Explore alternative approaches",
						"Add fallback strategies",
					],
					detectedAt: Date.now(),
				})
			}
		}

		return indicators
	}

	private detectContextIndicators(context: ReflectionContext): ProblemIndicator[] {
		const indicators: ProblemIndicator[] = []

		// Task progress indicators
		const progress = context.currentStep / Math.max(context.totalSteps, 1)

		// Slow progress indicator
		if (progress < 0.2 && context.currentStep > 10) {
			indicators.push({
				id: this.generateId(),
				type: "context",
				severity: "medium",
				confidence: 0.6,
				description: `Slow task progress: ${Math.round(progress * 100)}% after ${context.currentStep} steps`,
				triggers: ["slow_progress"],
				predictions: ["task_timeout", "approach_ineffectiveness"],
				preventiveMeasures: ["Review task strategy", "Simplify approach", "Break down complex steps"],
				detectedAt: Date.now(),
			})
		}

		// Near completion with errors
		if (progress > 0.8 && context.recentErrors && context.recentErrors.length > 3) {
			indicators.push({
				id: this.generateId(),
				type: "context",
				severity: "high",
				confidence: 0.8,
				description: "Errors occurring near task completion",
				triggers: ["late_stage_errors"],
				predictions: ["completion_failure", "rollback_required"],
				preventiveMeasures: ["Careful final steps", "Add validation", "Create checkpoint before completion"],
				detectedAt: Date.now(),
			})
		}

		return indicators
	}

	private groupIndicatorsByType(indicators: ProblemIndicator[]): Map<string, ProblemIndicator[]> {
		const grouped = new Map<string, ProblemIndicator[]>()

		indicators.forEach((indicator) => {
			// Determine problem type from indicator triggers and type
			const problemType = this.determineProblemType(indicator)

			if (!grouped.has(problemType)) {
				grouped.set(problemType, [])
			}
			grouped.get(problemType)!.push(indicator)
		})

		return grouped
	}

	private determineProblemType(indicator: ProblemIndicator): string {
		// Map indicators to problem types
		if (indicator.triggers.includes("high_error_rate") || indicator.triggers.includes("recurring_errors")) {
			return "error_cascade"
		}

		if (indicator.triggers.includes("low_efficiency") || indicator.triggers.includes("slow_progress")) {
			return "performance_degradation"
		}

		if (indicator.triggers.includes("tool_overuse") || indicator.triggers.includes("high_repetition")) {
			return "strategy_limitation"
		}

		if (indicator.triggers.includes("late_stage_errors")) {
			return "completion_risk"
		}

		return "general_instability"
	}

	private async generateProblemPrediction(
		problemType: string,
		indicators: ProblemIndicator[],
		context: ReflectionContext,
	): Promise<ProblemPrediction | null> {
		const avgConfidence = indicators.reduce((sum, i) => sum + i.confidence, 0) / indicators.length
		const maxSeverity = this.getMaxSeverity(indicators)

		// Calculate probability based on indicators and historical patterns
		let probability = avgConfidence * 0.6

		// Adjust based on historical accuracy
		const pattern = this.indicatorPatterns.get(problemType)
		if (pattern) {
			probability += pattern.accuracy * 0.4
		}

		// Calculate time to occurrence
		const timeToOccurrence = this.estimateTimeToOccurrence(problemType, indicators, context)

		// Generate interventions
		const interventions = await this.generateInterventions(
			{
				problemType,
				probability,
				timeToOccurrence,
				impact: maxSeverity,
				indicators,
				interventions: [],
				confidence: avgConfidence,
				reasoning: indicators.map((i) => i.description),
			},
			context,
		)

		const prediction: ProblemPrediction = {
			problemType,
			probability: Math.min(probability, 1.0),
			timeToOccurrence,
			impact: maxSeverity,
			indicators,
			interventions,
			confidence: avgConfidence,
			reasoning: [
				`Based on ${indicators.length} indicators`,
				`Average confidence: ${Math.round(avgConfidence * 100)}%`,
				`Historical pattern accuracy: ${pattern ? Math.round(pattern.accuracy * 100) : "N/A"}%`,
			],
		}

		return prediction
	}

	private async generateInterventions(
		prediction: ProblemPrediction,
		context: ReflectionContext,
	): Promise<InterventionSuggestion[]> {
		const interventions: InterventionSuggestion[] = []

		// Generate interventions based on problem type
		switch (prediction.problemType) {
			case "error_cascade":
				interventions.push({
					id: this.generateId(),
					type: "preventive",
					description: "Implement comprehensive error handling",
					priority: 9,
					effort: "medium",
					effectiveness: 0.8,
					steps: [
						"Add try-catch blocks around critical operations",
						"Implement retry logic with exponential backoff",
						"Add input validation before operations",
						"Create error recovery strategies",
					],
					timing: "immediate",
				})
				break

			case "performance_degradation":
				interventions.push({
					id: this.generateId(),
					type: "adaptive",
					description: "Optimize execution strategy",
					priority: 7,
					effort: "medium",
					effectiveness: 0.7,
					steps: [
						"Analyze current bottlenecks",
						"Switch to more efficient tools",
						"Reduce unnecessary operations",
						"Implement parallel processing where possible",
					],
					timing: "soon",
				})
				break

			case "strategy_limitation":
				interventions.push({
					id: this.generateId(),
					type: "corrective",
					description: "Diversify approach and tools",
					priority: 6,
					effort: "low",
					effectiveness: 0.6,
					steps: [
						"Identify alternative tools",
						"Implement fallback strategies",
						"Add variation to repeated operations",
						"Break complex tasks into smaller parts",
					],
					timing: "planned",
				})
				break

			case "completion_risk":
				interventions.push({
					id: this.generateId(),
					type: "preventive",
					description: "Secure completion path",
					priority: 8,
					effort: "low",
					effectiveness: 0.9,
					steps: [
						"Create checkpoint before final steps",
						"Add extra validation for completion",
						"Prepare rollback plan",
						"Test completion steps in safe environment",
					],
					timing: "immediate",
				})
				break

			default:
				interventions.push({
					id: this.generateId(),
					type: "preventive",
					description: "General stability improvements",
					priority: 5,
					effort: "medium",
					effectiveness: 0.5,
					steps: [
						"Add monitoring and logging",
						"Implement graceful degradation",
						"Create backup strategies",
						"Increase error tolerance",
					],
					timing: "planned",
				})
		}

		return interventions
	}

	private getMaxSeverity(indicators: ProblemIndicator[]): "low" | "medium" | "high" | "severe" {
		const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 }
		const maxLevel = Math.max(...indicators.map((i) => severityLevels[i.severity] || 1))

		switch (maxLevel) {
			case 4:
				return "severe"
			case 3:
				return "high"
			case 2:
				return "medium"
			default:
				return "low"
		}
	}

	private getImpactWeight(impact: "low" | "medium" | "high" | "severe"): number {
		switch (impact) {
			case "severe":
				return 1.0
			case "high":
				return 0.8
			case "medium":
				return 0.6
			case "low":
				return 0.4
		}
	}

	private estimateTimeToOccurrence(
		problemType: string,
		indicators: ProblemIndicator[],
		context: ReflectionContext,
	): number {
		// Base time estimates (in milliseconds)
		const baseTimeByType: Record<string, number> = {
			error_cascade: 300000, // 5 minutes
			performance_degradation: 600000, // 10 minutes
			strategy_limitation: 900000, // 15 minutes
			completion_risk: 180000, // 3 minutes
			general_instability: 450000, // 7.5 minutes
		}

		let baseTime = baseTimeByType[problemType] || 600000

		// Adjust based on indicator severity
		const avgSeverity =
			indicators.reduce((sum, i) => {
				const severityWeight = { low: 1, medium: 2, high: 3, critical: 4 }
				return sum + (severityWeight[i.severity] || 1)
			}, 0) / indicators.length

		// Higher severity = shorter time to occurrence
		baseTime = baseTime / (avgSeverity * 0.5 + 0.5)

		return Math.max(baseTime, 60000) // Minimum 1 minute
	}

	private startActiveMonitoring(predictions: ProblemPrediction[], context: ReflectionContext): void {
		// Limit active monitoring
		if (this.activeMonitoring.size >= this.config.maxActiveMonitoring) {
			// Remove oldest monitoring
			const oldestKey = Array.from(this.activeMonitoring.keys())[0]
			this.activeMonitoring.delete(oldestKey)
		}

		// Add high-priority predictions to active monitoring
		predictions.slice(0, 3).forEach((prediction) => {
			if (prediction.probability >= 0.7) {
				this.activeMonitoring.set(prediction.problemType, {
					indicators: prediction.indicators,
					predictions: [prediction],
					startTime: Date.now(),
				})
			}
		})
	}

	private async updatePatternAccuracy(prediction: ProblemPrediction, occurred: boolean): Promise<void> {
		const pattern = this.indicatorPatterns.get(prediction.problemType)
		if (!pattern) return

		// Update accuracy using exponential moving average
		const alpha = 0.1
		const newAccuracy = occurred ? 1 : 0
		pattern.accuracy = pattern.accuracy * (1 - alpha) + newAccuracy * alpha
		pattern.frequency++
		pattern.lastSeen = Date.now()
	}

	private async learnFromOutcome(
		prediction: ProblemPrediction,
		outcome: "occurred" | "prevented" | "false_positive",
		intervention?: string,
	): Promise<void> {
		const learningEvent: LearningEvent = {
			id: this.generateId(),
			timestamp: Date.now(),
			source: "problem",
			event: `Problem prediction: ${prediction.problemType}`,
			data: {
				problemType: prediction.problemType,
				outcome,
				intervention,
				probability: prediction.probability,
				confidence: prediction.confidence,
			},
			impact: outcome === "prevented" ? "positive" : outcome === "occurred" ? "negative" : "neutral",
			confidence: prediction.confidence,
			learningValue: outcome === "prevented" ? 0.9 : outcome === "false_positive" ? 0.3 : 0.7,
		}

		this.emit("learning_event", learningEvent)
	}

	private categorizeErrors(errors: string[]): Record<string, number> {
		const categories: Record<string, number> = {}

		errors.forEach((error) => {
			let category = "unknown"
			const lowerError = error.toLowerCase()

			if (lowerError.includes("timeout")) category = "timeout"
			else if (lowerError.includes("permission")) category = "permission"
			else if (lowerError.includes("not found")) category = "not_found"
			else if (lowerError.includes("network")) category = "network"
			else if (lowerError.includes("validation")) category = "validation"
			else if (lowerError.includes("syntax")) category = "syntax"

			categories[category] = (categories[category] || 0) + 1
		})

		return categories
	}

	private cleanupOldHistory(): void {
		const cutoffTime = Date.now() - this.config.historyRetentionDays * 24 * 60 * 60 * 1000
		this.problemHistory = this.problemHistory.filter((record) => record.timestamp > cutoffTime)
	}

	private updatePatternFrequencies(): void {
		// Update pattern frequencies based on recent history
		const recentHistory = this.problemHistory.filter(
			(record) => Date.now() - record.timestamp < 7 * 24 * 60 * 60 * 1000, // Last 7 days
		)

		const frequencies = new Map<string, number>()
		recentHistory.forEach((record) => {
			frequencies.set(record.problemType, (frequencies.get(record.problemType) || 0) + 1)
		})

		for (const [problemType, frequency] of frequencies.entries()) {
			const pattern = this.indicatorPatterns.get(problemType)
			if (pattern) {
				pattern.frequency = frequency
			}
		}
	}

	private reviewActiveMonitoring(): void {
		const now = Date.now()
		const maxAge = 3600000 // 1 hour

		// Remove stale monitoring
		for (const [key, monitoring] of this.activeMonitoring.entries()) {
			if (now - monitoring.startTime > maxAge) {
				this.activeMonitoring.delete(key)
			}
		}
	}

	private generateId(): string {
		return `problem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	/**
	 * Clean up resources
	 */
	public dispose(): void {
		this.setActive(false)
		this.removeAllListeners()
		this.problemHistory.length = 0
		this.indicatorPatterns.clear()
		this.activeMonitoring.clear()
	}
}

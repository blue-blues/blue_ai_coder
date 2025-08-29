/**
 * TRAE-Agent Strategy Adaptation System
 * Provides real-time strategy adjustment based on performance metrics
 */

import { EventEmitter } from "events"
import {
	StrategyPerformance,
	AdaptationContext,
	StrategyRecommendation,
	LearningEvent,
	IntelligenceContext,
} from "./types"
import { ReflectionContext, PerformanceMetrics } from "../reflection/types"

export class StrategyAdapter extends EventEmitter {
	private strategyPerformances: Map<string, StrategyPerformance> = new Map()
	private adaptationHistory: Array<{
		timestamp: number
		fromStrategy: string
		toStrategy: string
		context: string
		reason: string
		outcome: "success" | "failure" | "pending"
	}> = []
	private availableStrategies: Map<
		string,
		{
			id: string
			name: string
			description: string
			applicableContexts: string[]
			basePerformance: number
			adaptabilityScore: number
		}
	> = new Map()
	private isActive: boolean = true
	private config: {
		enableRealTimeAdaptation: boolean
		performanceThreshold: number
		adaptationInterval: number
		confidenceThreshold: number
		maxAdaptationsPerHour: number
	}

	constructor(
		config: Partial<{
			enableRealTimeAdaptation: boolean
			performanceThreshold: number
			adaptationInterval: number
			confidenceThreshold: number
			maxAdaptationsPerHour: number
		}> = {},
	) {
		super()

		this.config = {
			enableRealTimeAdaptation: true,
			performanceThreshold: 0.6,
			adaptationInterval: 180000, // 3 minutes
			confidenceThreshold: 0.7,
			maxAdaptationsPerHour: 10,
			...config,
		}

		this.initializeDefaultStrategies()
		this.setupAdaptationMonitoring()
	}

	/**
	 * Analyze current strategy performance and recommend adaptations
	 */
	public async analyzeAndRecommend(
		currentStrategy: string,
		context: ReflectionContext,
	): Promise<StrategyRecommendation[]> {
		if (!this.isActive || !this.config.enableRealTimeAdaptation) {
			return []
		}

		const adaptationContext: AdaptationContext = {
			currentStrategy,
			performanceMetrics: context.performance || this.getDefaultPerformanceMetrics(),
			contextFactors: this.extractContextFactors(context),
			constraints: this.identifyConstraints(context),
			goals: this.identifyGoals(context),
			timeConstraints: this.calculateTimeConstraints(context),
			resourceConstraints: this.calculateResourceConstraints(context),
		}

		// Check if adaptation is needed
		const needsAdaptation = await this.evaluateAdaptationNeed(adaptationContext)
		if (!needsAdaptation.required) {
			return []
		}

		// Generate strategy recommendations
		const recommendations = await this.generateRecommendations(adaptationContext)

		// Filter and rank recommendations
		const filteredRecommendations = this.filterRecommendations(recommendations, adaptationContext)

		this.emit("recommendations_generated", {
			currentStrategy,
			recommendations: filteredRecommendations,
			reason: needsAdaptation.reason,
		})

		return filteredRecommendations
	}

	/**
	 * Execute strategy adaptation based on recommendation
	 */
	public async executeAdaptation(
		recommendation: StrategyRecommendation,
		context: ReflectionContext,
	): Promise<{
		success: boolean
		newStrategy: string
		adaptationTime: number
		expectedImprovements: string[]
	}> {
		if (!this.isActive) {
			return {
				success: false,
				newStrategy: "",
				adaptationTime: 0,
				expectedImprovements: [],
			}
		}

		const startTime = Date.now()

		try {
			// Record adaptation attempt
			const adaptationRecord = {
				timestamp: startTime,
				fromStrategy: context.taskId, // Use taskId as current strategy identifier
				toStrategy: recommendation.strategyId,
				context: this.contextToString(context),
				reason: recommendation.reasoning.join("; "),
				outcome: "pending" as const,
			}

			// Simulate strategy switch (in real implementation, this would trigger actual strategy changes)
			const success = await this.simulateStrategySwitch(recommendation, context)
			const adaptationTime = Date.now() - startTime

			// Create final adaptation record with proper outcome type
			const finalRecord = {
				...adaptationRecord,
				outcome: success ? ("success" as const) : ("failure" as const),
			}

			this.adaptationHistory.push(finalRecord)

			// Update strategy performance
			await this.updateStrategyPerformance(recommendation.strategyId, success, adaptationTime, context)

			// Learn from adaptation
			await this.learnFromAdaptation(recommendation, success, adaptationTime, context)

			this.emit("adaptation_completed", {
				recommendation,
				success,
				adaptationTime,
				context: context.taskId,
			})

			return {
				success,
				newStrategy: recommendation.strategyId,
				adaptationTime,
				expectedImprovements: success
					? [
							recommendation.expectedOutcome,
							`Estimated time improvement: ${recommendation.estimatedTime}ms`,
							`Risk level: ${recommendation.riskLevel}`,
						]
					: [],
			}
		} catch (error) {
			this.emit("adaptation_error", { error, recommendation, context: context.taskId })

			return {
				success: false,
				newStrategy: "",
				adaptationTime: Date.now() - startTime,
				expectedImprovements: [],
			}
		}
	}

	/**
	 * Get adaptation statistics and insights
	 */
	public getAdaptationStats(): {
		totalAdaptations: number
		successfulAdaptations: number
		averageAdaptationTime: number
		mostSuccessfulStrategies: Array<{ strategy: string; successRate: number }>
		recentAdaptations: Array<{
			timestamp: number
			fromStrategy: string
			toStrategy: string
			outcome: string
		}>
	} {
		const totalAdaptations = this.adaptationHistory.length
		const successfulAdaptations = this.adaptationHistory.filter((a) => a.outcome === "success").length
		const averageAdaptationTime = this.calculateAverageAdaptationTime()

		const strategySuccessRates = this.calculateStrategySuccessRates()
		const mostSuccessfulStrategies = Object.entries(strategySuccessRates)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([strategy, successRate]) => ({ strategy, successRate }))

		return {
			totalAdaptations,
			successfulAdaptations,
			averageAdaptationTime,
			mostSuccessfulStrategies,
			recentAdaptations: this.adaptationHistory.slice(-10).map((a) => ({
				timestamp: a.timestamp,
				fromStrategy: a.fromStrategy,
				toStrategy: a.toStrategy,
				outcome: a.outcome,
			})),
		}
	}

	/**
	 * Add a custom strategy for adaptation
	 */
	public addStrategy(strategy: {
		id: string
		name: string
		description: string
		applicableContexts: string[]
		basePerformance: number
		adaptabilityScore: number
	}): void {
		this.availableStrategies.set(strategy.id, strategy)
		this.emit("strategy_added", strategy)
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
		const defaultStrategies = [
			{
				id: "conservative",
				name: "Conservative Approach",
				description: "Prioritize reliability over speed",
				applicableContexts: ["high_risk", "critical_task", "error_prone"],
				basePerformance: 0.8,
				adaptabilityScore: 0.6,
			},
			{
				id: "aggressive",
				name: "Aggressive Optimization",
				description: "Prioritize speed and efficiency",
				applicableContexts: ["time_critical", "simple_task", "high_confidence"],
				basePerformance: 0.9,
				adaptabilityScore: 0.8,
			},
			{
				id: "balanced",
				name: "Balanced Strategy",
				description: "Balance between reliability and efficiency",
				applicableContexts: ["standard_task", "medium_complexity", "normal_risk"],
				basePerformance: 0.75,
				adaptabilityScore: 0.9,
			},
			{
				id: "experimental",
				name: "Experimental Approach",
				description: "Try innovative solutions with higher risk",
				applicableContexts: ["learning_opportunity", "low_risk", "creative_task"],
				basePerformance: 0.6,
				adaptabilityScore: 0.95,
			},
		]

		defaultStrategies.forEach((strategy) => {
			this.availableStrategies.set(strategy.id, strategy)
			// Initialize performance tracking
			this.strategyPerformances.set(strategy.id, {
				strategyId: strategy.id,
				context: "default",
				successRate: strategy.basePerformance,
				averageTime: 60000, // 1 minute default
				resourceUsage: 0.5,
				userSatisfaction: 0.75,
				adaptabilityScore: strategy.adaptabilityScore,
				lastUpdated: Date.now(),
			})
		})
	}

	private setupAdaptationMonitoring(): void {
		// Periodic adaptation evaluation
		setInterval(() => {
			this.evaluatePeriodicAdaptations()
		}, this.config.adaptationInterval)
	}

	private async evaluateAdaptationNeed(context: AdaptationContext): Promise<{
		required: boolean
		reason: string
		urgency: "low" | "medium" | "high"
	}> {
		const currentPerformance = this.strategyPerformances.get(context.currentStrategy)

		if (!currentPerformance) {
			return {
				required: true,
				reason: "No performance data available for current strategy",
				urgency: "medium",
			}
		}

		// Check performance threshold
		if (currentPerformance.successRate < this.config.performanceThreshold) {
			return {
				required: true,
				reason: `Performance below threshold (${currentPerformance.successRate} < ${this.config.performanceThreshold})`,
				urgency: "high",
			}
		}

		// DEBUG: Log potential null/undefined performance metrics access
		console.log("[DEBUG] StrategyAdapter accessing performanceMetrics without null check")
		console.log("[DEBUG] performanceMetrics structure:", {
			hasPerformanceMetrics: !!context.performanceMetrics,
			hasErrorRate: context.performanceMetrics?.errorRate !== undefined,
			hasEfficiencyScore: context.performanceMetrics?.efficiencyScore !== undefined,
			hasTaskCompletionRate: context.performanceMetrics?.taskCompletionRate !== undefined,
		})
		console.log("[DEBUG] This will cause TS18048 errors if properties are possibly undefined")
		// Check error rate
		if (context.performanceMetrics?.errorRate && context.performanceMetrics.errorRate > 0.2) {
			return {
				required: true,
				reason: `High error rate detected (${context.performanceMetrics.errorRate})`,
				urgency: "high",
			}
		}

		// Check efficiency
		if (context.performanceMetrics?.efficiencyScore && context.performanceMetrics.efficiencyScore < 0.5) {
			return {
				required: true,
				reason: `Low efficiency detected (${context.performanceMetrics.efficiencyScore})`,
				urgency: "medium",
			}
		}

		// Check adaptation frequency limits
		const recentAdaptations = this.adaptationHistory.filter(
			(a) => Date.now() - a.timestamp < 3600000, // Last hour
		)

		if (recentAdaptations.length >= this.config.maxAdaptationsPerHour) {
			return {
				required: false,
				reason: "Adaptation frequency limit reached",
				urgency: "low",
			}
		}

		return {
			required: false,
			reason: "Current strategy performing adequately",
			urgency: "low",
		}
	}

	private async generateRecommendations(context: AdaptationContext): Promise<StrategyRecommendation[]> {
		const recommendations: StrategyRecommendation[] = []

		for (const [strategyId, strategy] of this.availableStrategies.entries()) {
			if (strategyId === context.currentStrategy) continue

			// Check if strategy is applicable to current context
			const contextMatch = this.calculateContextMatch(strategy, context)
			if (contextMatch < 0.3) continue

			const performance = this.strategyPerformances.get(strategyId)
			if (!performance) continue

			const confidence = this.calculateRecommendationConfidence(strategy, performance, context)
			if (confidence < this.config.confidenceThreshold) continue

			const recommendation: StrategyRecommendation = {
				strategyId,
				name: strategy.name,
				description: strategy.description,
				confidence,
				reasoning: this.generateRecommendationReasoning(strategy, performance, context),
				expectedOutcome: this.predictOutcome(strategy, performance, context),
				estimatedTime: this.estimateAdaptationTime(strategy, context),
				riskLevel: this.assessRiskLevel(strategy, context),
				alternatives: this.findAlternativeStrategies(strategyId, context),
			}

			recommendations.push(recommendation)
		}

		return recommendations.sort((a, b) => b.confidence - a.confidence)
	}

	private filterRecommendations(
		recommendations: StrategyRecommendation[],
		context: AdaptationContext,
	): StrategyRecommendation[] {
		// Filter by constraints
		let filtered = recommendations.filter((rec) => {
			// Time constraints
			if (context.timeConstraints && rec.estimatedTime > context.timeConstraints) {
				return false
			}

			// Risk tolerance
			if (context.constraints.includes("low_risk") && rec.riskLevel === "high") {
				return false
			}

			return true
		})

		// Limit to top 3 recommendations
		return filtered.slice(0, 3)
	}

	private calculateContextMatch(strategy: { applicableContexts: string[] }, context: AdaptationContext): number {
		const contextFactorKeys = Object.keys(context.contextFactors)
		const matches = strategy.applicableContexts.filter((ctx) =>
			contextFactorKeys.some((key) => key.includes(ctx) || ctx.includes(key)),
		)

		return matches.length / Math.max(strategy.applicableContexts.length, contextFactorKeys.length)
	}

	private calculateRecommendationConfidence(
		strategy: any,
		performance: StrategyPerformance,
		context: AdaptationContext,
	): number {
		let confidence = performance.successRate * 0.4 // Base success rate
		confidence += performance.adaptabilityScore * 0.3 // Adaptability
		confidence += (performance.userSatisfaction || 0.5) * 0.2 // User satisfaction
		confidence += this.calculateContextMatch(strategy, context) * 0.1 // Context match

		return Math.min(confidence, 1.0)
	}

	private generateRecommendationReasoning(
		strategy: any,
		performance: StrategyPerformance,
		context: AdaptationContext,
	): string[] {
		const reasoning: string[] = []

		if (performance.successRate > 0.8) {
			reasoning.push(`High success rate (${Math.round(performance.successRate * 100)}%)`)
		}

		if (performance.averageTime < 30000) {
			reasoning.push("Fast execution time")
		}

		if (performance.adaptabilityScore > 0.8) {
			reasoning.push("High adaptability to changing conditions")
		}

		if (context.performanceMetrics?.errorRate && context.performanceMetrics.errorRate > 0.1) {
			reasoning.push("Current strategy has elevated error rate")
		}

		if (
			strategy.applicableContexts.some((ctx: string) =>
				Object.keys(context.contextFactors).some((key) => key.includes(ctx)),
			)
		) {
			reasoning.push("Well-suited for current context")
		}

		return reasoning
	}

	private predictOutcome(strategy: any, performance: StrategyPerformance, context: AdaptationContext): string {
		const improvements: string[] = []

		if (
			context.performanceMetrics?.taskCompletionRate &&
			performance.successRate > context.performanceMetrics.taskCompletionRate
		) {
			improvements.push("improved success rate")
		}

		if (performance.averageTime < 60000) {
			improvements.push("faster execution")
		}

		if (performance.resourceUsage < 0.7) {
			improvements.push("reduced resource usage")
		}

		return improvements.length > 0
			? `Expected improvements: ${improvements.join(", ")}`
			: "Maintain current performance levels"
	}

	private estimateAdaptationTime(strategy: any, context: AdaptationContext): number {
		// Base adaptation time
		let time = 30000 // 30 seconds

		// Complexity factors
		if (Object.keys(context.contextFactors).length > 5) {
			time += 15000 // Additional 15 seconds for complex context
		}

		// Strategy complexity
		if (strategy.adaptabilityScore < 0.5) {
			time += 20000 // Additional 20 seconds for less adaptable strategies
		}

		return time
	}

	private assessRiskLevel(strategy: any, context: AdaptationContext): "low" | "medium" | "high" {
		const performance = this.strategyPerformances.get(strategy.id)
		if (!performance) return "high"

		if (performance.successRate > 0.8 && performance.adaptabilityScore > 0.7) {
			return "low"
		} else if (performance.successRate > 0.6 && performance.adaptabilityScore > 0.5) {
			return "medium"
		} else {
			return "high"
		}
	}

	private findAlternativeStrategies(excludeStrategyId: string, context: AdaptationContext): string[] {
		return Array.from(this.availableStrategies.keys())
			.filter((id) => id !== excludeStrategyId)
			.slice(0, 2) // Limit to 2 alternatives
	}

	private async simulateStrategySwitch(
		recommendation: StrategyRecommendation,
		context: ReflectionContext,
	): Promise<boolean> {
		// Simulate strategy switch with success probability based on confidence
		await new Promise((resolve) => setTimeout(resolve, Math.random() * 2000 + 1000))
		return Math.random() < recommendation.confidence
	}

	private async updateStrategyPerformance(
		strategyId: string,
		success: boolean,
		adaptationTime: number,
		context: ReflectionContext,
	): Promise<void> {
		const performance = this.strategyPerformances.get(strategyId)
		if (!performance) return

		// Update success rate using exponential moving average
		const alpha = 0.1
		performance.successRate = performance.successRate * (1 - alpha) + (success ? 1 : 0) * alpha
		performance.averageTime = performance.averageTime * (1 - alpha) + adaptationTime * alpha
		performance.lastUpdated = Date.now()

		this.emit("performance_updated", { strategyId, performance })
	}

	private async learnFromAdaptation(
		recommendation: StrategyRecommendation,
		success: boolean,
		adaptationTime: number,
		context: ReflectionContext,
	): Promise<void> {
		const learningEvent: LearningEvent = {
			id: this.generateId(),
			timestamp: Date.now(),
			source: "strategy",
			event: `Strategy adaptation: ${recommendation.name}`,
			data: {
				strategyId: recommendation.strategyId,
				success,
				adaptationTime,
				confidence: recommendation.confidence,
				riskLevel: recommendation.riskLevel,
				context: this.contextToString(context),
			},
			impact: success ? "positive" : "negative",
			confidence: recommendation.confidence,
			learningValue: success ? 0.8 : 0.6,
		}

		this.emit("learning_event", learningEvent)
	}

	private extractContextFactors(context: ReflectionContext): Record<string, unknown> {
		return {
			taskComplexity: context.totalSteps > 20 ? "high" : context.totalSteps > 10 ? "medium" : "low",
			errorFrequency: (context.recentErrors?.length || 0) > 3 ? "high" : "low",
			toolDiversity: new Set(context.recentTools?.map((t) => t.name)).size || 0,
			performanceScore: context.performance?.efficiencyScore || 0.5,
			timeProgress: context.currentStep / Math.max(context.totalSteps, 1),
		}
	}

	private identifyConstraints(context: ReflectionContext): string[] {
		const constraints: string[] = []

		if (context.performance?.errorRate && context.performance.errorRate > 0.2) {
			constraints.push("high_error_rate")
		}

		if (context.recentErrors && context.recentErrors.length > 5) {
			constraints.push("error_prone_context")
		}

		if (context.currentStep > context.totalSteps * 0.8) {
			constraints.push("near_completion")
		}

		return constraints
	}

	private identifyGoals(context: ReflectionContext): string[] {
		const goals: string[] = ["improve_performance", "reduce_errors"]

		if (context.performance?.efficiencyScore && context.performance.efficiencyScore < 0.6) {
			goals.push("increase_efficiency")
		}

		if (context.performance?.taskCompletionRate && context.performance.taskCompletionRate < 0.8) {
			goals.push("improve_completion_rate")
		}

		return goals
	}

	private calculateTimeConstraints(context: ReflectionContext): number | undefined {
		// Estimate remaining time based on progress
		const progress = context.currentStep / Math.max(context.totalSteps, 1)
		if (progress > 0.8) {
			return 60000 // 1 minute for near-completion tasks
		}
		return undefined
	}

	private calculateResourceConstraints(context: ReflectionContext): Record<string, number> {
		return {
			memory: 0.8, // 80% memory limit
			cpu: 0.7, // 70% CPU limit
			time: 300000, // 5 minutes max
		}
	}

	private getDefaultPerformanceMetrics(): PerformanceMetrics {
		return {
			taskCompletionRate: 0.5,
			averageStepsToCompletion: 10,
			errorRate: 0.1,
			repetitionRate: 0.05,
			adaptabilityScore: 0.6,
			efficiencyScore: 0.7,
			lastCalculatedAt: Date.now(),
		}
	}

	private evaluatePeriodicAdaptations(): void {
		// Periodic evaluation of adaptation opportunities
		// This would be called by the monitoring interval
		this.emit("periodic_evaluation", {
			timestamp: Date.now(),
			activeStrategies: this.strategyPerformances.size,
			recentAdaptations: this.adaptationHistory.filter((a) => Date.now() - a.timestamp < 3600000).length,
		})
	}

	private calculateAverageAdaptationTime(): number {
		if (this.adaptationHistory.length === 0) return 0

		const times = this.adaptationHistory.filter((a) => a.outcome === "success").map((a) => Date.now() - a.timestamp) // This is a simplification

		return times.reduce((sum, time) => sum + time, 0) / times.length
	}

	private calculateStrategySuccessRates(): Record<string, number> {
		const successRates: Record<string, number> = {}

		for (const [strategyId, performance] of this.strategyPerformances.entries()) {
			successRates[strategyId] = performance.successRate
		}

		return successRates
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

	private generateId(): string {
		return `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	/**
	 * Clean up resources
	 */
	public dispose(): void {
		this.setActive(false)
		this.removeAllListeners()
		this.strategyPerformances.clear()
		this.adaptationHistory.length = 0
		this.availableStrategies.clear()
	}
}

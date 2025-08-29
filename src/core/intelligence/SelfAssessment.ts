/**
 * TRAE-Agent Self-Assessment Engine
 *
 * This system enables agents to evaluate their own performance and make continuous improvements.
 * It implements comprehensive performance metrics calculation, trend analysis, strength/weakness
 * identification, and improvement recommendations generation.
 *
 * Key Features:
 * - Performance metrics calculation (accuracy, efficiency, success rates)
 * - Historical trend analysis and comparison
 * - Strength and weakness identification algorithms
 * - Improvement recommendations generation
 * - Self-reflection capabilities with confidence scoring
 * - Learning from assessment outcomes
 * - Integration with Sequential Thinking and Tool Repetition Detection results
 *
 * Assessment Areas:
 * - Task completion success rates
 * - Tool usage effectiveness
 * - Decision-making quality
 * - Problem-solving efficiency
 * - Learning and adaptation rates
 * - Error patterns and recovery
 * - Resource utilization
 * - Time management
 */

import { EventEmitter } from "events"
import {
	LearningEvent,
	IntelligenceContext,
	InterventionSuggestion,
	ToolPerformance,
	StrategyPerformance,
	IntelligenceMetrics,
} from "./types"
import { ReflectionContext, PerformanceMetrics } from "../reflection/types"
import type { UnifiedToolUse } from "../shared/types/unified-types"

// ===== Self-Assessment Types =====

/**
 * Represents a performance assessment result
 */
export interface PerformanceAssessment {
	id: string
	timestamp: number
	assessmentType: "task" | "session" | "tool" | "strategy" | "overall"
	context: string
	metrics: {
		accuracy: number
		efficiency: number
		successRate: number
		adaptability: number
		learningRate: number
		resourceUtilization: number
		timeManagement: number
		errorRecovery: number
	}
	confidence: number
	strengths: string[]
	weaknesses: string[]
	trends: TrendAnalysis[]
	recommendations: string[]
	metadata: Record<string, unknown>
}

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
	metric: string
	direction: "improving" | "declining" | "stable" | "volatile"
	magnitude: number
	confidence: number
	timespan: number
	dataPoints: number
	significance: "high" | "medium" | "low"
	prediction?: {
		nextValue: number
		timeframe: number
		confidence: number
	}
}

/**
 * Historical comparison result
 */
export interface HistoricalComparison {
	metric: string
	currentValue: number
	historicalAverage: number
	percentileRank: number
	improvement: number
	bestPerformance: {
		value: number
		timestamp: number
		context: string
	}
	worstPerformance: {
		value: number
		timestamp: number
		context: string
	}
}

/**
 * Strength/weakness identification result
 */
export interface StrengthWeaknessAnalysis {
	strengths: Array<{
		area: string
		score: number
		confidence: number
		evidence: string[]
		consistency: number
	}>
	weaknesses: Array<{
		area: string
		score: number
		confidence: number
		evidence: string[]
		impact: "high" | "medium" | "low"
		improvability: number
	}>
	balanceScore: number
	overallProfile: string
}

/**
 * Improvement recommendation
 */
export interface ImprovementRecommendation {
	id: string
	category: "skill" | "strategy" | "tool" | "process" | "learning"
	priority: number
	title: string
	description: string
	targetArea: string
	expectedImprovement: number
	effort: "low" | "medium" | "high"
	timeframe: "immediate" | "short" | "medium" | "long"
	actionSteps: string[]
	successMetrics: string[]
	dependencies: string[]
	riskLevel: "low" | "medium" | "high"
}

/**
 * Self-assessment configuration
 */
export interface SelfAssessmentConfig {
	assessmentFrequency: number
	historicalDataRetention: number
	trendAnalysisWindow: number
	confidenceThreshold: number
	recommendationLimit: number
	enablePredictiveAnalysis: boolean
	enableLearningAdaptation: boolean
	performanceTracking: boolean
	detailedLogging: boolean
	integrationEnabled: boolean
}

/**
 * Assessment session context
 */
export interface AssessmentSession {
	id: string
	startTime: number
	endTime?: number
	type: "scheduled" | "triggered" | "manual"
	context: ReflectionContext
	assessments: PerformanceAssessment[]
	totalMetrics: IntelligenceMetrics
	isActive: boolean
}

// ===== Self-Assessment Engine Implementation =====

export class SelfAssessment extends EventEmitter {
	private config: SelfAssessmentConfig
	private assessmentHistory: PerformanceAssessment[] = []
	private currentSession: AssessmentSession | null = null
	private performanceBaselines: Map<
		string,
		{
			value: number
			confidence: number
			lastUpdated: number
			sampleSize: number
		}
	> = new Map()
	private trendCache: Map<string, TrendAnalysis> = new Map()
	private recommendationHistory: Map<
		string,
		{
			recommendation: ImprovementRecommendation
			implemented: boolean
			outcome?: "successful" | "failed" | "partial"
			timestamp: number
		}
	> = new Map()
	private isActive: boolean = true
	private performanceMetrics: {
		totalAssessments: number
		accurateAssessments: number
		recommendationsGenerated: number
		recommendationsImplemented: number
		averageConfidence: number
		assessmentTime: number
	} = {
		totalAssessments: 0,
		accurateAssessments: 0,
		recommendationsGenerated: 0,
		recommendationsImplemented: 0,
		averageConfidence: 0,
		assessmentTime: 0,
	}

	constructor(config: Partial<SelfAssessmentConfig> = {}) {
		super()

		this.config = {
			assessmentFrequency: 300000, // 5 minutes
			historicalDataRetention: 30 * 24 * 60 * 60 * 1000, // 30 days
			trendAnalysisWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
			confidenceThreshold: 0.7,
			recommendationLimit: 10,
			enablePredictiveAnalysis: true,
			enableLearningAdaptation: true,
			performanceTracking: true,
			detailedLogging: true,
			integrationEnabled: true,
			...config,
		}

		this.initializeBaselines()
		this.setupPeriodicAssessment()
		this.setupPerformanceTracking()
	}

	/**
	 * Performs a comprehensive self-assessment of agent performance
	 *
	 * This method analyzes the agent's recent performance across multiple dimensions,
	 * identifies trends, strengths and weaknesses, and generates improvement recommendations.
	 *
	 * @param context - The reflection context containing task and performance data
	 * @param type - The type of assessment to perform ('task', 'session', 'tool', 'strategy', or 'overall')
	 * @returns A complete performance assessment with metrics, trends, and recommendations
	 * @throws Error if the self-assessment engine is not active
	 *
	 * @example
	 * ```typescript
	 * const assessment = await selfAssessment.performSelfAssessment(context, 'session');
	 * console.log(`Assessment confidence: ${assessment.confidence}`);
	 * console.log(`Strengths: ${assessment.strengths.join(', ')}`);
	 * ```
	 */
	public async performSelfAssessment(
		context: ReflectionContext,
		type: PerformanceAssessment["assessmentType"] = "session",
	): Promise<PerformanceAssessment> {
		if (!this.isActive) {
			throw new Error("Self-assessment engine is not active")
		}

		const startTime = Date.now()

		try {
			// Start assessment session
			this.startAssessmentSession(context, type)

			// Calculate performance metrics
			const metrics = await this.calculatePerformanceMetrics(context, type)

			// Perform trend analysis
			const trends = await this.performTrendAnalysis(metrics, context)

			// Identify strengths and weaknesses
			const strengthWeakness = await this.analyzeStrengthsWeaknesses(metrics, trends, context)

			// Generate improvement recommendations
			const recommendations = await this.generateImprovementRecommendations(
				metrics,
				strengthWeakness,
				trends,
				context,
			)

			// Calculate overall confidence
			const confidence = this.calculateAssessmentConfidence(metrics, trends)

			const assessment: PerformanceAssessment = {
				id: this.generateAssessmentId(),
				timestamp: Date.now(),
				assessmentType: type,
				context: this.contextToString(context),
				metrics,
				confidence,
				strengths: strengthWeakness.strengths.map(
					(s) => `${s.area}: ${s.evidence[0] || "consistent performance"}`,
				),
				weaknesses: strengthWeakness.weaknesses.map(
					(w) => `${w.area}: ${w.evidence[0] || "needs improvement"}`,
				),
				trends,
				recommendations: recommendations.slice(0, 5).map((r) => r.title),
				metadata: {
					sessionId: this.currentSession?.id,
					processingTime: Date.now() - startTime,
					dataPoints: this.assessmentHistory.length,
					balanceScore: strengthWeakness.balanceScore,
				},
			}

			// Store assessment
			this.storeAssessment(assessment)

			// Update performance baselines
			await this.updatePerformanceBaselines(assessment)

			// Learn from assessment
			if (this.config.enableLearningAdaptation) {
				await this.learnFromAssessment(assessment, context)
			}

			// Update performance metrics
			this.updateAssessmentMetrics(startTime, confidence)

			this.emit("assessment_completed", assessment)
			return assessment
		} catch (error) {
			this.emit("assessment_error", error)
			throw error
		} finally {
			this.endAssessmentSession()
		}
	}

	/**
	 * Retrieves historical performance comparison for a specific metric
	 *
	 * Compares current performance against historical data to identify improvement
	 * or decline patterns. Calculates percentile rank and identifies best/worst performances.
	 *
	 * @param metric - The performance metric to analyze (e.g., 'accuracy', 'efficiency')
	 * @param timeframe - Optional time window in milliseconds (defaults to all history)
	 * @returns Historical comparison data or null if insufficient data
	 *
	 * @example
	 * ```typescript
	 * const comparison = await selfAssessment.getHistoricalComparison('accuracy', 7 * 24 * 60 * 60 * 1000);
	 * if (comparison) {
	 *   console.log(`Current accuracy: ${comparison.currentValue}`);
	 *   console.log(`Historical average: ${comparison.historicalAverage}`);
	 *   console.log(`Improvement: ${comparison.improvement}%`);
	 * }
	 * ```
	 */
	public async getHistoricalComparison(metric: string, timeframe?: number): Promise<HistoricalComparison | null> {
		if (!this.isActive) return null

		const cutoffTime = timeframe ? Date.now() - timeframe : 0
		const relevantAssessments = this.assessmentHistory.filter((assessment) => assessment.timestamp > cutoffTime)

		if (relevantAssessments.length === 0) return null

		const values = relevantAssessments
			.map((assessment) => this.getMetricValue(assessment.metrics, metric))
			.filter((value) => value !== null) as number[]

		if (values.length === 0) return null

		const currentValue = values[values.length - 1]
		const historicalAverage = values.reduce((sum, val) => sum + val, 0) / values.length

		// Calculate percentile rank
		const sortedValues = [...values].sort((a, b) => a - b)
		const rank = sortedValues.findIndex((val) => val >= currentValue)
		const percentileRank = (rank / (sortedValues.length - 1)) * 100

		const bestPerformance = Math.max(...values)
		const worstPerformance = Math.min(...values)
		const bestIndex = values.findIndex((val) => val === bestPerformance)
		const worstIndex = values.findIndex((val) => val === worstPerformance)

		return {
			metric,
			currentValue,
			historicalAverage,
			percentileRank,
			improvement: ((currentValue - historicalAverage) / historicalAverage) * 100,
			bestPerformance: {
				value: bestPerformance,
				timestamp: relevantAssessments[bestIndex].timestamp,
				context: relevantAssessments[bestIndex].context,
			},
			worstPerformance: {
				value: worstPerformance,
				timestamp: relevantAssessments[worstIndex].timestamp,
				context: relevantAssessments[worstIndex].context,
			},
		}
	}

	/**
	 * Records the outcome of an implemented improvement recommendation
	 *
	 * This method tracks whether recommendations were successful, failed, or partially
	 * implemented, enabling the system to learn from recommendation effectiveness.
	 *
	 * @param recommendationId - Unique identifier of the recommendation
	 * @param outcome - The result of implementing the recommendation
	 * @param feedback - Optional feedback about the implementation experience
	 *
	 * @example
	 * ```typescript
	 * await selfAssessment.recordRecommendationOutcome(
	 *   'rec-123',
	 *   'successful',
	 *   'Tool efficiency improved significantly'
	 * );
	 * ```
	 */
	public async recordRecommendationOutcome(
		recommendationId: string,
		outcome: "successful" | "failed" | "partial",
		feedback?: string,
	): Promise<void> {
		if (!this.isActive) return

		const record = this.recommendationHistory.get(recommendationId)
		if (record) {
			record.implemented = true
			record.outcome = outcome
			record.timestamp = Date.now()

			// Learn from the outcome
			await this.learnFromRecommendationOutcome(record, outcome, feedback)

			this.performanceMetrics.recommendationsImplemented++

			this.emit("recommendation_outcome", {
				recommendationId,
				outcome,
				feedback,
				recommendation: record.recommendation,
			})
		}
	}

	/**
	 * Get current self-assessment statistics
	 */
	public getAssessmentStats(): {
		totalAssessments: number
		averageConfidence: number
		improvementTrends: Record<string, number>
		recommendationEffectiveness: number
		strengthsProfile: string[]
		weaknessesProfile: string[]
		overallGrowth: number
	} {
		const recentAssessments = this.assessmentHistory.slice(-20)

		const improvementTrends: Record<string, number> = {}
		const metricKeys = ["accuracy", "efficiency", "successRate", "adaptability", "learningRate"]

		for (const key of metricKeys) {
			const trend = this.calculateMetricTrend(key, recentAssessments)
			improvementTrends[key] = trend
		}

		const strengthsProfile = this.extractCommonStrengths(recentAssessments)
		const weaknessesProfile = this.extractCommonWeaknesses(recentAssessments)
		const overallGrowth = this.calculateOverallGrowth(recentAssessments)

		const implementedRecommendations = Array.from(this.recommendationHistory.values()).filter((r) => r.implemented)
		const successfulRecommendations = implementedRecommendations.filter((r) => r.outcome === "successful")
		const recommendationEffectiveness =
			implementedRecommendations.length > 0
				? successfulRecommendations.length / implementedRecommendations.length
				: 0

		return {
			totalAssessments: this.performanceMetrics.totalAssessments,
			averageConfidence: this.performanceMetrics.averageConfidence,
			improvementTrends,
			recommendationEffectiveness,
			strengthsProfile,
			weaknessesProfile,
			overallGrowth,
		}
	}

	/**
	 * Set active state
	 */
	public setActive(active: boolean): void {
		this.isActive = active
		this.emit("status_changed", { active })
	}

	/**
	 * Clear assessment history (for testing or reset)
	 */
	public clearHistory(): void {
		this.assessmentHistory = []
		this.trendCache.clear()
		this.recommendationHistory.clear()
		this.performanceBaselines.clear()
		this.performanceMetrics = {
			totalAssessments: 0,
			accurateAssessments: 0,
			recommendationsGenerated: 0,
			recommendationsImplemented: 0,
			averageConfidence: 0,
			assessmentTime: 0,
		}
		this.emit("history_cleared")
	}

	/**
	 * Clean up resources
	 */
	public dispose(): void {
		this.setActive(false)
		this.removeAllListeners()
		this.assessmentHistory = []
		this.trendCache.clear()
		this.recommendationHistory.clear()
		this.performanceBaselines.clear()
		this.currentSession = null
	}

	// ===== Private Helper Methods =====

	private initializeBaselines(): void {
		const defaultBaselines = [
			{ metric: "accuracy", value: 0.7, confidence: 0.5 },
			{ metric: "efficiency", value: 0.6, confidence: 0.5 },
			{ metric: "successRate", value: 0.75, confidence: 0.5 },
			{ metric: "adaptability", value: 0.5, confidence: 0.4 },
			{ metric: "learningRate", value: 0.4, confidence: 0.4 },
			{ metric: "resourceUtilization", value: 0.6, confidence: 0.5 },
			{ metric: "timeManagement", value: 0.5, confidence: 0.4 },
			{ metric: "errorRecovery", value: 0.6, confidence: 0.5 },
		]

		defaultBaselines.forEach((baseline) => {
			this.performanceBaselines.set(baseline.metric, {
				value: baseline.value,
				confidence: baseline.confidence,
				lastUpdated: Date.now(),
				sampleSize: 1,
			})
		})
	}

	private setupPeriodicAssessment(): void {
		if (!this.config.performanceTracking) return
		setInterval(() => {
			this.emit("periodic_assessment_due")
		}, this.config.assessmentFrequency)
	}

	private setupPerformanceTracking(): void {
		if (!this.config.performanceTracking) return
		setInterval(() => {
			if (this.performanceMetrics.totalAssessments > 0) {
				this.emit("performance_update", this.performanceMetrics)
			}
		}, 300000)
		setInterval(() => {
			this.cleanupOldData()
		}, 3600000)
	}

	private startAssessmentSession(context: ReflectionContext, type: PerformanceAssessment["assessmentType"]): void {
		this.currentSession = {
			id: this.generateSessionId(),
			startTime: Date.now(),
			type: type === "session" ? "triggered" : "manual",
			context,
			assessments: [],
			totalMetrics: this.createEmptyIntelligenceMetrics(),
			isActive: true,
		}
		this.emit("assessment_session_started", this.currentSession)
	}

	private endAssessmentSession(): void {
		if (this.currentSession) {
			this.currentSession.endTime = Date.now()
			this.currentSession.isActive = false
			this.emit("assessment_session_ended", {
				sessionId: this.currentSession.id,
				duration: this.currentSession.endTime - this.currentSession.startTime,
				assessments: this.currentSession.assessments.length,
			})
		}
		this.currentSession = null
	}

	private async calculatePerformanceMetrics(
		context: ReflectionContext,
		type: PerformanceAssessment["assessmentType"],
	): Promise<PerformanceAssessment["metrics"]> {
		const performance = context.performance || this.createDefaultPerformanceMetrics()

		return {
			accuracy: this.calculateAccuracy(performance, context),
			efficiency: this.calculateEfficiency(performance, context),
			successRate: this.calculateSuccessRate(context),
			adaptability: this.calculateAdaptability(context),
			learningRate: await this.calculateLearningRate(context),
			resourceUtilization: this.calculateResourceUtilization(performance, context),
			timeManagement: this.calculateTimeManagement(performance, context),
			errorRecovery: this.calculateErrorRecovery(context),
		}
	}

	private calculateAccuracy(performance: PerformanceMetrics, context: ReflectionContext): number {
		const baseAccuracy = performance.taskCompletionRate || 0.5
		const errorPenalty = (performance.errorRate || 0) * 0.3
		const qualityBonus = 0.5 * 0.2 // Default quality bonus since qualityScore is not in PerformanceMetrics
		return Math.max(0, Math.min(1, baseAccuracy - errorPenalty + qualityBonus))
	}

	private calculateEfficiency(performance: PerformanceMetrics, context: ReflectionContext): number {
		const efficiencyScore = performance.efficiencyScore || 0.5
		const repetitionPenalty = (performance.repetitionRate || 0) * 0.2
		return Math.max(0, Math.min(1, efficiencyScore - repetitionPenalty))
	}

	private calculateSuccessRate(context: ReflectionContext): number {
		const recentAssessments = this.assessmentHistory.slice(-10)
		if (recentAssessments.length === 0) return 0.5
		const successfulAssessments = recentAssessments.filter((assessment) => assessment.metrics.accuracy > 0.7)
		return successfulAssessments.length / recentAssessments.length
	}

	private calculateAdaptability(context: ReflectionContext): number {
		const toolVariety = this.calculateToolVariety(context)
		const strategyFlexibility = this.calculateStrategyFlexibility(context)
		const problemSolvingScore = this.calculateProblemSolvingScore(context)
		return toolVariety * 0.3 + strategyFlexibility * 0.4 + problemSolvingScore * 0.3
	}

	private async calculateLearningRate(context: ReflectionContext): Promise<number> {
		const recentAssessments = this.assessmentHistory.slice(-20)
		if (recentAssessments.length < 5) return 0.5
		const improvementTrend = this.calculateOverallImprovementTrend(recentAssessments)
		const knowledgeRetention = this.calculateKnowledgeRetention(context)
		const adaptationSpeed = this.calculateAdaptationSpeed(recentAssessments)
		return improvementTrend * 0.4 + knowledgeRetention * 0.3 + adaptationSpeed * 0.3
	}

	private calculateResourceUtilization(performance: PerformanceMetrics, context: ReflectionContext): number {
		const memoryUsage = this.calculateMemoryEfficiency(context)
		const toolUsage = this.calculateToolEfficiency(context)
		const timeUsage = this.calculateTimeEfficiency(performance)
		return memoryUsage * 0.3 + toolUsage * 0.4 + timeUsage * 0.3
	}

	private calculateTimeManagement(performance: PerformanceMetrics, context: ReflectionContext): number {
		const completionTime = 1000 // Default completion time since it's not in PerformanceMetrics
		const expectedTime = this.estimateExpectedTime(context)
		const timeRatio = expectedTime > 0 ? Math.min(expectedTime / completionTime, 2) : 1
		return Math.max(0, Math.min(1, timeRatio))
	}

	private calculateErrorRecovery(context: ReflectionContext): number {
		const recentErrors = context.recentErrors || []
		if (recentErrors.length === 0) return 1.0
		const recoveryRate = this.calculateRecoveryRate(context)
		const recoverySpeed = this.calculateRecoverySpeed(context)
		const errorPrevention = this.calculateErrorPrevention(context)
		return recoveryRate * 0.4 + recoverySpeed * 0.3 + errorPrevention * 0.3
	}

	private async performTrendAnalysis(
		metrics: PerformanceAssessment["metrics"],
		context: ReflectionContext,
	): Promise<TrendAnalysis[]> {
		const trends: TrendAnalysis[] = []
		const metricKeys = Object.keys(metrics) as Array<keyof typeof metrics>

		for (const metricKey of metricKeys) {
			const trend = await this.analyzeTrendForMetric(metricKey, context)
			if (trend) {
				trends.push(trend)
				this.trendCache.set(metricKey, trend)
			}
		}
		return trends
	}

	private async analyzeTrendForMetric(metric: string, context: ReflectionContext): Promise<TrendAnalysis | null> {
		const recentAssessments = this.assessmentHistory
			.filter((assessment) => Date.now() - assessment.timestamp <= this.config.trendAnalysisWindow)
			.slice(-20)

		if (recentAssessments.length < 3) return null

		const values = recentAssessments
			.map((assessment) => this.getMetricValue(assessment.metrics, metric))
			.filter((value) => value !== null) as number[]

		if (values.length < 3) return null

		const direction = this.determineTrendDirection(values)
		const magnitude = this.calculateTrendMagnitude(values)
		const confidence = this.calculateTrendConfidence(values, direction)
		const significance = this.determineTrendSignificance(magnitude, confidence)

		const trend: TrendAnalysis = {
			metric,
			direction,
			magnitude,
			confidence,
			timespan: this.config.trendAnalysisWindow,
			dataPoints: values.length,
			significance,
		}

		if (this.config.enablePredictiveAnalysis && confidence > 0.7) {
			trend.prediction = this.generateTrendPrediction(values, direction, magnitude)
		}
		return trend
	}

	private async analyzeStrengthsWeaknesses(
		metrics: PerformanceAssessment["metrics"],
		trends: TrendAnalysis[],
		context: ReflectionContext,
	): Promise<StrengthWeaknessAnalysis> {
		const strengths: StrengthWeaknessAnalysis["strengths"] = []
		const weaknesses: StrengthWeaknessAnalysis["weaknesses"] = []

		for (const [metricKey, value] of Object.entries(metrics)) {
			const baseline = this.performanceBaselines.get(metricKey)
			const trend = trends.find((t) => t.metric === metricKey)

			if (this.isStrength(value, baseline, trend)) {
				strengths.push({
					area: metricKey,
					score: value,
					confidence: baseline?.confidence || 0.5,
					evidence: this.generateStrengthEvidence(metricKey, value, trend),
					consistency: this.calculateConsistency(metricKey),
				})
			} else if (this.isWeakness(value, baseline, trend)) {
				weaknesses.push({
					area: metricKey,
					score: value,
					confidence: baseline?.confidence || 0.5,
					evidence: this.generateWeaknessEvidence(metricKey, value, trend),
					impact: this.determineWeaknessImpact(metricKey, value),
					improvability: this.calculateImprovability(metricKey, trend),
				})
			}
		}

		const balanceScore = this.calculateBalanceScore(strengths, weaknesses)
		const overallProfile = this.generateOverallProfile(strengths, weaknesses, balanceScore)

		return { strengths, weaknesses, balanceScore, overallProfile }
	}

	private async generateImprovementRecommendations(
		metrics: PerformanceAssessment["metrics"],
		strengthWeakness: StrengthWeaknessAnalysis,
		trends: TrendAnalysis[],
		context: ReflectionContext,
	): Promise<ImprovementRecommendation[]> {
		const recommendations: ImprovementRecommendation[] = []

		for (const weakness of strengthWeakness.weaknesses) {
			if (weakness.improvability > 0.3) {
				const recommendation = this.createWeaknessRecommendation(weakness, context)
				recommendations.push(recommendation)
			}
		}

		const decliningTrends = trends.filter((t) => t.direction === "declining" && t.significance !== "low")
		for (const trend of decliningTrends) {
			const recommendation = this.createTrendRecommendation(trend, context)
			recommendations.push(recommendation)
		}

		const strategicRecs = await this.generateStrategicRecommendations(context)
		recommendations.push(...strategicRecs)

		recommendations.forEach((rec) => {
			this.recommendationHistory.set(rec.id, {
				recommendation: rec,
				implemented: false,
				timestamp: Date.now(),
			})
		})

		this.performanceMetrics.recommendationsGenerated += recommendations.length
		return recommendations.sort((a, b) => b.priority - a.priority)
	}

	// Utility methods with minimal implementations
	private contextToString(context: ReflectionContext): string {
		return JSON.stringify({
			taskId: context.taskId,
			step: context.currentStep,
			totalSteps: context.totalSteps,
			tools: context.recentTools?.slice(-5).map((t) => t.name || "unknown"),
			errors: context.recentErrors?.length || 0,
			performance: context.performance?.efficiencyScore || 0,
		})
	}

	private storeAssessment(assessment: PerformanceAssessment): void {
		this.assessmentHistory.push(assessment)
		if (this.currentSession) {
			this.currentSession.assessments.push(assessment)
		}
		if (this.assessmentHistory.length > 100) {
			this.assessmentHistory.shift()
		}
	}

	private async updatePerformanceBaselines(assessment: PerformanceAssessment): Promise<void> {
		for (const [metricKey, value] of Object.entries(assessment.metrics)) {
			const baseline = this.performanceBaselines.get(metricKey)
			if (baseline) {
				const alpha = 0.1
				baseline.value = baseline.value * (1 - alpha) + value * alpha
				baseline.confidence = Math.min(baseline.confidence + 0.01, 1.0)
				baseline.lastUpdated = Date.now()
				baseline.sampleSize++
			}
		}
	}

	private async learnFromAssessment(assessment: PerformanceAssessment, context: ReflectionContext): Promise<void> {
		const learningEvent: LearningEvent = {
			id: this.generateId(),
			timestamp: Date.now(),
			source: "strategy",
			event: "assessment_completed",
			data: { assessment, context: context.taskId },
			impact: assessment.confidence > 0.8 ? "positive" : assessment.confidence > 0.6 ? "neutral" : "negative",
			confidence: assessment.confidence,
			learningValue: assessment.confidence * 0.5,
		}
		this.emit("learning_event", learningEvent)
	}

	private async learnFromRecommendationOutcome(
		record: any,
		outcome: "successful" | "failed" | "partial",
		feedback?: string,
	): Promise<void> {
		const learningEvent: LearningEvent = {
			id: this.generateId(),
			timestamp: Date.now(),
			source: "strategy",
			event: "recommendation_outcome",
			data: { outcome, feedback, recommendation: record.recommendation.title },
			impact: outcome === "successful" ? "positive" : outcome === "failed" ? "negative" : "neutral",
			confidence: 0.8,
			learningValue: outcome === "successful" ? 0.8 : 0.3,
		}
		this.emit("learning_event", learningEvent)
	}

	private calculateAssessmentConfidence(metrics: PerformanceAssessment["metrics"], trends: TrendAnalysis[]): number {
		const avgMetricScore = Object.values(metrics).reduce((sum, val) => sum + val, 0) / Object.keys(metrics).length
		const trendConfidence =
			trends.length > 0 ? trends.reduce((sum, t) => sum + t.confidence, 0) / trends.length : 0.5
		const dataPoints = this.assessmentHistory.length
		const dataPointsConfidence = Math.min(dataPoints / 10, 1.0)

		return avgMetricScore * 0.4 + trendConfidence * 0.3 + dataPointsConfidence * 0.3
	}

	private updateAssessmentMetrics(startTime: number, confidence: number): void {
		this.performanceMetrics.totalAssessments++
		this.performanceMetrics.assessmentTime =
			(this.performanceMetrics.assessmentTime * (this.performanceMetrics.totalAssessments - 1) +
				(Date.now() - startTime)) /
			this.performanceMetrics.totalAssessments
		this.performanceMetrics.averageConfidence =
			(this.performanceMetrics.averageConfidence * (this.performanceMetrics.totalAssessments - 1) + confidence) /
			this.performanceMetrics.totalAssessments

		if (confidence > this.config.confidenceThreshold) {
			this.performanceMetrics.accurateAssessments++
		}
	}

	// Minimal implementations for helper methods
	private getMetricValue(metrics: PerformanceAssessment["metrics"], metric: string): number | null {
		return (metrics as any)[metric] || null
	}

	private calculateMetricTrend(metricKey: string, assessments: PerformanceAssessment[]): number {
		if (assessments.length < 2) return 0
		const values = assessments
			.map((a) => this.getMetricValue(a.metrics, metricKey))
			.filter((v) => v !== null) as number[]
		if (values.length < 2) return 0
		return (values[values.length - 1] - values[0]) / values[0]
	}

	private extractCommonStrengths(assessments: PerformanceAssessment[]): string[] {
		const strengthCounts: Record<string, number> = {}
		assessments.forEach((a) => {
			a.strengths.forEach((s) => {
				const area = s.split(":")[0]
				strengthCounts[area] = (strengthCounts[area] || 0) + 1
			})
		})
		return Object.entries(strengthCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3)
			.map(([area]) => area)
	}

	private extractCommonWeaknesses(assessments: PerformanceAssessment[]): string[] {
		const weaknessCounts: Record<string, number> = {}
		assessments.forEach((a) => {
			a.weaknesses.forEach((w) => {
				const area = w.split(":")[0]
				weaknessCounts[area] = (weaknessCounts[area] || 0) + 1
			})
		})
		return Object.entries(weaknessCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3)
			.map(([area]) => area)
	}

	private calculateOverallGrowth(assessments: PerformanceAssessment[]): number {
		if (assessments.length < 2) return 0
		const first = assessments[0]
		const last = assessments[assessments.length - 1]
		const firstAvg =
			Object.values(first.metrics).reduce((sum, val) => sum + val, 0) / Object.keys(first.metrics).length
		const lastAvg =
			Object.values(last.metrics).reduce((sum, val) => sum + val, 0) / Object.keys(last.metrics).length
		return (lastAvg - firstAvg) / firstAvg
	}

	private createDefaultPerformanceMetrics(): PerformanceMetrics {
		return {
			taskCompletionRate: 0.5,
			errorRate: 0.1,
			efficiencyScore: 0.6,
			repetitionRate: 0.05,
		}
	}

	private createEmptyIntelligenceMetrics(): IntelligenceMetrics {
		return {
			contextMemoryHitRate: 0,
			errorRecoverySuccessRate: 0,
			strategyAdaptationEffectiveness: 0,
			toolRecommendationAccuracy: 0,
			problemPredictionAccuracy: 0,
			overallIntelligenceScore: 0,
			learningVelocity: 0,
			adaptationSpeed: 0,
			lastUpdated: Date.now(),
		}
	}

	private calculateToolVariety(context: ReflectionContext): number {
		const tools = context.recentTools || []
		if (tools.length === 0) return 0.5
		const uniqueTools = new Set(tools.map((t) => t.name || "unknown"))
		return Math.min(uniqueTools.size / Math.max(tools.length, 5), 1.0)
	}

	private calculateStrategyFlexibility(context: ReflectionContext): number {
		return 0.5 // Simplified implementation
	}

	private calculateProblemSolvingScore(context: ReflectionContext): number {
		const errors = context.recentErrors || []
		const errorRate = errors.length / Math.max(context.currentStep, 1)
		return Math.max(0, 1 - errorRate)
	}

	private calculateOverallImprovementTrend(assessments: PerformanceAssessment[]): number {
		if (assessments.length < 3) return 0.5
		const scores = assessments.map(
			(a) => Object.values(a.metrics).reduce((sum, val) => sum + val, 0) / Object.keys(a.metrics).length,
		)
		let improvements = 0
		for (let i = 1; i < scores.length; i++) {
			if (scores[i] > scores[i - 1]) improvements++
		}
		return improvements / (scores.length - 1)
	}

	private calculateKnowledgeRetention(context: ReflectionContext): number {
		return 0.6 // Simplified implementation
	}

	private calculateAdaptationSpeed(assessments: PerformanceAssessment[]): number {
		return 0.5 // Simplified implementation
	}

	private calculateMemoryEfficiency(context: ReflectionContext): number {
		return 0.7 // Simplified implementation
	}

	private calculateToolEfficiency(context: ReflectionContext): number {
		const tools = context.recentTools || []
		return tools.length > 0 ? Math.min(1.0, 5 / tools.length) : 0.5
	}

	private calculateTimeEfficiency(performance: PerformanceMetrics): number {
		const completionTime = 1000 // Default since averageCompletionTime is not in PerformanceMetrics
		return Math.min(1.0, 1000 / completionTime)
	}

	private estimateExpectedTime(context: ReflectionContext): number {
		return context.totalSteps * 100 // Simplified estimation
	}

	private calculateRecoveryRate(context: ReflectionContext): number {
		return 0.7 // Simplified implementation
	}

	private calculateRecoverySpeed(context: ReflectionContext): number {
		return 0.6 // Simplified implementation
	}

	private calculateErrorPrevention(context: ReflectionContext): number {
		const errors = context.recentErrors || []
		return Math.max(0, 1 - errors.length / 10)
	}

	private determineTrendDirection(values: number[]): TrendAnalysis["direction"] {
		if (values.length < 2) return "stable"
		const first = values[0]
		const last = values[values.length - 1]
		const change = (last - first) / first
		if (Math.abs(change) < 0.05) return "stable"
		if (change > 0.1) return "improving"
		if (change < -0.1) return "declining"
		return "stable"
	}

	private calculateTrendMagnitude(values: number[]): number {
		if (values.length < 2) return 0
		const first = values[0]
		const last = values[values.length - 1]
		return Math.abs((last - first) / first)
	}

	private calculateTrendConfidence(values: number[], direction: TrendAnalysis["direction"]): number {
		const variance = this.calculateVariance(values)
		const baseConfidence = direction === "stable" ? 0.8 : 0.7
		return Math.max(0.1, baseConfidence - variance * 0.5)
	}

	private determineTrendSignificance(magnitude: number, confidence: number): TrendAnalysis["significance"] {
		const score = magnitude * confidence
		if (score > 0.15) return "high"
		if (score > 0.05) return "medium"
		return "low"
	}

	private generateTrendPrediction(
		values: number[],
		direction: TrendAnalysis["direction"],
		magnitude: number,
	): TrendAnalysis["prediction"] {
		const lastValue = values[values.length - 1]
		const change = direction === "improving" ? magnitude : direction === "declining" ? -magnitude : 0
		return {
			nextValue: Math.max(0, Math.min(1, lastValue + change)),
			timeframe: 300000, // 5 minutes
			confidence: 0.6,
		}
	}

	private isStrength(value: number, baseline: any, trend?: TrendAnalysis): boolean {
		const baselineValue = baseline?.value || 0.5
		return value > baselineValue + 0.1 && (trend?.direction === "improving" || trend?.direction === "stable")
	}

	private isWeakness(value: number, baseline: any, trend?: TrendAnalysis): boolean {
		const baselineValue = baseline?.value || 0.5
		return value < baselineValue - 0.1 || trend?.direction === "declining"
	}

	private generateStrengthEvidence(metricKey: string, value: number, trend?: TrendAnalysis): string[] {
		return [`Consistently high performance in ${metricKey}`, `Score: ${(value * 100).toFixed(1)}%`]
	}

	private generateWeaknessEvidence(metricKey: string, value: number, trend?: TrendAnalysis): string[] {
		return [`Below average performance in ${metricKey}`, `Score: ${(value * 100).toFixed(1)}%`]
	}

	private calculateConsistency(metricKey: string): number {
		const recentValues = this.assessmentHistory
			.slice(-10)
			.map((a) => this.getMetricValue(a.metrics, metricKey))
			.filter((v) => v !== null) as number[]
		if (recentValues.length < 2) return 0.5
		const variance = this.calculateVariance(recentValues)
		return Math.max(0, 1 - variance)
	}

	private determineWeaknessImpact(metricKey: string, value: number): "high" | "medium" | "low" {
		if (value < 0.3) return "high"
		if (value < 0.5) return "medium"
		return "low"
	}

	private calculateImprovability(metricKey: string, trend?: TrendAnalysis): number {
		const baseImprovability = 0.7
		const trendBonus = trend?.direction === "improving" ? 0.2 : trend?.direction === "declining" ? -0.1 : 0
		return Math.max(0, Math.min(1, baseImprovability + trendBonus))
	}

	private calculateBalanceScore(strengths: any[], weaknesses: any[]): number {
		const totalAreas = strengths.length + weaknesses.length
		if (totalAreas === 0) return 0.5
		return strengths.length / totalAreas
	}

	private generateOverallProfile(strengths: any[], weaknesses: any[], balanceScore: number): string {
		if (balanceScore > 0.7) return "Strong performer with consistent capabilities"
		if (balanceScore > 0.5) return "Balanced performer with room for improvement"
		return "Developing performer with significant growth opportunities"
	}

	private createWeaknessRecommendation(weakness: any, context: ReflectionContext): ImprovementRecommendation {
		return {
			id: this.generateId(),
			category: "skill",
			priority: weakness.impact === "high" ? 9 : weakness.impact === "medium" ? 6 : 3,
			title: `Improve ${weakness.area}`,
			description: `Focus on enhancing ${weakness.area} performance`,
			targetArea: weakness.area,
			expectedImprovement: weakness.improvability * 100,
			effort: weakness.improvability > 0.7 ? "low" : weakness.improvability > 0.4 ? "medium" : "high",
			timeframe: weakness.impact === "high" ? "immediate" : "short",
			actionSteps: [
				`Analyze current ${weakness.area} patterns`,
				`Implement targeted improvements`,
				`Monitor progress regularly`,
			],
			successMetrics: [`Increase ${weakness.area} score by 20%`, "Maintain improvement for 1 week"],
			dependencies: [],
			riskLevel: "low",
		}
	}

	private createTrendRecommendation(trend: TrendAnalysis, context: ReflectionContext): ImprovementRecommendation {
		return {
			id: this.generateId(),
			category: "strategy",
			priority: trend.significance === "high" ? 8 : 5,
			title: `Address declining ${trend.metric}`,
			description: `Reverse negative trend in ${trend.metric}`,
			targetArea: trend.metric,
			expectedImprovement: 30,
			effort: "medium",
			timeframe: "short",
			actionSteps: [
				`Identify root cause of ${trend.metric} decline`,
				"Implement corrective measures",
				"Monitor trend reversal",
			],
			successMetrics: [`Stop ${trend.metric} decline`, "Achieve positive trend"],
			dependencies: [],
			riskLevel: "medium",
		}
	}

	private async generateStrategicRecommendations(context: ReflectionContext): Promise<ImprovementRecommendation[]> {
		return [
			{
				id: this.generateId(),
				category: "learning",
				priority: 5,
				title: "Enhance continuous learning",
				description: "Implement systematic learning from each task",
				targetArea: "learningRate",
				expectedImprovement: 25,
				effort: "low",
				timeframe: "medium",
				actionSteps: [
					"Document lessons learned",
					"Review performance patterns",
					"Apply insights to future tasks",
				],
				successMetrics: ["Improved learning rate", "Better pattern recognition"],
				dependencies: [],
				riskLevel: "low",
			},
		]
	}

	private calculateVariance(values: number[]): number {
		if (values.length < 2) return 0
		const mean = values.reduce((sum, val) => sum + val, 0) / values.length
		const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
		return variance
	}

	private cleanupOldData(): void {
		const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days retention
		this.assessmentHistory = this.assessmentHistory.filter((a) => a.timestamp > cutoffTime)

		// Clean up recommendation history Map
		for (const [key, value] of this.recommendationHistory.entries()) {
			if (value.timestamp < cutoffTime) {
				this.recommendationHistory.delete(key)
			}
		}
	}

	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	}

	private generateAssessmentId(): string {
		return `assessment-${this.generateId()}`
	}

	private generateSessionId(): string {
		return `session-${this.generateId()}`
	}
}

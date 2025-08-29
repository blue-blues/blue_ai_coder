/**
 * TRAE-Agent Enhanced Self-Assessment Module
 * Provides performance evaluation and self-improvement capabilities
 */

import { EventEmitter } from "events"
import {
	PerformanceMetrics,
	SelfAssessment as SelfAssessmentType,
	ReflectionContext,
	ReflectionResult,
	ReflectionEvent,
} from "./types"

export interface SelfAssessmentConfig {
	windowSize: number
	assessmentInterval: number
	confidenceThreshold?: number
	enableTrendAnalysis?: boolean
}

export class SelfAssessment extends EventEmitter {
	private config: SelfAssessmentConfig
	private performanceHistory: PerformanceMetrics[] = []
	private assessmentHistory: SelfAssessmentType[] = []
	private lastAssessmentTime: number = 0
	private eventBuffer: ReflectionEvent[] = []

	constructor(config: SelfAssessmentConfig) {
		super()
		this.config = {
			confidenceThreshold: 0.7,
			enableTrendAnalysis: true,
			...config,
		}
	}

	/**
	 * Perform self-assessment based on current context
	 */
	public async assess(context: ReflectionContext): Promise<ReflectionResult> {
		try {
			const currentTime = Date.now()
			const shouldPerformAssessment = this.shouldPerformAssessment(currentTime)

			if (!shouldPerformAssessment) {
				return this.getLastAssessmentResult()
			}

			// Calculate current performance metrics
			const currentMetrics = this.calculateCurrentMetrics(context)

			// Perform comprehensive assessment
			const assessment = await this.performAssessment(context, currentMetrics)

			// Update history
			this.performanceHistory.push(currentMetrics)
			this.assessmentHistory.push(assessment)
			this.lastAssessmentTime = currentTime

			// Trim history to maintain window size
			this.trimHistory()

			// Emit assessment completed event
			this.emit("assessment_completed", assessment)

			return {
				success: true,
				insights: this.extractInsights(assessment),
				recommendations: assessment.improvements,
				confidence: assessment.confidence,
				nextSteps: assessment.nextActions,
				metadata: {
					assessmentId: assessment.id,
					metrics: currentMetrics,
					trends: this.config.enableTrendAnalysis ? this.analyzeTrends() : undefined,
				},
			}
		} catch (error) {
			return {
				success: false,
				insights: [],
				recommendations: [`Self-assessment failed: ${error instanceof Error ? error.message : String(error)}`],
				confidence: 0,
				nextSteps: ["Review self-assessment configuration"],
				metadata: { error: String(error) },
			}
		}
	}

	/**
	 * Calculate current performance metrics from context
	 */
	private calculateCurrentMetrics(context: ReflectionContext): PerformanceMetrics {
		const totalSteps = Math.max(context.totalSteps, 1)
		const completionRate = context.currentStep / totalSteps

		// Calculate error rate from recent tools and errors
		const recentToolCount = context.recentTools?.length || 1
		const recentErrorCount = context.recentErrors?.length || 0
		const errorRate = recentErrorCount / recentToolCount

		// Calculate efficiency based on steps per completion
		const averageStepsToCompletion = this.calculateAverageStepsToCompletion(context)
		const efficiencyScore = Math.max(0, 1 - (averageStepsToCompletion - 1) / 10)

		// Calculate adaptability based on tool diversity
		const adaptabilityScore = this.calculateAdaptabilityScore(context)

		// Calculate repetition rate
		const repetitionRate = this.calculateRepetitionRate(context)

		return {
			taskCompletionRate: completionRate,
			averageStepsToCompletion,
			errorRate,
			repetitionRate,
			adaptabilityScore,
			efficiencyScore,
			lastCalculatedAt: Date.now(),
		}
	}

	/**
	 * Perform comprehensive self-assessment
	 */
	private async performAssessment(
		context: ReflectionContext,
		metrics: PerformanceMetrics,
	): Promise<SelfAssessmentType> {
		const assessment: SelfAssessmentType = {
			id: this.generateAssessmentId(),
			timestamp: Date.now(),
			context: `Task ${context.taskId} - Step ${context.currentStep}/${context.totalSteps}`,
			metrics,
			strengths: [],
			weaknesses: [],
			improvements: [],
			confidence: 0,
			nextActions: [],
		}

		// Analyze strengths
		assessment.strengths = this.identifyStrengths(metrics, context)

		// Analyze weaknesses
		assessment.weaknesses = this.identifyWeaknesses(metrics, context)

		// Generate improvement suggestions
		assessment.improvements = this.generateImprovements(metrics, context, assessment.weaknesses)

		// Define next actions
		assessment.nextActions = this.defineNextActions(assessment.improvements, context)

		// Calculate overall confidence
		assessment.confidence = this.calculateAssessmentConfidence(assessment, metrics)

		return assessment
	}

	/**
	 * Identify current strengths based on metrics and context
	 */
	private identifyStrengths(metrics: PerformanceMetrics, context: ReflectionContext): string[] {
		const strengths: string[] = []

		if (metrics.taskCompletionRate && metrics.taskCompletionRate > 0.8) {
			strengths.push("High task completion rate indicates strong goal-oriented behavior")
		}

		if (metrics.errorRate !== undefined && metrics.errorRate < 0.1) {
			strengths.push("Low error rate shows careful and accurate execution")
		}

		if (metrics.efficiencyScore && metrics.efficiencyScore > 0.7) {
			strengths.push("High efficiency score demonstrates optimized approach")
		}

		if (metrics.adaptabilityScore && metrics.adaptabilityScore > 0.6) {
			strengths.push("Good adaptability with diverse tool usage")
		}

		if (metrics.repetitionRate && metrics.repetitionRate < 0.2) {
			strengths.push("Low repetition rate indicates varied problem-solving approaches")
		}

		// Context-specific strengths
		if (context.recentTools && context.recentTools.length > 0) {
			const uniqueTools = new Set(context.recentTools.map((t) => t.name)).size
			if (uniqueTools >= 3) {
				strengths.push(`Demonstrates versatility with ${uniqueTools} different tools`)
			}
		}

		return strengths
	}

	/**
	 * Identify current weaknesses based on metrics and context
	 */
	private identifyWeaknesses(metrics: PerformanceMetrics, context: ReflectionContext): string[] {
		const weaknesses: string[] = []

		if (metrics.taskCompletionRate !== undefined && metrics.taskCompletionRate < 0.5) {
			weaknesses.push("Low task completion rate suggests difficulty with goal achievement")
		}

		if (metrics.errorRate !== undefined && metrics.errorRate > 0.3) {
			weaknesses.push("High error rate indicates need for better validation or approach")
		}

		if (metrics.efficiencyScore !== undefined && metrics.efficiencyScore < 0.4) {
			weaknesses.push("Low efficiency score suggests wasteful or redundant actions")
		}

		if (metrics.adaptabilityScore !== undefined && metrics.adaptabilityScore < 0.3) {
			weaknesses.push("Limited adaptability with narrow tool usage patterns")
		}

		if (metrics.repetitionRate !== undefined && metrics.repetitionRate > 0.5) {
			weaknesses.push("High repetition rate indicates stuck patterns or limited strategies")
		}

		if (metrics.averageStepsToCompletion !== undefined && metrics.averageStepsToCompletion > 20) {
			weaknesses.push("Excessive steps to completion suggests inefficient problem-solving")
		}

		// Context-specific weaknesses
		if (
			context.recentErrors &&
			context.recentTools?.length &&
			context.recentErrors.length > context.recentTools.length * 0.5
		) {
			weaknesses.push("Error frequency exceeds acceptable threshold")
		}

		return weaknesses
	}

	/**
	 * Generate improvement suggestions based on weaknesses
	 */
	private generateImprovements(
		metrics: PerformanceMetrics,
		context: ReflectionContext,
		weaknesses: string[],
	): string[] {
		const improvements: string[] = []

		// Error-related improvements
		if (metrics.errorRate !== undefined && metrics.errorRate > 0.2) {
			improvements.push("Implement additional validation steps before executing actions")
			improvements.push("Review and learn from recent error patterns")
		}

		// Efficiency improvements
		if (metrics.efficiencyScore !== undefined && metrics.efficiencyScore < 0.5) {
			improvements.push("Analyze successful completion patterns for optimization opportunities")
			improvements.push("Consider breaking complex tasks into smaller, manageable steps")
		}

		// Adaptability improvements
		if (metrics.adaptabilityScore !== undefined && metrics.adaptabilityScore < 0.4) {
			improvements.push("Explore alternative tools and approaches for current tasks")
			improvements.push("Develop broader problem-solving toolkit")
		}

		// Repetition improvements
		if (metrics.repetitionRate !== undefined && metrics.repetitionRate > 0.4) {
			improvements.push("Implement pattern detection to avoid repetitive behaviors")
			improvements.push("Develop alternative strategies when primary approach fails")
		}

		// Completion rate improvements
		if (metrics.taskCompletionRate !== undefined && metrics.taskCompletionRate < 0.6) {
			improvements.push("Focus on goal clarity and step-by-step progress tracking")
			improvements.push("Implement milestone-based progress evaluation")
		}

		// Context-specific improvements
		const progressRate = context.totalSteps > 0 ? context.currentStep / context.totalSteps : 0
		if (progressRate < 0.3 && context.recentErrors && context.recentErrors.length > 0) {
			improvements.push("Address early-stage errors to prevent cascading issues")
		}

		return improvements
	}

	/**
	 * Define next actions based on improvements
	 */
	private defineNextActions(improvements: string[], context: ReflectionContext): string[] {
		const actions: string[] = []

		// Prioritize actions based on current context
		const progressRate = context.totalSteps > 0 ? context.currentStep / context.totalSteps : 0

		if (progressRate < 0.5) {
			// Early stage - focus on foundation
			actions.push("Establish clear success criteria for current task")
			actions.push("Validate approach with small test steps")
		} else if (progressRate < 0.8) {
			// Mid stage - focus on optimization
			actions.push("Review progress and optimize current approach")
			actions.push("Address any emerging patterns or issues")
		} else {
			// Late stage - focus on completion
			actions.push("Perform thorough validation before final steps")
			actions.push("Prepare for task completion and lessons learned")
		}

		// Add improvement-specific actions
		if (improvements.some((imp) => imp.includes("validation"))) {
			actions.push("Implement enhanced validation protocol")
		}

		if (improvements.some((imp) => imp.includes("alternative"))) {
			actions.push("Research and test alternative approaches")
		}

		return actions.slice(0, 5) // Limit to top 5 actions
	}

	/**
	 * Calculate confidence in the assessment
	 */
	private calculateAssessmentConfidence(assessment: SelfAssessmentType, metrics: PerformanceMetrics): number {
		let confidence = 0.5 // Base confidence

		// Increase confidence based on data quality
		if (this.performanceHistory.length > 5) {
			confidence += 0.1 // More historical data
		}

		// Increase confidence based on consistent metrics
		if (metrics.taskCompletionRate !== undefined && metrics.taskCompletionRate > 0.7) {
			confidence += 0.1
		}

		if (metrics.errorRate !== undefined && metrics.errorRate < 0.2) {
			confidence += 0.1
		}

		// Increase confidence based on assessment completeness
		const totalInsights = assessment.strengths.length + assessment.weaknesses.length
		if (totalInsights >= 3) {
			confidence += 0.1
		}

		if (assessment.improvements.length >= 2) {
			confidence += 0.1
		}

		return Math.min(confidence, 0.95) // Cap at 95%
	}

	/**
	 * Calculate average steps to completion
	 */
	private calculateAverageStepsToCompletion(context: ReflectionContext): number {
		// Use recent performance history if available
		if (this.performanceHistory.length > 0) {
			const recent = this.performanceHistory.slice(-5)
			const avg = recent.reduce((sum, p) => sum + (p.averageStepsToCompletion ?? 1), 0) / recent.length
			return avg
		}

		// Estimate based on current context
		const progressRate = context.totalSteps > 0 ? context.currentStep / context.totalSteps : 0
		if (progressRate > 0) {
			return context.currentStep / progressRate
		}

		return context.currentStep || 1
	}

	/**
	 * Calculate adaptability score based on tool diversity
	 */
	private calculateAdaptabilityScore(context: ReflectionContext): number {
		if (!context.recentTools || context.recentTools.length === 0) {
			return 0.5 // Neutral score
		}

		const uniqueTools = new Set(context.recentTools.map((t) => t.name)).size
		const totalTools = context.recentTools.length

		// Higher diversity = higher adaptability
		const diversityRatio = uniqueTools / Math.min(totalTools, 10) // Cap at 10 for scoring
		return Math.min(diversityRatio, 1.0)
	}

	/**
	 * Calculate repetition rate from recent activities
	 */
	private calculateRepetitionRate(context: ReflectionContext): number {
		if (!context.recentTools || context.recentTools.length < 2) {
			return 0
		}

		const tools = context.recentTools
		let repetitions = 0

		for (let i = 1; i < tools.length; i++) {
			if (tools[i].name === tools[i - 1].name) {
				repetitions++
			}
		}

		return repetitions / (tools.length - 1)
	}

	/**
	 * Analyze performance trends over time
	 */
	private analyzeTrends(): Record<string, string> {
		if (this.performanceHistory.length < 2) {
			return { trend: "insufficient_data" }
		}

		const recent = this.performanceHistory.slice(-3)
		const older = this.performanceHistory.slice(-6, -3)

		if (older.length === 0) {
			return { trend: "establishing_baseline" }
		}

		const recentAvg = {
			completion: recent.reduce((sum, p) => sum + (p.taskCompletionRate ?? 0), 0) / recent.length,
			efficiency: recent.reduce((sum, p) => sum + (p.efficiencyScore ?? 0), 0) / recent.length,
			errors: recent.reduce((sum, p) => sum + (p.errorRate ?? 0), 0) / recent.length,
		}

		const olderAvg = {
			completion: older.reduce((sum, p) => sum + (p.taskCompletionRate ?? 0), 0) / older.length,
			efficiency: older.reduce((sum, p) => sum + (p.efficiencyScore ?? 0), 0) / older.length,
			errors: older.reduce((sum, p) => sum + (p.errorRate ?? 0), 0) / older.length,
		}

		const trends: Record<string, string> = {}

		if (recentAvg.completion > olderAvg.completion + 0.1) {
			trends.completion = "improving"
		} else if (recentAvg.completion < olderAvg.completion - 0.1) {
			trends.completion = "declining"
		} else {
			trends.completion = "stable"
		}

		if (recentAvg.efficiency > olderAvg.efficiency + 0.1) {
			trends.efficiency = "improving"
		} else if (recentAvg.efficiency < olderAvg.efficiency - 0.1) {
			trends.efficiency = "declining"
		} else {
			trends.efficiency = "stable"
		}

		if (recentAvg.errors < olderAvg.errors - 0.05) {
			trends.errors = "improving"
		} else if (recentAvg.errors > olderAvg.errors + 0.05) {
			trends.errors = "worsening"
		} else {
			trends.errors = "stable"
		}

		return trends
	}

	/**
	 * Extract insights from assessment for reporting
	 */
	private extractInsights(assessment: SelfAssessmentType): string[] {
		const insights: string[] = []

		// Add key strengths
		if (assessment.strengths.length > 0) {
			insights.push(`Strengths identified: ${assessment.strengths.slice(0, 2).join(", ")}`)
		}

		// Add critical weaknesses
		if (assessment.weaknesses.length > 0) {
			insights.push(`Areas for improvement: ${assessment.weaknesses.slice(0, 2).join(", ")}`)
		}

		// Add performance summary
		const metrics = assessment.metrics
		insights.push(
			`Performance summary: ${Math.round((metrics.taskCompletionRate ?? 0.7) * 100)}% completion, ${Math.round((metrics.efficiencyScore ?? 0.6) * 100)}% efficiency, ${Math.round((metrics.errorRate ?? 0.1) * 100)}% error rate`,
		)

		return insights
	}

	/**
	 * Check if assessment should be performed based on interval
	 */
	private shouldPerformAssessment(currentTime: number): boolean {
		return currentTime - this.lastAssessmentTime >= this.config.assessmentInterval
	}

	/**
	 * Get result from last assessment if recent enough
	 */
	private getLastAssessmentResult(): ReflectionResult {
		const lastAssessment = this.assessmentHistory[this.assessmentHistory.length - 1]

		if (!lastAssessment) {
			return {
				success: false,
				insights: [],
				recommendations: ["No previous assessment available"],
				confidence: 0,
				nextSteps: ["Perform initial assessment"],
				metadata: {},
			}
		}

		return {
			success: true,
			insights: this.extractInsights(lastAssessment),
			recommendations: lastAssessment.improvements,
			confidence: lastAssessment.confidence,
			nextSteps: lastAssessment.nextActions,
			metadata: {
				assessmentId: lastAssessment.id,
				cached: true,
				timestamp: lastAssessment.timestamp,
			},
		}
	}

	/**
	 * Trim history to maintain window size
	 */
	private trimHistory(): void {
		if (this.performanceHistory.length > this.config.windowSize) {
			this.performanceHistory = this.performanceHistory.slice(-this.config.windowSize)
		}

		if (this.assessmentHistory.length > this.config.windowSize) {
			this.assessmentHistory = this.assessmentHistory.slice(-this.config.windowSize)
		}
	}

	/**
	 * Generate unique assessment ID
	 */
	private generateAssessmentId(): string {
		return `assessment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	}

	/**
	 * Record reflection event
	 */
	public recordEvent(event: ReflectionEvent): void {
		this.eventBuffer.push(event)

		// Keep buffer size manageable
		if (this.eventBuffer.length > 100) {
			this.eventBuffer = this.eventBuffer.slice(-100)
		}
	}

	/**
	 * Get recent events
	 */
	public getRecentEvents(limit: number = 20): ReflectionEvent[] {
		return this.eventBuffer.slice(-limit)
	}

	/**
	 * Get performance history
	 */
	public getPerformanceHistory(limit?: number): PerformanceMetrics[] {
		return limit ? this.performanceHistory.slice(-limit) : [...this.performanceHistory]
	}

	/**
	 * Get assessment history
	 */
	public getAssessmentHistory(limit?: number): SelfAssessmentType[] {
		return limit ? this.assessmentHistory.slice(-limit) : [...this.assessmentHistory]
	}

	/**
	 * Update configuration
	 */
	public updateConfig(newConfig: Partial<SelfAssessmentConfig>): void {
		this.config = { ...this.config, ...newConfig }
	}

	/**
	 * Clean up resources
	 */
	public dispose(): void {
		this.performanceHistory = []
		this.assessmentHistory = []
		this.eventBuffer = []
		this.removeAllListeners()
	}
}

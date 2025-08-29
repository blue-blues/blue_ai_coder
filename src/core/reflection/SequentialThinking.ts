/**
 * TRAE-Agent Enhanced Sequential Thinking Module
 * Provides structured reasoning capabilities with step-by-step analysis
 */

import { EventEmitter } from "events"
import { ThinkingStep, ReasoningChain, ReflectionContext, ReflectionResult } from "./types"

export interface SequentialThinkingConfig {
	maxSteps: number
	confidenceThreshold: number
	timeoutMs?: number
	enableMetaReasoning?: boolean
}

export class SequentialThinking extends EventEmitter {
	private config: SequentialThinkingConfig
	private activeChains: Map<string, ReasoningChain> = new Map()
	private completedChains: ReasoningChain[] = []

	constructor(config: SequentialThinkingConfig) {
		super()
		this.config = {
			timeoutMs: 30000, // 30 seconds
			enableMetaReasoning: true,
			...config,
		}
	}

	/**
	 * Analyze a context using sequential thinking
	 */
	public async analyze(context: ReflectionContext): Promise<ReflectionResult> {
		const chainId = this.generateChainId(context.taskId)

		try {
			const chain = await this.createReasoningChain(chainId, context)
			const result = await this.executeReasoningChain(chain, context)

			this.completedChains.push(chain)
			this.activeChains.delete(chainId)

			this.emit("reasoning_completed", chain)

			return result
		} catch (error) {
			this.activeChains.delete(chainId)

			return {
				success: false,
				insights: [],
				recommendations: [
					`Sequential thinking failed: ${error instanceof Error ? error.message : String(error)}`,
				],
				confidence: 0,
				nextSteps: ["Review reasoning approach"],
				metadata: { error: String(error), chainId },
			}
		}
	}

	/**
	 * Create a new reasoning chain for the given context
	 */
	private async createReasoningChain(chainId: string, context: ReflectionContext): Promise<ReasoningChain> {
		const chain: ReasoningChain = {
			id: chainId,
			startTime: Date.now(),
			context: `Task ${context.taskId} - Step ${context.currentStep}/${context.totalSteps}`,
			steps: [],
			confidence: 0,
			alternatives: [],
		}

		this.activeChains.set(chainId, chain)
		return chain
	}

	/**
	 * Execute the reasoning chain step by step
	 */
	private async executeReasoningChain(chain: ReasoningChain, context: ReflectionContext): Promise<ReflectionResult> {
		const insights: string[] = []
		const recommendations: string[] = []
		const nextSteps: string[] = []

		// Step 1: Observation - Analyze current state
		const observationStep = await this.addThinkingStep(chain, {
			type: "observation",
			content: this.generateObservation(context),
			confidence: 0.8,
			dependencies: [],
			metadata: { stepType: "observation", contextAnalysis: true },
		})

		// Step 2: Analysis - Identify patterns and issues
		const analysisStep = await this.addThinkingStep(chain, {
			type: "analysis",
			content: this.generateAnalysis(context),
			confidence: 0.7,
			dependencies: [observationStep.id],
			metadata: { stepType: "analysis", basedOn: "observation" },
		})

		// Step 3: Hypothesis - Form potential explanations
		const hypotheses = this.generateHypotheses(context)
		const hypothesisSteps: ThinkingStep[] = []

		for (const hypothesis of hypotheses.slice(0, 3)) {
			// Limit to top 3 hypotheses
			const step = await this.addThinkingStep(chain, {
				type: "hypothesis",
				content: hypothesis,
				confidence: 0.6,
				dependencies: [analysisStep.id],
				metadata: { stepType: "hypothesis", hypothesisIndex: hypothesisSteps.length },
			})
			hypothesisSteps.push(step)
		}

		// Step 4: Decision - Choose best course of action
		const decisionStep = await this.addThinkingStep(chain, {
			type: "decision",
			content: this.generateDecision(context, hypotheses),
			confidence: 0.75,
			dependencies: hypothesisSteps.map((s) => s.id),
			metadata: { stepType: "decision", basedOnHypotheses: hypothesisSteps.length },
		})

		// Step 5: Reflection - Meta-analysis of reasoning process
		if (this.config.enableMetaReasoning) {
			const reflectionStep = await this.addThinkingStep(chain, {
				type: "reflection",
				content: this.generateMetaReflection(chain),
				confidence: 0.8,
				dependencies: [decisionStep.id],
				metadata: { stepType: "reflection", metaReasoning: true },
			})
		}

		// Finalize chain
		chain.endTime = Date.now()
		chain.confidence = this.calculateChainConfidence(chain)
		chain.conclusion = decisionStep.content

		// Extract insights and recommendations from reasoning
		insights.push(...this.extractInsights(chain))
		recommendations.push(...this.extractRecommendations(chain))
		nextSteps.push(...this.extractNextSteps(chain))

		return {
			success: true,
			insights,
			recommendations,
			confidence: chain.confidence,
			nextSteps,
			metadata: {
				chainId: chain.id,
				steps: chain.steps.length,
				duration: (chain.endTime || Date.now()) - chain.startTime,
				reasoning: chain.steps.map((s) => s.content),
			},
		}
	}

	/**
	 * Add a thinking step to the reasoning chain
	 */
	private async addThinkingStep(
		chain: ReasoningChain,
		stepData: Omit<ThinkingStep, "id" | "timestamp">,
	): Promise<ThinkingStep> {
		const step: ThinkingStep = {
			id: this.generateStepId(),
			timestamp: Date.now(),
			...stepData,
		}

		chain.steps.push(step)

		// Emit step for real-time monitoring
		this.emit("thinking_step", { chainId: chain.id, step })

		return step
	}

	/**
	 * Generate observation about current context
	 */
	private generateObservation(context: ReflectionContext): string {
		const observations: string[] = []

		observations.push(`Current task progress: ${context.currentStep}/${context.totalSteps} steps completed`)

		if (context.recentTools && context.recentTools.length > 0) {
			const toolCount = context.recentTools.length
			const uniqueTools = new Set(context.recentTools.map((t) => t.name)).size
			observations.push(`Recent activity: ${toolCount} tool uses across ${uniqueTools} different tools`)
		}

		if (context.recentErrors && context.recentErrors.length > 0) {
			observations.push(`${context.recentErrors.length} recent errors detected`)
		}

		if (context.performance) {
			const perf = context.performance
			observations.push(
				`Performance metrics: ${Math.round((perf.taskCompletionRate ?? 0) * 100)}% completion rate, ${Math.round((perf.efficiencyScore ?? 0) * 100)}% efficiency`,
			)
		}

		return `Observations: ${observations.join("; ")}`
	}

	/**
	 * Generate analysis of current situation
	 */
	private generateAnalysis(context: ReflectionContext): string {
		const analyses: string[] = []

		// Analyze progress rate
		const progressRate = context.totalSteps > 0 ? context.currentStep / context.totalSteps : 0
		if (progressRate < 0.3) {
			analyses.push("Task is in early stages, establishing foundation")
		} else if (progressRate < 0.7) {
			analyses.push("Task is progressing steadily, maintaining momentum")
		} else {
			analyses.push("Task is in final stages, focusing on completion")
		}

		// Analyze tool usage patterns
		if (context.recentTools && context.recentTools.length > 0) {
			const toolFreq = this.calculateToolFrequency(context.recentTools)
			const dominantTool = Object.entries(toolFreq).sort(([, a], [, b]) => b - a)[0]
			if (dominantTool && dominantTool[1] / context.recentTools.length > 0.5) {
				analyses.push(
					`Heavy reliance on ${dominantTool[0]} tool (${Math.round((dominantTool[1] / context.recentTools.length) * 100)}% usage)`,
				)
			}
		}

		// Analyze error patterns
		if (context.recentErrors && context.recentErrors.length > 0) {
			const errorRate = context.recentErrors.length / Math.max(context.recentTools?.length || 1, 1)
			if (errorRate > 0.3) {
				analyses.push("High error rate indicates potential approach issues")
			}
		}

		return `Analysis: ${analyses.join("; ")}`
	}

	/**
	 * Generate hypotheses about current situation
	 */
	private generateHypotheses(context: ReflectionContext): string[] {
		const hypotheses: string[] = []

		// Performance-based hypotheses
		if (context.performance) {
			if (context.performance.efficiencyScore !== undefined && context.performance.efficiencyScore < 0.6) {
				hypotheses.push("Current approach may be inefficient, consider alternative strategies")
			}
			if (context.performance.errorRate !== undefined && context.performance.errorRate > 0.2) {
				hypotheses.push("High error rate suggests need for better validation or different tools")
			}
			if (context.performance.adaptabilityScore !== undefined && context.performance.adaptabilityScore < 0.5) {
				hypotheses.push("Low adaptability indicates rigid approach, may need more flexible strategy")
			}
		}

		// Tool usage hypotheses
		if (context.recentTools && context.recentTools.length > 0) {
			const toolFreq = this.calculateToolFrequency(context.recentTools)
			const toolCount = Object.keys(toolFreq).length
			if (toolCount < 3) {
				hypotheses.push("Limited tool diversity may be constraining problem-solving capability")
			}
		}

		// Progress-based hypotheses
		const progressRate = context.totalSteps > 0 ? context.currentStep / context.totalSteps : 0
		if (progressRate > 0.8 && context.recentErrors && context.recentErrors.length > 0) {
			hypotheses.push("Late-stage errors suggest need for careful validation before completion")
		}

		// Default hypothesis if none generated
		if (hypotheses.length === 0) {
			hypotheses.push("Current approach appears stable, continue with monitoring")
		}

		return hypotheses
	}

	/**
	 * Generate decision based on analysis and hypotheses
	 */
	private generateDecision(context: ReflectionContext, hypotheses: string[]): string {
		const decisions: string[] = []

		// Prioritize decisions based on context
		if (context.performance && context.performance.errorRate !== undefined && context.performance.errorRate > 0.3) {
			decisions.push("Priority: Implement error reduction strategies")
		}

		if (
			context.performance &&
			context.performance.efficiencyScore !== undefined &&
			context.performance.efficiencyScore < 0.5
		) {
			decisions.push("Priority: Optimize current approach for better efficiency")
		}

		// Choose primary hypothesis to act on
		if (hypotheses.length > 0) {
			decisions.push(`Primary action: ${hypotheses[0]}`)
		}

		// Add secondary considerations
		if (hypotheses.length > 1) {
			decisions.push(`Secondary consideration: ${hypotheses[1]}`)
		}

		return decisions.join("; ")
	}

	/**
	 * Generate meta-reflection on reasoning process
	 */
	private generateMetaReflection(chain: ReasoningChain): string {
		const reflections: string[] = []

		reflections.push(`Reasoning chain completed with ${chain.steps.length} steps`)

		const avgConfidence = chain.steps.reduce((sum, step) => sum + step.confidence, 0) / chain.steps.length
		reflections.push(`Average step confidence: ${Math.round(avgConfidence * 100)}%`)

		const stepTypes = chain.steps.reduce(
			(acc, step) => {
				acc[step.type] = (acc[step.type] || 0) + 1
				return acc
			},
			{} as Record<string, number>,
		)

		reflections.push(
			`Step distribution: ${Object.entries(stepTypes)
				.map(([type, count]) => `${count} ${type}`)
				.join(", ")}`,
		)

		return `Meta-reflection: ${reflections.join("; ")}`
	}

	/**
	 * Calculate overall confidence for the reasoning chain
	 */
	private calculateChainConfidence(chain: ReasoningChain): number {
		if (chain.steps.length === 0) return 0

		const stepConfidences = chain.steps.map((s) => s.confidence)
		const avgConfidence = stepConfidences.reduce((sum, conf) => sum + conf, 0) / stepConfidences.length

		// Adjust confidence based on chain completeness
		const completenessBonus = Math.min(chain.steps.length / this.config.maxSteps, 1) * 0.1

		return Math.min(avgConfidence + completenessBonus, 1.0)
	}

	/**
	 * Extract insights from reasoning chain
	 */
	private extractInsights(chain: ReasoningChain): string[] {
		const insights: string[] = []

		// Extract from observation and analysis steps
		const observationSteps = chain.steps.filter((s) => s.type === "observation")
		const analysisSteps = chain.steps.filter((s) => s.type === "analysis")

		observationSteps.forEach((step) => {
			if (step.confidence > 0.7) {
				insights.push(`Observation: ${step.content}`)
			}
		})

		analysisSteps.forEach((step) => {
			if (step.confidence > 0.6) {
				insights.push(`Analysis: ${step.content}`)
			}
		})

		return insights
	}

	/**
	 * Extract recommendations from reasoning chain
	 */
	private extractRecommendations(chain: ReasoningChain): string[] {
		const recommendations: string[] = []

		// Extract from hypothesis and decision steps
		const hypothesisSteps = chain.steps.filter((s) => s.type === "hypothesis")
		const decisionSteps = chain.steps.filter((s) => s.type === "decision")

		hypothesisSteps.forEach((step) => {
			if (step.confidence > 0.6 && step.content.includes("consider")) {
				recommendations.push(step.content)
			}
		})

		decisionSteps.forEach((step) => {
			if (step.confidence > 0.7) {
				recommendations.push(step.content)
			}
		})

		return recommendations
	}

	/**
	 * Extract next steps from reasoning chain
	 */
	private extractNextSteps(chain: ReasoningChain): string[] {
		const nextSteps: string[] = []

		// Extract actionable items from decision steps
		const decisionSteps = chain.steps.filter((s) => s.type === "decision")
		decisionSteps.forEach((step) => {
			if (step.content.includes("Priority:")) {
				const priority = step.content.split("Priority:")[1]?.split(";")[0]?.trim()
				if (priority) {
					nextSteps.push(priority)
				}
			}
		})

		// Add generic next step if none found
		if (nextSteps.length === 0) {
			nextSteps.push("Continue monitoring and adjust approach as needed")
		}

		return nextSteps
	}

	private calculateToolFrequency(tools: any[]): Record<string, number> {
		const frequency: Record<string, number> = {}
		tools.forEach((tool) => {
			const toolName = tool.name || "unknown"
			frequency[toolName] = (frequency[toolName] || 0) + 1
		})
		return frequency
	}

	/**
	 * Generate unique chain ID
	 */
	private generateChainId(taskId: string): string {
		return `${taskId}-chain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	}

	/**
	 * Generate unique step ID
	 */
	private generateStepId(): string {
		return `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	}

	/**
	 * Update configuration
	 */
	public updateConfig(newConfig: Partial<SequentialThinkingConfig>): void {
		this.config = { ...this.config, ...newConfig }
	}

	/**
	 * Get active reasoning chains
	 */
	public getActiveChains(): ReasoningChain[] {
		return Array.from(this.activeChains.values())
	}

	/**
	 * Get completed reasoning chains
	 */
	public getCompletedChains(limit: number = 10): ReasoningChain[] {
		return this.completedChains.slice(-limit)
	}

	/**
	 * Clean up resources
	 */
	public dispose(): void {
		this.activeChains.clear()
		this.completedChains = []
		this.removeAllListeners()
	}
}

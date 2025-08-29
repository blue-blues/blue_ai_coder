/**
 * TRAE-Agent Context Memory System
 * Enables cross-task learning and context retention for enhanced accuracy
 */

import { EventEmitter } from "events"
import { ContextMemoryEntry, ContextMemoryConfig, LearningPattern, LearningEvent, IntelligenceContext } from "./types"
import { ReflectionContext } from "../reflection/types"

export class ContextMemory extends EventEmitter {
	private config: ContextMemoryConfig
	private memoryEntries: Map<string, ContextMemoryEntry> = new Map()
	private learningPatterns: Map<string, LearningPattern> = new Map()
	private isActive: boolean = true

	constructor(config: Partial<ContextMemoryConfig> = {}) {
		super()

		this.config = {
			maxEntries: 1000,
			similarityThreshold: 0.7,
			relevanceDecayRate: 0.1,
			patternExtractionEnabled: true,
			crossTaskLearning: true,
			memoryPersistence: true,
			...config,
		}

		this.setupMemoryMaintenance()
	}

	/**
	 * Store a new context memory entry from task execution
	 */
	public async storeContext(
		taskId: string,
		context: ReflectionContext,
		decision: string,
		outcome: "success" | "failure" | "partial",
		learnings: string[] = [],
	): Promise<void> {
		if (!this.isActive) return

		const entry: ContextMemoryEntry = {
			id: this.generateId(),
			taskId,
			timestamp: Date.now(),
			context: this.contextToString(context),
			situation: this.extractSituation(context),
			decision,
			outcome,
			learnings,
			patterns: [],
			similarity: 1.0,
			relevance: 1.0,
		}

		// Extract learning patterns if enabled
		if (this.config.patternExtractionEnabled) {
			entry.patterns = await this.extractPatterns(entry, context)
		}

		this.memoryEntries.set(entry.id, entry)

		// Update existing patterns
		await this.updateLearningPatterns(entry)

		// Maintain memory size limits
		this.maintainMemoryLimits()

		this.emit("context_stored", entry)
	}

	/**
	 * Retrieve relevant context memories for current situation
	 */
	public async retrieveRelevantContext(
		currentContext: ReflectionContext,
		limit: number = 10,
	): Promise<ContextMemoryEntry[]> {
		if (!this.isActive || !this.config.crossTaskLearning) {
			return []
		}

		const currentSituation = this.extractSituation(currentContext)
		const currentContextStr = this.contextToString(currentContext)

		const relevantEntries: Array<ContextMemoryEntry & { score: number }> = []

		for (const entry of this.memoryEntries.values()) {
			const similarity = this.calculateSimilarity(currentContextStr, entry.context)
			const situationMatch = this.calculateSituationMatch(currentSituation, entry.situation)
			const relevance = this.calculateRelevance(entry)

			const score = similarity * 0.4 + situationMatch * 0.4 + relevance * 0.2

			if (score >= this.config.similarityThreshold) {
				relevantEntries.push({ ...entry, score })
			}
		}

		// Sort by relevance score and return top entries
		return relevantEntries
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)
			.map((entry) => {
				const { score, ...contextEntry } = entry
				return contextEntry
			})
	}

	/**
	 * Get learning patterns that match current context
	 */
	public async getApplicablePatterns(
		context: ReflectionContext,
		patternTypes?: Array<"success" | "failure" | "optimization">,
	): Promise<LearningPattern[]> {
		if (!this.isActive || !this.config.patternExtractionEnabled) {
			return []
		}

		const contextStr = this.contextToString(context)
		const applicablePatterns: LearningPattern[] = []

		for (const pattern of this.learningPatterns.values()) {
			// Filter by pattern type if specified
			if (patternTypes && !patternTypes.includes(pattern.patternType)) {
				continue
			}

			// Check if pattern triggers match current context
			const triggerMatch = pattern.triggers.some((trigger) =>
				contextStr.toLowerCase().includes(trigger.toLowerCase()),
			)

			if (triggerMatch && pattern.confidence >= 0.6) {
				applicablePatterns.push(pattern)
			}
		}

		// Sort by effectiveness and confidence
		return applicablePatterns.sort((a, b) => {
			const scoreA = a.effectiveness * 0.6 + a.confidence * 0.4
			const scoreB = b.effectiveness * 0.6 + b.confidence * 0.4
			return scoreB - scoreA
		})
	}

	/**
	 * Learn from a new experience and update patterns
	 */
	public async learnFromExperience(
		context: ReflectionContext,
		action: string,
		result: "success" | "failure" | "partial",
		insights: string[] = [],
	): Promise<void> {
		if (!this.isActive) return

		const learningEvent: LearningEvent = {
			id: this.generateId(),
			timestamp: Date.now(),
			source: "context",
			event: `${action} -> ${result}`,
			data: {
				context: this.contextToString(context),
				action,
				result,
				insights,
			},
			impact: result === "success" ? "positive" : result === "failure" ? "negative" : "neutral",
			confidence: 0.8,
			learningValue: this.calculateLearningValue(result, insights),
		}

		// Update or create learning patterns
		await this.updatePatternsFromLearning(learningEvent)

		this.emit("learning_event", learningEvent)
	}

	/**
	 * Get memory statistics and insights
	 */
	public getMemoryStats(): {
		totalEntries: number
		successfulPatterns: number
		learningPatterns: number
		averageRelevance: number
		memoryUtilization: number
	} {
		const entries = Array.from(this.memoryEntries.values())
		const patterns = Array.from(this.learningPatterns.values())

		return {
			totalEntries: entries.length,
			successfulPatterns: entries.filter((e) => e.outcome === "success").length,
			learningPatterns: patterns.length,
			averageRelevance: entries.reduce((sum, e) => sum + e.relevance, 0) / Math.max(entries.length, 1),
			memoryUtilization: entries.length / this.config.maxEntries,
		}
	}

	/**
	 * Clear memory entries (for testing or reset)
	 */
	public clearMemory(): void {
		this.memoryEntries.clear()
		this.learningPatterns.clear()
		this.emit("memory_cleared")
	}

	/**
	 * Set active state
	 */
	public setActive(active: boolean): void {
		this.isActive = active
		this.emit("status_changed", { active })
	}

	// Private helper methods

	private setupMemoryMaintenance(): void {
		// Periodic memory cleanup and relevance updates
		setInterval(() => {
			this.updateRelevanceScores()
			this.maintainMemoryLimits()
		}, 300000) // Every 5 minutes
	}

	private contextToString(context: ReflectionContext): string {
		return JSON.stringify({
			taskId: context.taskId,
			step: context.currentStep,
			tools: context.recentTools?.map((t) => t.name || "unknown"),
			errors: context.recentErrors?.slice(0, 3), // Limit for brevity
			performance: context.performance,
		})
	}

	private extractSituation(context: ReflectionContext): string {
		const tools = context.recentTools?.slice(-3).map((t) => t.name || "unknown") || []
		const hasErrors = (context.recentErrors?.length || 0) > 0
		const performance = context.performance?.taskCompletionRate || 0

		return `tools:${tools.join(",")}|errors:${hasErrors}|perf:${performance.toFixed(2)}`
	}

	private calculateSimilarity(context1: string, context2: string): number {
		// Simple similarity based on common tokens
		const tokens1 = new Set(context1.toLowerCase().split(/\W+/))
		const tokens2 = new Set(context2.toLowerCase().split(/\W+/))

		const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)))
		const union = new Set([...tokens1, ...tokens2])

		return intersection.size / union.size
	}

	private calculateSituationMatch(situation1: string, situation2: string): number {
		const parts1 = situation1.split("|")
		const parts2 = situation2.split("|")

		let matches = 0
		for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
			if (parts1[i] === parts2[i]) matches++
		}

		return matches / Math.max(parts1.length, parts2.length)
	}

	private calculateRelevance(entry: ContextMemoryEntry): number {
		const ageInHours = (Date.now() - entry.timestamp) / (1000 * 60 * 60)
		const decayFactor = Math.exp((-this.config.relevanceDecayRate * ageInHours) / 24)

		// Boost relevance for successful outcomes
		const outcomeBoost = entry.outcome === "success" ? 1.2 : entry.outcome === "failure" ? 0.8 : 1.0

		return Math.min(entry.relevance * decayFactor * outcomeBoost, 1.0)
	}

	private async extractPatterns(entry: ContextMemoryEntry, context: ReflectionContext): Promise<LearningPattern[]> {
		const patterns: LearningPattern[] = []

		// Extract tool usage patterns
		if (context.recentTools && context.recentTools.length > 0) {
			const toolPattern: LearningPattern = {
				id: this.generateId(),
				patternType: entry.outcome === "success" ? "success" : "failure",
				context: entry.situation,
				triggers: context.recentTools.map((t) => t.name || "unknown"),
				actions: [entry.decision],
				outcomes: [entry.outcome],
				confidence: 0.7,
				frequency: 1,
				lastUsed: entry.timestamp,
				effectiveness: entry.outcome === "success" ? 0.8 : 0.2,
				metadata: { source: "tool_usage", taskId: entry.taskId },
			}
			patterns.push(toolPattern)
		}

		return patterns
	}

	private async updateLearningPatterns(entry: ContextMemoryEntry): Promise<void> {
		// Update existing patterns or create new ones
		for (const pattern of entry.patterns) {
			const existingPattern = this.findSimilarPattern(pattern)

			if (existingPattern) {
				this.mergePatterns(existingPattern, pattern)
			} else {
				this.learningPatterns.set(pattern.id, pattern)
			}
		}
	}

	private findSimilarPattern(pattern: LearningPattern): LearningPattern | undefined {
		for (const existing of this.learningPatterns.values()) {
			if (
				existing.patternType === pattern.patternType &&
				existing.context === pattern.context &&
				this.arraysOverlap(existing.triggers, pattern.triggers)
			) {
				return existing
			}
		}
		return undefined
	}

	private mergePatterns(existing: LearningPattern, newPattern: LearningPattern): void {
		existing.frequency++
		existing.lastUsed = Math.max(existing.lastUsed, newPattern.lastUsed)
		existing.confidence = (existing.confidence + newPattern.confidence) / 2
		existing.effectiveness = (existing.effectiveness + newPattern.effectiveness) / 2

		// Merge unique triggers and actions
		existing.triggers = [...new Set([...existing.triggers, ...newPattern.triggers])]
		existing.actions = [...new Set([...existing.actions, ...newPattern.actions])]
		existing.outcomes = [...new Set([...existing.outcomes, ...newPattern.outcomes])]
	}

	private arraysOverlap<T>(arr1: T[], arr2: T[]): boolean {
		return arr1.some((item) => arr2.includes(item))
	}

	private calculateLearningValue(result: string, insights: string[]): number {
		let value = result === "success" ? 0.8 : result === "failure" ? 0.6 : 0.4
		value += insights.length * 0.1 // More insights = more learning value
		return Math.min(value, 1.0)
	}

	private async updatePatternsFromLearning(event: LearningEvent): Promise<void> {
		// Find patterns that could be updated by this learning event
		const contextStr = event.data.context as string

		for (const pattern of this.learningPatterns.values()) {
			const similarity = this.calculateSimilarity(pattern.context, contextStr)

			if (similarity > 0.5) {
				// Update pattern effectiveness based on learning event
				const impact = event.impact === "positive" ? 0.1 : event.impact === "negative" ? -0.1 : 0
				pattern.effectiveness = Math.max(0, Math.min(1, pattern.effectiveness + impact))
				pattern.confidence = Math.min(1, pattern.confidence + 0.05)
				pattern.lastUsed = event.timestamp
			}
		}
	}

	private updateRelevanceScores(): void {
		for (const entry of this.memoryEntries.values()) {
			entry.relevance = this.calculateRelevance(entry)
		}
	}

	private maintainMemoryLimits(): void {
		if (this.memoryEntries.size <= this.config.maxEntries) return

		// Remove least relevant entries
		const entries = Array.from(this.memoryEntries.entries())
		entries.sort(([, a], [, b]) => a.relevance - b.relevance)

		const toRemove = entries.slice(0, Math.floor(this.config.maxEntries * 0.1))
		for (const [id] of toRemove) {
			this.memoryEntries.delete(id)
		}

		this.emit("memory_pruned", { removed: toRemove.length })
	}

	private generateId(): string {
		return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	/**
	 * Clean up resources
	 */
	public dispose(): void {
		this.setActive(false)
		this.removeAllListeners()
		this.memoryEntries.clear()
		this.learningPatterns.clear()
	}
}

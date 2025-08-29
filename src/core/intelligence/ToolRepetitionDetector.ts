/**
 * TRAE-Agent Tool Repetition Detection System
 *
 * This system detects when tools are being used repetitively and provides intelligent
 * intervention to improve agent accuracy. It implements advanced pattern detection
 * beyond simple consecutive calls, including semantic similarity analysis, cyclic
 * pattern recognition, and context-aware repetition analysis.
 *
 * Key Features:
 * - Advanced pattern detection (not just consecutive calls)
 * - Semantic similarity analysis between tool calls
 * - Cyclic pattern recognition
 * - Context-aware analysis
 * - Confidence scoring for detected patterns
 * - Intervention suggestions when patterns are detected
 * - Historical pattern learning and improvement
 */

import { EventEmitter } from "events"
import { LearningEvent, IntelligenceContext, InterventionSuggestion, ToolPerformance } from "./types"
import { ReflectionContext } from "../reflection/types"
import type { UnifiedToolUse } from "../shared/types/unified-types"

// ===== Tool Repetition Detection Types =====

/**
 * Represents a detected tool usage pattern
 */
export interface ToolUsagePattern {
	id: string
	patternType: "consecutive" | "cyclic" | "semantic" | "contextual"
	toolSequence: string[]
	frequency: number
	confidence: number
	severity: "low" | "medium" | "high" | "critical"
	firstDetected: number
	lastSeen: number
	contextSignature: string
	semanticSimilarity: number
	interventionTriggered: boolean
	effectiveness?: number
}

/**
 * Tool call analysis with contextual information
 */
export interface ToolCallAnalysis {
	toolName: string
	parameters: Record<string, unknown>
	timestamp: number
	context: string
	outcome: "success" | "failure" | "partial" | "unknown"
	executionTime: number
	semanticHash: string
	contextHash: string
}

/**
 * Repetition detection result
 */
export interface RepetitionDetectionResult {
	hasRepetition: boolean
	patterns: ToolUsagePattern[]
	riskLevel: "none" | "low" | "medium" | "high" | "critical"
	interventions: InterventionSuggestion[]
	confidence: number
	reasoning: string[]
	recommendations: string[]
}

/**
 * Configuration for Tool Repetition Detection
 */
export interface ToolRepetitionConfig {
	maxHistorySize: number
	consecutiveThreshold: number
	cyclicWindowSize: number
	semanticSimilarityThreshold: number
	interventionThreshold: number
	learningEnabled: boolean
	contextAwareAnalysis: boolean
	performanceTracking: boolean
	patternMemoryDuration: number
}

/**
 * Cyclic pattern detection result
 */
interface CyclicPattern {
	sequence: string[]
	cycleLength: number
	occurrences: number
	confidence: number
	startIndex: number
	endIndex: number
}

// ===== Tool Repetition Detector Implementation =====

export class ToolRepetitionDetector extends EventEmitter {
	private config: ToolRepetitionConfig
	private toolHistory: ToolCallAnalysis[] = []
	private detectedPatterns: Map<string, ToolUsagePattern> = new Map()
	private interventionHistory: Map<
		string,
		{
			pattern: ToolUsagePattern
			intervention: InterventionSuggestion
			timestamp: number
			outcome: "successful" | "failed" | "pending"
		}
	> = new Map()
	private isActive: boolean = true
	private performanceMetrics: {
		totalDetections: number
		successfulInterventions: number
		falsePositives: number
		patternsLearned: number
		averageDetectionTime: number
	} = {
		totalDetections: 0,
		successfulInterventions: 0,
		falsePositives: 0,
		patternsLearned: 0,
		averageDetectionTime: 0,
	}

	constructor(config: Partial<ToolRepetitionConfig> = {}) {
		super()

		this.config = {
			maxHistorySize: 100,
			consecutiveThreshold: 3,
			cyclicWindowSize: 10,
			semanticSimilarityThreshold: 0.8,
			interventionThreshold: 0.7,
			learningEnabled: true,
			contextAwareAnalysis: true,
			performanceTracking: true,
			patternMemoryDuration: 24 * 60 * 60 * 1000, // 24 hours
			...config,
		}

		this.setupPerformanceTracking()
		this.setupPatternMaintenance()
	}

	/**
	 * Analyze tool usage for repetition patterns
	 */
	public async analyzeToolUsage(
		toolUse: UnifiedToolUse,
		context: ReflectionContext,
	): Promise<RepetitionDetectionResult> {
		if (!this.isActive) {
			return this.createEmptyResult()
		}

		const startTime = Date.now()

		// Record the tool call
		const toolAnalysis = this.createToolCallAnalysis(toolUse, context)
		this.addToHistory(toolAnalysis)

		// Detect patterns
		const patterns = await this.detectAllPatterns(context)

		// Calculate risk level
		const riskLevel = this.calculateRiskLevel(patterns)

		// Generate interventions if needed
		const interventions = await this.generateInterventions(patterns, context)

		// Calculate overall confidence
		const confidence = this.calculateOverallConfidence(patterns)

		// Generate reasoning and recommendations
		const reasoning = this.generateReasoning(patterns)
		const recommendations = this.generateRecommendations(patterns, riskLevel)

		const result: RepetitionDetectionResult = {
			hasRepetition: patterns.length > 0,
			patterns,
			riskLevel,
			interventions,
			confidence,
			reasoning,
			recommendations,
		}

		// Update performance metrics
		this.updatePerformanceMetrics(startTime)

		// Learn from the analysis
		if (this.config.learningEnabled) {
			await this.learnFromAnalysis(result, context)
		}

		this.emit("repetition_analyzed", {
			toolName: toolUse.name,
			hasRepetition: result.hasRepetition,
			riskLevel: result.riskLevel,
			patterns: patterns.length,
		})

		return result
	}

	/**
	 * Record the outcome of an intervention
	 */
	public async recordInterventionOutcome(
		interventionId: string,
		outcome: "successful" | "failed",
		feedback?: string,
	): Promise<void> {
		if (!this.isActive) return

		const intervention = this.interventionHistory.get(interventionId)
		if (intervention) {
			intervention.outcome = outcome

			// Update pattern effectiveness
			if (outcome === "successful") {
				const pattern = intervention.pattern
				pattern.effectiveness = (pattern.effectiveness || 0.5) * 0.8 + 0.2 * 1.0
				this.performanceMetrics.successfulInterventions++
			} else {
				const pattern = intervention.pattern
				pattern.effectiveness = (pattern.effectiveness || 0.5) * 0.8 + 0.2 * 0.0
			}

			// Learn from the outcome
			if (this.config.learningEnabled) {
				await this.learnFromInterventionOutcome(intervention, outcome, feedback)
			}

			this.emit("intervention_outcome", {
				interventionId,
				outcome,
				patternId: intervention.pattern.id,
				effectiveness: intervention.pattern.effectiveness,
			})
		}
	}

	/**
	 * Get current repetition detection statistics
	 */
	public getDetectionStats(): {
		totalDetections: number
		activePatterns: number
		successfulInterventions: number
		falsePositives: number
		averageDetectionTime: number
		patternTypes: Record<string, number>
		riskDistribution: Record<string, number>
	} {
		const patternTypes: Record<string, number> = {}
		const riskDistribution: Record<string, number> = {}

		for (const pattern of this.detectedPatterns.values()) {
			patternTypes[pattern.patternType] = (patternTypes[pattern.patternType] || 0) + 1
			riskDistribution[pattern.severity] = (riskDistribution[pattern.severity] || 0) + 1
		}

		return {
			...this.performanceMetrics,
			activePatterns: this.detectedPatterns.size,
			patternTypes,
			riskDistribution,
		}
	}

	/**
	 * Clear detection history (for testing or reset)
	 */
	public clearHistory(): void {
		this.toolHistory = []
		this.detectedPatterns.clear()
		this.interventionHistory.clear()
		this.performanceMetrics = {
			totalDetections: 0,
			successfulInterventions: 0,
			falsePositives: 0,
			patternsLearned: 0,
			averageDetectionTime: 0,
		}
		this.emit("history_cleared")
	}

	/**
	 * Set active state
	 */
	public setActive(active: boolean): void {
		this.isActive = active
		this.emit("status_changed", { active })
	}

	// ===== Private Helper Methods =====

	private createEmptyResult(): RepetitionDetectionResult {
		return {
			hasRepetition: false,
			patterns: [],
			riskLevel: "none",
			interventions: [],
			confidence: 0,
			reasoning: ["Tool repetition detection is inactive"],
			recommendations: [],
		}
	}

	private createToolCallAnalysis(toolUse: UnifiedToolUse, context: ReflectionContext): ToolCallAnalysis {
		const contextStr = this.extractContextString(context)

		return {
			toolName: toolUse.name || "unknown",
			parameters: this.extractParameters(toolUse),
			timestamp: Date.now(),
			context: contextStr,
			outcome: this.inferOutcome(toolUse),
			executionTime: this.calculateExecutionTime(toolUse),
			semanticHash: this.generateSemanticHash(toolUse),
			contextHash: this.generateContextHash(contextStr),
		}
	}

	private extractContextString(context: ReflectionContext): string {
		return JSON.stringify({
			taskId: context.taskId,
			step: context.currentStep,
			tools: context.recentTools?.slice(-3).map((t) => t.name || "unknown"),
			errors: context.recentErrors?.length || 0,
			performance: context.performance?.efficiencyScore || 0,
		})
	}

	private inferOutcome(toolUse: UnifiedToolUse): "success" | "failure" | "partial" | "unknown" {
		// This is a simplified inference - in a real implementation,
		// this would analyze the tool's response and execution results
		return "unknown"
	}

	private calculateExecutionTime(toolUse: UnifiedToolUse): number {
		// Placeholder - would be calculated from actual execution timing
		return 100
	}

	private extractParameters(toolUse: UnifiedToolUse): Record<string, unknown> {
		// Handle different tool use types
		if ("parameters" in toolUse) {
			return (toolUse.parameters || {}) as Record<string, unknown>
		}
		// For ToolUse type, extract from input if available
		if ("input" in toolUse && toolUse.input) {
			try {
				const parsed = typeof toolUse.input === "string" ? JSON.parse(toolUse.input) : toolUse.input
				return parsed as Record<string, unknown>
			} catch {
				return { input: toolUse.input } as Record<string, unknown>
			}
		}
		return {} as Record<string, unknown>
	}

	private generateSemanticHash(toolUse: UnifiedToolUse): string {
		const parameters = this.extractParameters(toolUse)
		const semantic = {
			tool: toolUse.name,
			paramKeys: Object.keys(parameters).sort(),
			paramTypes: Object.values(parameters).map((v) => typeof v),
		}
		return this.hashObject(semantic)
	}

	private generateContextHash(contextStr: string): string {
		return this.hashString(contextStr)
	}

	private hashObject(obj: unknown): string {
		return this.hashString(JSON.stringify(obj))
	}

	private hashString(str: string): string {
		let hash = 0
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i)
			hash = (hash << 5) - hash + char
			hash = hash & hash // Convert to 32bit integer
		}
		return hash.toString(36)
	}

	private addToHistory(analysis: ToolCallAnalysis): void {
		this.toolHistory.push(analysis)

		// Maintain history size limit
		if (this.toolHistory.length > this.config.maxHistorySize) {
			this.toolHistory.shift()
		}
	}

	private async detectAllPatterns(context: ReflectionContext): Promise<ToolUsagePattern[]> {
		const patterns: ToolUsagePattern[] = []

		// Detect consecutive patterns
		patterns.push(...this.detectConsecutivePatterns())

		// Detect cyclic patterns
		patterns.push(...this.detectCyclicPatterns())

		// Detect semantic similarity patterns
		patterns.push(...(await this.detectSemanticPatterns()))

		// Detect contextual patterns if enabled
		if (this.config.contextAwareAnalysis) {
			patterns.push(...this.detectContextualPatterns(context))
		}

		// Filter patterns by confidence threshold
		const filteredPatterns = patterns.filter((pattern) => pattern.confidence >= this.config.interventionThreshold)

		// Update pattern tracking
		this.updatePatternTracking(filteredPatterns)

		return filteredPatterns
	}

	private detectConsecutivePatterns(): ToolUsagePattern[] {
		const patterns: ToolUsagePattern[] = []

		if (this.toolHistory.length < this.config.consecutiveThreshold) {
			return patterns
		}

		// Look for consecutive identical tool calls
		let consecutiveCount = 1
		let currentTool = this.toolHistory[this.toolHistory.length - 1].toolName

		for (let i = this.toolHistory.length - 2; i >= 0; i--) {
			if (this.toolHistory[i].toolName === currentTool) {
				consecutiveCount++
			} else {
				break
			}
		}

		if (consecutiveCount >= this.config.consecutiveThreshold) {
			const pattern: ToolUsagePattern = {
				id: this.generatePatternId(),
				patternType: "consecutive",
				toolSequence: Array(consecutiveCount).fill(currentTool),
				frequency: consecutiveCount,
				confidence: Math.min(consecutiveCount / this.config.consecutiveThreshold, 1.0),
				severity: this.calculateSeverity(consecutiveCount, "consecutive"),
				firstDetected: Date.now(),
				lastSeen: Date.now(),
				contextSignature: this.generateContextSignature(),
				semanticSimilarity: 1.0, // Identical tools
				interventionTriggered: false,
			}

			patterns.push(pattern)
		}

		return patterns
	}

	private detectCyclicPatterns(): ToolUsagePattern[] {
		const patterns: ToolUsagePattern[] = []

		if (this.toolHistory.length < this.config.cyclicWindowSize) {
			return patterns
		}

		const recentTools = this.toolHistory.slice(-this.config.cyclicWindowSize).map((h) => h.toolName)

		// Detect cycles of different lengths
		for (let cycleLength = 2; cycleLength <= Math.floor(recentTools.length / 2); cycleLength++) {
			const cycles = this.findCycles(recentTools, cycleLength)

			for (const cycle of cycles) {
				if (cycle.occurrences >= 2) {
					const pattern: ToolUsagePattern = {
						id: this.generatePatternId(),
						patternType: "cyclic",
						toolSequence: cycle.sequence,
						frequency: cycle.occurrences,
						confidence: cycle.confidence,
						severity: this.calculateSeverity(cycle.occurrences, "cyclic"),
						firstDetected: Date.now(),
						lastSeen: Date.now(),
						contextSignature: this.generateContextSignature(),
						semanticSimilarity: this.calculateSequenceSimilarity(cycle.sequence),
						interventionTriggered: false,
					}

					patterns.push(pattern)
				}
			}
		}

		return patterns
	}

	private async detectSemanticPatterns(): Promise<ToolUsagePattern[]> {
		const patterns: ToolUsagePattern[] = []

		if (this.toolHistory.length < 3) {
			return patterns
		}

		// Group recent tool calls by semantic similarity
		const recentCalls = this.toolHistory.slice(-10)
		const semanticGroups = this.groupBySemanticSimilarity(recentCalls)

		for (const group of semanticGroups) {
			if (group.length >= 3) {
				const similarity = this.calculateGroupSemanticSimilarity(group)

				if (similarity >= this.config.semanticSimilarityThreshold) {
					const pattern: ToolUsagePattern = {
						id: this.generatePatternId(),
						patternType: "semantic",
						toolSequence: group.map((call) => call.toolName),
						frequency: group.length,
						confidence: similarity,
						severity: this.calculateSeverity(group.length, "semantic"),
						firstDetected: group[0].timestamp,
						lastSeen: group[group.length - 1].timestamp,
						contextSignature: this.generateContextSignature(),
						semanticSimilarity: similarity,
						interventionTriggered: false,
					}

					patterns.push(pattern)
				}
			}
		}

		return patterns
	}

	private detectContextualPatterns(context: ReflectionContext): ToolUsagePattern[] {
		const patterns: ToolUsagePattern[] = []

		if (this.toolHistory.length < 3) {
			return patterns
		}

		// Group tools by context similarity
		const recentCalls = this.toolHistory.slice(-8)
		const contextGroups = this.groupByContextSimilarity(recentCalls)

		for (const group of contextGroups) {
			if (group.length >= 3) {
				const contextSimilarity = this.calculateContextSimilarity(group)

				if (contextSimilarity >= 0.7) {
					const pattern: ToolUsagePattern = {
						id: this.generatePatternId(),
						patternType: "contextual",
						toolSequence: group.map((call) => call.toolName),
						frequency: group.length,
						confidence: contextSimilarity,
						severity: this.calculateSeverity(group.length, "contextual"),
						firstDetected: group[0].timestamp,
						lastSeen: group[group.length - 1].timestamp,
						contextSignature: this.generateContextSignature(),
						semanticSimilarity: this.calculateGroupSemanticSimilarity(group),
						interventionTriggered: false,
					}

					patterns.push(pattern)
				}
			}
		}

		return patterns
	}

	private findCycles(tools: string[], cycleLength: number): CyclicPattern[] {
		const cycles: CyclicPattern[] = []

		if (tools.length < cycleLength * 2) {
			return cycles
		}

		for (let i = 0; i <= tools.length - cycleLength * 2; i++) {
			const pattern = tools.slice(i, i + cycleLength)
			let occurrences = 1
			let j = i + cycleLength

			// Count consecutive occurrences of the pattern
			while (j + cycleLength <= tools.length) {
				const nextPattern = tools.slice(j, j + cycleLength)
				if (this.arraysEqual(pattern, nextPattern)) {
					occurrences++
					j += cycleLength
				} else {
					break
				}
			}

			if (occurrences >= 2) {
				const confidence = Math.min(occurrences / 3, 1.0)
				cycles.push({
					sequence: pattern,
					cycleLength,
					occurrences,
					confidence,
					startIndex: i,
					endIndex: j - 1,
				})
			}
		}

		return cycles
	}

	private groupBySemanticSimilarity(calls: ToolCallAnalysis[]): ToolCallAnalysis[][] {
		const groups: ToolCallAnalysis[][] = []
		const used = new Set<number>()

		for (let i = 0; i < calls.length; i++) {
			if (used.has(i)) continue

			const group = [calls[i]]
			used.add(i)

			for (let j = i + 1; j < calls.length; j++) {
				if (used.has(j)) continue

				const similarity = this.calculateSemanticSimilarity(calls[i], calls[j])
				if (similarity >= this.config.semanticSimilarityThreshold) {
					group.push(calls[j])
					used.add(j)
				}
			}

			if (group.length >= 2) {
				groups.push(group)
			}
		}

		return groups
	}

	private groupByContextSimilarity(calls: ToolCallAnalysis[]): ToolCallAnalysis[][] {
		const groups: ToolCallAnalysis[][] = []
		const used = new Set<number>()

		for (let i = 0; i < calls.length; i++) {
			if (used.has(i)) continue

			const group = [calls[i]]
			used.add(i)

			for (let j = i + 1; j < calls.length; j++) {
				if (used.has(j)) continue

				if (calls[i].contextHash === calls[j].contextHash) {
					group.push(calls[j])
					used.add(j)
				}
			}

			if (group.length >= 2) {
				groups.push(group)
			}
		}

		return groups
	}

	private calculateSemanticSimilarity(call1: ToolCallAnalysis, call2: ToolCallAnalysis): number {
		// Tool name similarity
		const toolSimilarity = call1.toolName === call2.toolName ? 1.0 : 0.0

		// Parameter similarity
		const paramSimilarity = this.calculateParameterSimilarity(call1.parameters, call2.parameters)

		// Context similarity
		const contextSimilarity = this.calculateStringSimilarity(call1.context, call2.context)

		// Weighted combination
		return toolSimilarity * 0.4 + paramSimilarity * 0.4 + contextSimilarity * 0.2
	}

	private calculateGroupSemanticSimilarity(group: ToolCallAnalysis[]): number {
		if (group.length < 2) return 1.0

		let totalSimilarity = 0
		let comparisons = 0

		for (let i = 0; i < group.length; i++) {
			for (let j = i + 1; j < group.length; j++) {
				totalSimilarity += this.calculateSemanticSimilarity(group[i], group[j])
				comparisons++
			}
		}

		return comparisons > 0 ? totalSimilarity / comparisons : 0
	}

	private calculateContextSimilarity(group: ToolCallAnalysis[]): number {
		if (group.length < 2) return 1.0

		const contextHashes = group.map((call) => call.contextHash)
		const uniqueHashes = new Set(contextHashes)

		// Higher similarity if contexts are more similar
		return 1.0 - (uniqueHashes.size - 1) / (group.length - 1)
	}

	private calculateParameterSimilarity(params1: Record<string, unknown>, params2: Record<string, unknown>): number {
		const keys1 = Object.keys(params1)
		const keys2 = Object.keys(params2)
		const allKeys = new Set([...keys1, ...keys2])

		if (allKeys.size === 0) return 1.0

		let matches = 0
		for (const key of allKeys) {
			if (key in params1 && key in params2) {
				if (JSON.stringify(params1[key]) === JSON.stringify(params2[key])) {
					matches++
				}
			}
		}

		return matches / allKeys.size
	}

	private calculateStringSimilarity(str1: string, str2: string): number {
		if (str1 === str2) return 1.0
		if (!str1 || !str2) return 0.0

		const longer = str1.length > str2.length ? str1 : str2
		const shorter = str1.length > str2.length ? str2 : str1

		if (longer.length === 0) return 1.0

		const editDistance = this.calculateEditDistance(longer, shorter)
		return (longer.length - editDistance) / longer.length
	}

	private calculateEditDistance(str1: string, str2: string): number {
		const matrix = Array(str2.length + 1)
			.fill(null)
			.map(() => Array(str1.length + 1).fill(null))

		for (let i = 0; i <= str1.length; i++) {
			matrix[0][i] = i
		}

		for (let j = 0; j <= str2.length; j++) {
			matrix[j][0] = j
		}

		for (let j = 1; j <= str2.length; j++) {
			for (let i = 1; i <= str1.length; i++) {
				if (str1[i - 1] === str2[j - 1]) {
					matrix[j][i] = matrix[j - 1][i - 1]
				} else {
					matrix[j][i] = Math.min(
						matrix[j - 1][i - 1] + 1, // substitution
						matrix[j][i - 1] + 1, // insertion
						matrix[j - 1][i] + 1, // deletion
					)
				}
			}
		}

		return matrix[str2.length][str1.length]
	}

	private calculateSequenceSimilarity(sequence: string[]): number {
		if (sequence.length <= 1) return 1.0

		const uniqueTools = new Set(sequence)
		return uniqueTools.size / sequence.length
	}

	private calculateSeverity(frequency: number, patternType: string): "low" | "medium" | "high" | "critical" {
		const baseThreshold = patternType === "consecutive" ? 3 : patternType === "cyclic" ? 2 : 3

		if (frequency >= baseThreshold * 3) return "critical"
		if (frequency >= baseThreshold * 2) return "high"
		if (frequency >= baseThreshold * 1.5) return "medium"
		return "low"
	}

	private calculateRiskLevel(patterns: ToolUsagePattern[]): "none" | "low" | "medium" | "high" | "critical" {
		if (patterns.length === 0) return "none"

		const maxSeverity = patterns.reduce(
			(max, pattern) => {
				const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 }
				const currentLevel = severityLevels[pattern.severity]
				const maxLevel = severityLevels[max]
				return currentLevel > maxLevel ? pattern.severity : max
			},
			"low" as "low" | "medium" | "high" | "critical",
		)

		// Adjust based on number of patterns
		if (patterns.length >= 3 && maxSeverity !== "critical") {
			const severityLevels = { low: "medium", medium: "high", high: "critical" } as const
			return severityLevels[maxSeverity] || "high"
		}

		return maxSeverity as "low" | "medium" | "high" | "critical"
	}

	private calculateOverallConfidence(patterns: ToolUsagePattern[]): number {
		if (patterns.length === 0) return 0

		const avgConfidence = patterns.reduce((sum, pattern) => sum + pattern.confidence, 0) / patterns.length
		const patternCountBoost = Math.min(patterns.length * 0.1, 0.3)

		return Math.min(avgConfidence + patternCountBoost, 1.0)
	}

	private async generateInterventions(
		patterns: ToolUsagePattern[],
		context: ReflectionContext,
	): Promise<InterventionSuggestion[]> {
		const interventions: InterventionSuggestion[] = []

		for (const pattern of patterns) {
			if (pattern.confidence >= this.config.interventionThreshold) {
				const intervention = this.createInterventionForPattern(pattern, context)
				interventions.push(intervention)

				// Track the intervention
				this.interventionHistory.set(intervention.id, {
					pattern,
					intervention,
					timestamp: Date.now(),
					outcome: "pending",
				})

				pattern.interventionTriggered = true
			}
		}

		return interventions.sort((a, b) => b.priority - a.priority)
	}

	private createInterventionForPattern(
		pattern: ToolUsagePattern,
		context: ReflectionContext,
	): InterventionSuggestion {
		const baseId = this.generateId()

		switch (pattern.patternType) {
			case "consecutive":
				return {
					id: baseId,
					type: "preventive",
					description: `Break consecutive ${pattern.toolSequence[0]} usage pattern`,
					priority: this.calculateInterventionPriority(pattern),
					effort: "low",
					effectiveness: 0.8,
					steps: [
						`Try alternative tools instead of repeating ${pattern.toolSequence[0]}`,
						"Analyze if the repeated tool calls are actually necessary",
						"Consider combining multiple operations into a single call",
						"Add variation to avoid getting stuck in loops",
					],
					timing: pattern.severity === "critical" ? "immediate" : "soon",
				}

			case "cyclic":
				return {
					id: baseId,
					type: "corrective",
					description: `Break cyclic pattern: ${pattern.toolSequence.join(" → ")}`,
					priority: this.calculateInterventionPriority(pattern),
					effort: "medium",
					effectiveness: 0.7,
					steps: [
						"Identify why the cycle is occurring",
						"Break the cycle by trying a different approach",
						"Add randomization or variation to tool selection",
						"Consider if the task approach needs to be reconsidered",
					],
					timing: "immediate",
				}

			case "semantic":
				return {
					id: baseId,
					type: "adaptive",
					description: "Diversify semantically similar tool usage",
					priority: this.calculateInterventionPriority(pattern),
					effort: "medium",
					effectiveness: 0.6,
					steps: [
						"Analyze if similar operations can be consolidated",
						"Try different tools that achieve similar results",
						"Consider batching similar operations",
						"Add more variety to parameter selection",
					],
					timing: "planned",
				}

			case "contextual":
				return {
					id: baseId,
					type: "preventive",
					description: "Address context-driven repetitive behavior",
					priority: this.calculateInterventionPriority(pattern),
					effort: "high",
					effectiveness: 0.9,
					steps: [
						"Analyze the context that triggers repetitive behavior",
						"Modify the approach to handle the context differently",
						"Add context-aware decision making",
						"Consider if the context indicates a deeper issue",
					],
					timing: "soon",
				}

			default:
				return {
					id: baseId,
					type: "preventive",
					description: "Address unspecified repetitive pattern",
					priority: 5,
					effort: "medium",
					effectiveness: 0.5,
					steps: [
						"Analyze the repetitive pattern",
						"Try alternative approaches",
						"Add variation to tool selection",
						"Monitor for continued repetition",
					],
					timing: "planned",
				}
		}
	}

	private calculateInterventionPriority(pattern: ToolUsagePattern): number {
		const severityWeights = { low: 3, medium: 5, high: 7, critical: 9 }
		const baseScore = severityWeights[pattern.severity]
		const confidenceBoost = pattern.confidence * 2
		const frequencyBoost = Math.min(pattern.frequency * 0.5, 3)

		return Math.min(baseScore + confidenceBoost + frequencyBoost, 10)
	}

	private generateReasoning(patterns: ToolUsagePattern[]): string[] {
		const reasoning: string[] = []

		if (patterns.length === 0) {
			reasoning.push("No repetitive patterns detected in recent tool usage")
			return reasoning
		}

		reasoning.push(`Detected ${patterns.length} repetitive pattern(s)`)

		for (const pattern of patterns) {
			const patternDesc = `${pattern.patternType} pattern with ${pattern.frequency} occurrences`
			const confidenceDesc = `(${Math.round(pattern.confidence * 100)}% confidence)`
			reasoning.push(`- ${patternDesc} ${confidenceDesc}`)
		}

		const highRiskPatterns = patterns.filter((p) => p.severity === "high" || p.severity === "critical")
		if (highRiskPatterns.length > 0) {
			reasoning.push(`${highRiskPatterns.length} high-risk patterns require immediate attention`)
		}

		return reasoning
	}

	private generateRecommendations(patterns: ToolUsagePattern[], riskLevel: string): string[] {
		const recommendations: string[] = []

		if (patterns.length === 0) {
			recommendations.push("Continue monitoring tool usage for potential patterns")
			return recommendations
		}

		switch (riskLevel) {
			case "critical":
				recommendations.push("Immediate intervention required to break repetitive patterns")
				recommendations.push("Consider switching to a completely different approach")
				recommendations.push("Add randomization to tool selection process")
				break

			case "high":
				recommendations.push("Take corrective action to address repetitive behavior")
				recommendations.push("Diversify tool selection and approaches")
				recommendations.push("Monitor closely for pattern escalation")
				break

			case "medium":
				recommendations.push("Consider preventive measures to avoid pattern escalation")
				recommendations.push("Add variation to tool usage patterns")
				recommendations.push("Review current strategy effectiveness")
				break

			case "low":
				recommendations.push("Monitor patterns for potential escalation")
				recommendations.push("Consider minor adjustments to tool selection")
				break
		}

		// Add specific recommendations based on pattern types
		const patternTypes = new Set(patterns.map((p) => p.patternType))

		if (patternTypes.has("consecutive")) {
			recommendations.push("Break consecutive tool usage with alternative approaches")
		}

		if (patternTypes.has("cyclic")) {
			recommendations.push("Identify and address root causes of cyclic behavior")
		}

		if (patternTypes.has("semantic")) {
			recommendations.push("Consolidate or diversify semantically similar operations")
		}

		if (patternTypes.has("contextual")) {
			recommendations.push("Analyze context triggers for repetitive behavior")
		}

		return recommendations
	}

	private updatePatternTracking(patterns: ToolUsagePattern[]): void {
		for (const pattern of patterns) {
			const existingPattern = this.detectedPatterns.get(pattern.id)

			if (existingPattern) {
				// Update existing pattern
				existingPattern.frequency = pattern.frequency
				existingPattern.confidence = pattern.confidence
				existingPattern.lastSeen = pattern.lastSeen
				existingPattern.severity = pattern.severity
			} else {
				// Add new pattern
				this.detectedPatterns.set(pattern.id, pattern)
			}
		}

		this.performanceMetrics.totalDetections++
	}

	private updatePerformanceMetrics(startTime: number): void {
		if (!this.config.performanceTracking) return

		const detectionTime = Date.now() - startTime
		const totalDetections = this.performanceMetrics.totalDetections + 1

		this.performanceMetrics.averageDetectionTime =
			(this.performanceMetrics.averageDetectionTime * (totalDetections - 1) + detectionTime) / totalDetections
	}

	private async learnFromAnalysis(result: RepetitionDetectionResult, context: ReflectionContext): Promise<void> {
		const learningEvent: LearningEvent = {
			id: this.generateId(),
			timestamp: Date.now(),
			source: "tool",
			event: "repetition_analysis_completed",
			data: {
				hasRepetition: result.hasRepetition,
				patternCount: result.patterns.length,
				riskLevel: result.riskLevel,
				confidence: result.confidence,
				taskId: context.taskId,
			},
			impact: result.hasRepetition ? "negative" : "positive",
			confidence: result.confidence,
			learningValue: result.hasRepetition ? Math.min(result.patterns.length * 0.2, 1.0) : 0.1,
		}

		this.emit("learning_event", learningEvent)
	}

	private async learnFromInterventionOutcome(
		intervention: {
			pattern: ToolUsagePattern
			intervention: InterventionSuggestion
			timestamp: number
			outcome: string
		},
		outcome: "successful" | "failed",
		feedback?: string,
	): Promise<void> {
		const learningEvent: LearningEvent = {
			id: this.generateId(),
			timestamp: Date.now(),
			source: "tool",
			event: "intervention_outcome_recorded",
			data: {
				patternType: intervention.pattern.patternType,
				interventionType: intervention.intervention.type,
				outcome,
				feedback,
				effectiveness: intervention.pattern.effectiveness,
			},
			impact: outcome === "successful" ? "positive" : "negative",
			confidence: 0.9,
			learningValue: outcome === "successful" ? 0.8 : 0.3,
		}

		this.performanceMetrics.patternsLearned++
		this.emit("learning_event", learningEvent)
	}

	private setupPerformanceTracking(): void {
		if (!this.config.performanceTracking) return

		// Periodic performance logging
		setInterval(() => {
			if (this.performanceMetrics.totalDetections > 0) {
				this.emit("performance_update", this.performanceMetrics)
			}
		}, 300000) // Every 5 minutes
	}

	private setupPatternMaintenance(): void {
		// Periodic cleanup of old patterns
		setInterval(() => {
			this.cleanupOldPatterns()
		}, 600000) // Every 10 minutes
	}

	private cleanupOldPatterns(): void {
		const now = Date.now()
		const cutoffTime = now - this.config.patternMemoryDuration

		for (const [id, pattern] of this.detectedPatterns.entries()) {
			if (pattern.lastSeen < cutoffTime) {
				this.detectedPatterns.delete(id)
			}
		}

		// Clean up old intervention history
		for (const [id, intervention] of this.interventionHistory.entries()) {
			if (intervention.timestamp < cutoffTime) {
				this.interventionHistory.delete(id)
			}
		}

		this.emit("patterns_cleaned", {
			activePatterns: this.detectedPatterns.size,
			activeInterventions: this.interventionHistory.size,
		})
	}

	private generatePatternId(): string {
		return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	private generateContextSignature(): string {
		const recentTools = this.toolHistory.slice(-5).map((h) => h.toolName)
		return `ctx_${recentTools.join("_")}_${Date.now()}`
	}

	private generateId(): string {
		return `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	private arraysEqual<T>(arr1: T[], arr2: T[]): boolean {
		if (arr1.length !== arr2.length) return false
		return arr1.every((val, index) => val === arr2[index])
	}

	/**
	 * Clean up resources
	 */
	public dispose(): void {
		this.setActive(false)
		this.removeAllListeners()
		this.toolHistory = []
		this.detectedPatterns.clear()
		this.interventionHistory.clear()
	}
}

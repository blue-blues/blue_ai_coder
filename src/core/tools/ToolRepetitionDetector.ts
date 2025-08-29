/**
 * Tool Repetition Detector
 *
 * Detects when tools are being used repetitively and provides
 * recommendations for breaking out of repetitive patterns.
 */

import type { ToolUse } from "../../shared/tools"
import { EventEmitter } from "events"
import type { FlexibleToolUse } from "./__tests__/test-types"
import type { UnifiedToolUse } from "../shared/types/unified-types"

export interface ToolRepetitionConfig {
	maxConsecutiveRepeats: number
	timeWindowMs?: number
	similarityThreshold?: number
	enableAdvancedAnalysis?: boolean
}

export interface ToolPattern {
	toolName: string
	consecutiveUses: number
	lastUsed: number
	avgTimeBetweenUses: number
	semanticSimilarity?: number
	// Test compatibility properties
	parameters?: Record<string, any>
	parameterVariation?: number
}

export interface RepetitionAnalysis {
	isRepetitive: boolean
	confidence: number
	patterns: ToolPattern[]
	contextualFactors: {
		timeSpan: number
		uniqueToolsUsed: number
		semanticDrift?: number
		// Test compatibility properties
		parameterVariation?: number
	}
	recommendation: "allow" | "warn" | "block"
	reasoning: string
	success: boolean
	// Backward compatibility properties for tests
	allowExecution?: boolean
	askUser?: {
		messageKey: string
		messageDetail: string
	}
}

/**
 * Detects repetitive tool usage patterns and provides recommendations
 */
export class ToolRepetitionDetector extends EventEmitter {
	private history: FlexibleToolUse[] = []
	private patterns: Map<string, ToolPattern> = new Map()
	private config: ToolRepetitionConfig
	private disposed = false

	constructor(config: ToolRepetitionConfig | number = { maxConsecutiveRepeats: 3 }) {
		super()

		// Handle both old number format and new config object format for backward compatibility
		if (typeof config === "number") {
			this.config = {
				maxConsecutiveRepeats: config,
				timeWindowMs: 30000,
				similarityThreshold: 0.8,
				enableAdvancedAnalysis: false,
			}
		} else {
			this.config = {
				maxConsecutiveRepeats: config.maxConsecutiveRepeats || 3,
				timeWindowMs: config.timeWindowMs || 30000,
				similarityThreshold: config.similarityThreshold || 0.8,
				enableAdvancedAnalysis: config.enableAdvancedAnalysis || false,
			}
		}
	}

	/**
	 * Analyze a sequence of tools for repetitive patterns
	 * Overloaded to accept both strict ToolUse and flexible types
	 */
	async analyzeSequence(tools: UnifiedToolUse[]): Promise<RepetitionAnalysis> {
		if (this.disposed) {
			return this.createFailureResult("Detector has been disposed")
		}

		if (!tools || tools.length === 0) {
			return this.createSuccessResult(false, "No tools to analyze")
		}

		// Cast to flexible type for internal processing
		const flexibleTools = tools as FlexibleToolUse[]

		// Basic implementation
		const toolCounts = new Map<string, number>()
		const patterns: ToolPattern[] = []

		flexibleTools.forEach((tool) => {
			const count = toolCounts.get(tool.name) || 0
			toolCounts.set(tool.name, count + 1)
		})

		// Create patterns from tool counts
		toolCounts.forEach((count, toolName) => {
			patterns.push({
				toolName,
				consecutiveUses: count,
				lastUsed: Date.now(),
				avgTimeBetweenUses: 1000,
				semanticSimilarity: this.config.enableAdvancedAnalysis ? 0.8 : undefined,
			})
		})

		const isRepetitive = Array.from(toolCounts.values()).some((count) => count > this.config.maxConsecutiveRepeats)

		if (this.config.enableAdvancedAnalysis) {
			return this.performAdvancedAnalysis(flexibleTools)
		}

		this.addToHistory(flexibleTools)

		const analysis: RepetitionAnalysis = {
			isRepetitive,
			confidence: isRepetitive ? 0.8 : 0.2,
			patterns,
			contextualFactors: {
				timeSpan: this.config.timeWindowMs || 30000,
				uniqueToolsUsed: toolCounts.size,
				semanticDrift: this.config.enableAdvancedAnalysis ? 0.1 : undefined,
			},
			recommendation: isRepetitive ? "warn" : "allow",
			reasoning: isRepetitive ? "Detected repetitive tool usage" : "No repetitive patterns detected",
			success: true,
		}

		// Emit event
		this.emit("analysis_completed", analysis)

		return analysis
	}

	/**
	 * Check a single tool for repetition (synchronous legacy method)
	 * Provides backward compatibility for existing tests
	 */
	check(tool: UnifiedToolUse): RepetitionAnalysis {
		if (this.disposed) {
			return this.createFailureResult("Detector has been disposed")
		}

		const flexibleTool = tool as FlexibleToolUse

		// Simple synchronous analysis
		const count = this.history.filter((h) => h.name === flexibleTool.name).length + 1
		const isRepetitive = count > this.config.maxConsecutiveRepeats

		// Add to history
		this.history.push(flexibleTool)

		// Keep history manageable
		const maxHistorySize = 100
		if (this.history.length > maxHistorySize) {
			this.history = this.history.slice(-maxHistorySize)
		}

		const analysis: RepetitionAnalysis = {
			isRepetitive,
			confidence: isRepetitive ? 0.8 : 0.2,
			patterns: [
				{
					toolName: flexibleTool.name,
					consecutiveUses: count,
					lastUsed: Date.now(),
					avgTimeBetweenUses: 1000,
					semanticSimilarity: undefined,
				},
			],
			contextualFactors: {
				timeSpan: this.config.timeWindowMs || 30000,
				uniqueToolsUsed: 1,
				semanticDrift: undefined,
			},
			recommendation: isRepetitive ? "warn" : "allow",
			reasoning: isRepetitive
				? `Tool ${flexibleTool.name} used ${count} times consecutively`
				: "No repetitive patterns detected",
			success: true,
			// Backward compatibility properties
			allowExecution: !isRepetitive,
			askUser: isRepetitive
				? {
						messageKey: "mistake_limit_reached",
						messageDetail: `Tool ${flexibleTool.name} appears to be stuck in a loop`,
					}
				: undefined,
		}

		// Emit event
		this.emit("analysis_completed", analysis)

		return analysis
	}

	/**
	 * Async version of check for modern usage
	 */
	async checkAsync(tool: UnifiedToolUse): Promise<RepetitionAnalysis> {
		return this.analyzeSequence([tool])
	}

	/**
	 * Get the tool usage history
	 */
	getHistory(): FlexibleToolUse[] {
		return [...this.history]
	}

	/**
	 * Update the configuration
	 */
	updateConfig(newConfig: Partial<ToolRepetitionConfig>): void {
		this.config = { ...this.config, ...newConfig }
	}

	/**
	 * Dispose of the detector and clean up resources
	 */
	dispose(): void {
		if (this.disposed) return

		this.disposed = true
		this.history = []
		this.patterns.clear()
		this.removeAllListeners()
	}

	/**
	 * Perform advanced analysis with semantic similarity
	 */
	private performAdvancedAnalysis(tools: FlexibleToolUse[]): RepetitionAnalysis {
		const patterns: ToolPattern[] = []
		const toolGroups = new Map<string, FlexibleToolUse[]>()

		// Group tools by name
		tools.forEach((tool) => {
			const group = toolGroups.get(tool.name) || []
			group.push(tool)
			toolGroups.set(tool.name, group)
		})

		// Analyze each group
		toolGroups.forEach((group, toolName) => {
			if (group.length > 1) {
				const times = group.map(() => Date.now()) // Simplified timing
				const avgTime = times.length > 1 ? (times[times.length - 1] - times[0]) / (times.length - 1) : 1000

				patterns.push({
					toolName,
					consecutiveUses: group.length,
					lastUsed: Date.now(),
					avgTimeBetweenUses: avgTime,
					semanticSimilarity: this.calculateSemanticSimilarity(group),
				})
			}
		})

		const isRepetitive = patterns.some((p) => p.consecutiveUses > this.config.maxConsecutiveRepeats)
		const confidence = this.calculateConfidence(patterns)

		return {
			isRepetitive,
			confidence,
			patterns,
			contextualFactors: {
				timeSpan: this.config.timeWindowMs || 30000,
				uniqueToolsUsed: toolGroups.size,
				semanticDrift: this.calculateSemanticDrift(patterns),
			},
			recommendation: this.getRecommendation(isRepetitive, confidence),
			reasoning: this.generateReasoning(isRepetitive, patterns),
			success: true,
		}
	}

	/**
	 * Add tools to history with size management
	 */
	private addToHistory(tools: FlexibleToolUse[]): void {
		this.history.push(...tools)

		// Keep history size manageable
		const maxHistorySize = 100
		if (this.history.length > maxHistorySize) {
			this.history = this.history.slice(-maxHistorySize)
		}
	}

	private calculateSemanticSimilarity(tools: FlexibleToolUse[]): number {
		// Simplified semantic similarity calculation
		if (tools.length < 2) return 0

		let totalSimilarity = 0
		let comparisons = 0

		for (let i = 0; i < tools.length - 1; i++) {
			for (let j = i + 1; j < tools.length; j++) {
				totalSimilarity += this.compareTools(tools[i], tools[j])
				comparisons++
			}
		}

		return comparisons > 0 ? totalSimilarity / comparisons : 0
	}

	private compareTools(tool1: FlexibleToolUse, tool2: FlexibleToolUse): number {
		if (tool1.name !== tool2.name) return 0

		// Simple parameter comparison
		const params1 = JSON.stringify(tool1.params || {})
		const params2 = JSON.stringify(tool2.params || {})

		return params1 === params2 ? 1.0 : 0.5
	}

	private calculateConfidence(patterns: ToolPattern[]): number {
		if (patterns.length === 0) return 0.1

		const avgConsecutive = patterns.reduce((sum, p) => sum + p.consecutiveUses, 0) / patterns.length
		return Math.min(avgConsecutive / this.config.maxConsecutiveRepeats, 1.0)
	}

	private calculateSemanticDrift(patterns: ToolPattern[]): number {
		const similarities = patterns.map((p) => p.semanticSimilarity || 0).filter((s) => s > 0)

		if (similarities.length === 0) return 0

		const avgSimilarity = similarities.reduce((sum, s) => sum + s, 0) / similarities.length
		return 1.0 - avgSimilarity // Higher drift means lower similarity
	}

	private getRecommendation(isRepetitive: boolean, confidence: number): "allow" | "warn" | "block" {
		if (!isRepetitive) return "allow"
		if (confidence > 0.8) return "block"
		return "warn"
	}

	private generateReasoning(isRepetitive: boolean, patterns: ToolPattern[]): string {
		if (!isRepetitive) {
			return "No repetitive patterns detected"
		}

		const repetitivePatterns = patterns.filter((p) => p.consecutiveUses > this.config.maxConsecutiveRepeats)
		const toolNames = repetitivePatterns.map((p) => p.toolName).join(", ")

		return `Detected repetitive usage of tools: ${toolNames}`
	}

	private createSuccessResult(isRepetitive: boolean, reasoning: string): RepetitionAnalysis {
		return {
			isRepetitive,
			confidence: isRepetitive ? 0.8 : 0.2,
			patterns: [],
			contextualFactors: {
				timeSpan: 0,
				uniqueToolsUsed: 0,
			},
			recommendation: isRepetitive ? "warn" : "allow",
			reasoning,
			success: true,
			// Backward compatibility properties
			allowExecution: !isRepetitive,
			askUser: isRepetitive
				? {
						messageKey: "mistake_limit_reached",
						messageDetail: reasoning,
					}
				: undefined,
		}
	}

	private createFailureResult(reason: string): RepetitionAnalysis {
		return {
			isRepetitive: false,
			confidence: 0,
			patterns: [],
			contextualFactors: {
				timeSpan: 0,
				uniqueToolsUsed: 0,
			},
			recommendation: "allow",
			reasoning: reason,
			success: false,
			// Backward compatibility properties
			allowExecution: true,
			askUser: undefined,
		}
	}
}

/**
 * Unified Type System
 *
 * This module provides a flexible type system that supports both:
 * - Strict production types with compile-time safety
 * - Flexible test types for comprehensive testing scenarios
 */

import type { ToolUse } from "../../../shared/tools"

// Base flexible types for testing
export interface FlexibleToolUse {
	type: "tool_use"
	name: string
	params: Record<string, any>
	partial: boolean
	// Optional properties for test compatibility
	timestamp?: number
	id?: string
}

// Union type that supports both strict and flexible usage
export type UnifiedToolUse = ToolUse | FlexibleToolUse

// Type guards for runtime type checking
export function isStrictToolUse(tool: UnifiedToolUse): tool is ToolUse {
	return (
		typeof (tool as ToolUse).name === "string" &&
		["execute_command", "read_file", "write_to_file", "apply_diff"].includes((tool as ToolUse).name as string)
	)
}

export function isFlexibleToolUse(tool: UnifiedToolUse): tool is FlexibleToolUse {
	return !isStrictToolUse(tool)
}

// Conversion utilities
export function toStrictToolUse(tool: UnifiedToolUse): ToolUse {
	if (isStrictToolUse(tool)) {
		return tool
	}

	// Convert flexible tool to strict format by mapping to closest valid tool
	const validToolNames = ["execute_command", "read_file", "write_to_file", "apply_diff"]
	const closestTool =
		validToolNames.find((name) => tool.name.includes(name) || name.includes(tool.name)) || "execute_command"

	return {
		type: "tool_use",
		name: closestTool as any,
		params: tool.params || {},
		partial: tool.partial || false,
	} as ToolUse
}

export function toFlexibleToolUse(tool: UnifiedToolUse): FlexibleToolUse {
	return {
		type: "tool_use",
		name: tool.name,
		params: tool.params || {},
		partial: tool.partial || false,
		...(isFlexibleToolUse(tool)
			? {
					timestamp: tool.timestamp,
					id: tool.id,
				}
			: {}),
	}
}

// Enhanced interfaces with flexible properties
export interface FlexibleToolPattern {
	toolName: string
	consecutiveUses: number
	lastUsed: number
	avgTimeBetweenUses: number
	semanticSimilarity?: number
	// Additional test-specific properties
	parameters?: Record<string, any>
	parameterVariation?: number
}

export interface FlexibleContextualFactors {
	timeSpan: number
	uniqueToolsUsed: number
	semanticDrift?: number
	// Additional test-specific properties
	parameterVariation?: number
}

// Flexible configuration types
export interface FlexibleToolRepetitionConfig {
	maxConsecutiveRepeats: number
	timeWindowMs?: number
	similarityThreshold?: number
	enableAdvancedAnalysis?: boolean
}

// Export re-usable type aliases
export type TestToolUse = FlexibleToolUse
export type TestToolPattern = FlexibleToolPattern
export type TestContextualFactors = FlexibleContextualFactors
export type TestToolRepetitionConfig = FlexibleToolRepetitionConfig

// Utility functions for test compatibility
export function createTestTool(
	name: string,
	params: Record<string, any> = {},
	partial: boolean = false,
): FlexibleToolUse {
	return {
		type: "tool_use",
		name,
		params,
		partial,
	}
}

export function createTestToolArray(
	tools: Array<{
		name: string
		params?: Record<string, any>
		partial?: boolean
	}>,
): FlexibleToolUse[] {
	return tools.map((tool) => createTestTool(tool.name, tool.params, tool.partial))
}

/**
 * Test-specific types for ToolRepetitionDetector tests
 *
 * This file provides more flexible types for testing purposes,
 * allowing custom tool names and parameters that wouldn't be
 * allowed in the production ToolUse interface.
 */

import type { ToolParamName } from "../../../shared/tools"

// Flexible tool name type for testing
export type TestToolName = string

// Flexible ToolUse interface for testing
export interface TestToolUse {
	type: "tool_use"
	name: TestToolName
	params: Record<string, any> // More flexible than production version
	partial: boolean
}

// Alias for backward compatibility
export type FlexibleToolUse = TestToolUse

// Helper function to create test tools
export function createTestTool(name: string, params: Record<string, any> = {}, partial: boolean = false): TestToolUse {
	return {
		type: "tool_use",
		name,
		params,
		partial,
	}
}

// Helper to convert test tools to production-compatible format
export function createValidTestTool(
	name:
		| "read_file"
		| "write_to_file"
		| "execute_command"
		| "apply_diff"
		| "codebase_search"
		| "search_files"
		| "list_files",
	params: Partial<Record<ToolParamName, string>> = {},
	partial: boolean = false,
): TestToolUse {
	return {
		type: "tool_use",
		name,
		params,
		partial,
	}
}

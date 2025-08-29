import type { ModeConfig } from "@blues-code/types"
import type { Mode } from "../../../shared/modes"

export interface GreetingPattern {
	pattern: RegExp
	confidence: number
	examples: string[]
}

export interface GreetingContext {
	mode: Mode
	modeConfig: ModeConfig
	workspacePath?: string
	projectName?: string
	projectType?: string
	hasFiles?: boolean
	customModes?: ModeConfig[]
}

export interface GreetingResponse {
	isGreeting: boolean
	confidence: number
	response?: string
	shouldBypassAI?: boolean
}

export interface ModeCapability {
	category: string
	description: string
	examples?: string[]
}

export interface GreetingTemplate {
	introduction: string
	capabilities: ModeCapability[]
	contextualNote?: string
	callToAction: string
}

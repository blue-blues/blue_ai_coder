import type { GreetingContext, GreetingTemplate, ModeCapability } from "./types"
import { getToolsForMode } from "../../../shared/modes"

export class GreetingResponseGenerator {
	/**
	 * Generates a contextual greeting response based on the current mode and context
	 */
	public static generateResponse(context: GreetingContext): string {
		const template = this.getModeTemplate(context)
		return this.buildResponse(template, context)
	}

	/**
	 * Gets the greeting template for the current mode
	 */
	private static getModeTemplate(context: GreetingContext): GreetingTemplate {
		const { modeConfig } = context

		switch (modeConfig.slug) {
			case "code":
				return this.getCodeModeTemplate(context)
			case "orchestrator":
				return this.getOrchestratorModeTemplate(context)
			case "architect":
				return this.getArchitectModeTemplate(context)
			case "ask":
				return this.getAskModeTemplate(context)
			case "debug":
				return this.getDebugModeTemplate(context)
			case "translate":
				return this.getTranslateModeTemplate(context)
			case "test":
				return this.getTestModeTemplate(context)
			default:
				return this.getCustomModeTemplate(context)
		}
	}

	private static getCodeModeTemplate(context: GreetingContext): GreetingTemplate {
		return {
			introduction: "Hi there! I'm Blue Code, ready to help you with software development.",
			capabilities: [
				{
					category: "Code Development",
					description: "Write, modify, and refactor code across any programming language",
					examples: ["Create new functions", "Fix bugs", "Optimize performance"],
				},
				{
					category: "Debugging & Troubleshooting",
					description: "Debug issues and troubleshoot problems systematically",
					examples: ["Analyze stack traces", "Add diagnostic logging", "Identify root causes"],
				},
				{
					category: "File Management",
					description: "Create new files and implement features",
					examples: ["Set up project structure", "Add new modules", "Configure build tools"],
				},
				{
					category: "Development Tools",
					description: "Run terminal commands and test your applications",
					examples: ["Execute build scripts", "Run tests", "Start development servers"],
				},
				{
					category: "Web Development",
					description: "Use browser automation for web development tasks",
					examples: ["Test UI interactions", "Verify responsive design", "Debug frontend issues"],
				},
			],
			callToAction: "What would you like to build or fix today?",
		}
	}

	private static getOrchestratorModeTemplate(context: GreetingContext): GreetingTemplate {
		return {
			introduction: "Hello! I'm Blue Code in Orchestrator mode - perfect for complex, multi-step projects.",
			capabilities: [
				{
					category: "Task Breakdown",
					description: "Breaking down large tasks into manageable subtasks",
					examples: ["Create project roadmaps", "Define milestones", "Plan implementation phases"],
				},
				{
					category: "Mode Coordination",
					description: "Coordinating work across different specialized modes",
					examples: ["Delegate to Code mode", "Switch to Debug mode", "Use Ask mode for research"],
				},
				{
					category: "Workflow Management",
					description: "Managing complex workflows and dependencies",
					examples: ["Track task progress", "Manage prerequisites", "Handle parallel work streams"],
				},
				{
					category: "Strategic Planning",
					description: "Delegating specific tasks to appropriate specialists",
					examples: ["Choose optimal approaches", "Resource allocation", "Risk assessment"],
				},
			],
			callToAction: "What ambitious project can I help you tackle today?",
		}
	}

	private static getArchitectModeTemplate(context: GreetingContext): GreetingTemplate {
		return {
			introduction: "Hello! I'm Blue Code in Architect mode - your technical planning and design specialist.",
			capabilities: [
				{
					category: "System Design",
					description: "Plan, design, and strategize before implementation",
					examples: [
						"Create technical specifications",
						"Design system architecture",
						"Plan database schemas",
					],
				},
				{
					category: "Problem Analysis",
					description: "Breaking down complex problems into clear solutions",
					examples: ["Requirements analysis", "Technical feasibility studies", "Solution brainstorming"],
				},
				{
					category: "Documentation",
					description: "Create comprehensive plans and documentation",
					examples: ["Technical documentation", "Architecture diagrams", "Implementation guides"],
				},
				{
					category: "Strategic Planning",
					description: "Develop roadmaps and implementation strategies",
					examples: ["Project planning", "Technology selection", "Risk assessment"],
				},
			],
			callToAction: "What system or solution would you like me to help you design?",
		}
	}

	private static getAskModeTemplate(context: GreetingContext): GreetingTemplate {
		return {
			introduction:
				"Hi! I'm Blue Code in Ask mode - here to provide explanations and answer your technical questions.",
			capabilities: [
				{
					category: "Code Explanation",
					description: "Understand and analyze existing code",
					examples: ["Explain complex algorithms", "Code review insights", "Best practices guidance"],
				},
				{
					category: "Technology Guidance",
					description: "Get recommendations and learn about technologies",
					examples: ["Framework comparisons", "Tool recommendations", "Technology deep-dives"],
				},
				{
					category: "Concept Clarification",
					description: "Learn programming concepts and patterns",
					examples: ["Design patterns", "Architecture principles", "Development methodologies"],
				},
				{
					category: "Documentation Analysis",
					description: "Help understand documentation and technical content",
					examples: ["API documentation", "Technical specifications", "Configuration guides"],
				},
			],
			callToAction: "What would you like to learn or understand better?",
		}
	}

	private static getDebugModeTemplate(context: GreetingContext): GreetingTemplate {
		return {
			introduction: "Hello! I'm Blue Code in Debug mode - specialized in troubleshooting and problem-solving.",
			capabilities: [
				{
					category: "Error Investigation",
					description: "Systematically investigate and diagnose issues",
					examples: ["Analyze error messages", "Trace execution flow", "Identify failure points"],
				},
				{
					category: "Diagnostic Tools",
					description: "Add logging and diagnostic capabilities",
					examples: ["Insert debug statements", "Add performance monitoring", "Create test scenarios"],
				},
				{
					category: "Root Cause Analysis",
					description: "Find the underlying causes of problems",
					examples: ["Stack trace analysis", "Memory leak detection", "Performance bottlenecks"],
				},
				{
					category: "Solution Verification",
					description: "Test and validate fixes before implementation",
					examples: ["Create reproduction cases", "Validate solutions", "Prevent regressions"],
				},
			],
			callToAction: "What issue would you like me to help you debug?",
		}
	}

	private static getTranslateModeTemplate(context: GreetingContext): GreetingTemplate {
		return {
			introduction: "Hello! I'm Blue Code in Translate mode - your localization and translation specialist.",
			capabilities: [
				{
					category: "Localization Management",
					description: "Manage translation files and localization workflows",
					examples: ["Update translation keys", "Sync language files", "Validate translations"],
				},
				{
					category: "Multi-language Support",
					description: "Handle internationalization tasks",
					examples: ["Set up i18n frameworks", "Manage locale files", "Handle text formatting"],
				},
				{
					category: "Translation Quality",
					description: "Ensure high-quality translations and consistency",
					examples: ["Review translations", "Maintain terminology", "Cultural adaptations"],
				},
			],
			callToAction: "What translation or localization task can I help you with?",
		}
	}

	private static getTestModeTemplate(context: GreetingContext): GreetingTemplate {
		return {
			introduction: "Hi! I'm Blue Code in Test mode - your Jest testing specialist.",
			capabilities: [
				{
					category: "Test Development",
					description: "Write and maintain comprehensive Jest test suites",
					examples: ["Unit tests", "Integration tests", "End-to-end tests"],
				},
				{
					category: "Test Strategy",
					description: "Implement test-driven development practices",
					examples: ["TDD workflows", "Test planning", "Coverage optimization"],
				},
				{
					category: "Mocking & Stubbing",
					description: "Create effective mocks and test doubles",
					examples: ["API mocking", "Dependency injection", "Test isolation"],
				},
				{
					category: "Quality Assurance",
					description: "Ensure high test quality and maintainability",
					examples: ["Code coverage analysis", "Test performance", "Best practices"],
				},
			],
			callToAction: "What testing challenges can I help you solve?",
		}
	}

	private static getCustomModeTemplate(context: GreetingContext): GreetingTemplate {
		const { modeConfig } = context
		const tools = getToolsForMode(modeConfig.groups)

		// Create capabilities based on tool groups
		const capabilities: ModeCapability[] = []

		if (tools.includes("read_file") || tools.includes("list_files")) {
			capabilities.push({
				category: "File Operations",
				description: "Read and analyze files and project structure",
			})
		}

		if (tools.includes("write_to_file") || tools.includes("apply_diff")) {
			capabilities.push({
				category: "Code Modification",
				description: "Create and modify files with precision",
			})
		}

		if (tools.includes("execute_command")) {
			capabilities.push({
				category: "Command Execution",
				description: "Run terminal commands and scripts",
			})
		}

		if (tools.includes("browser_action")) {
			capabilities.push({
				category: "Browser Automation",
				description: "Interact with web pages and test interfaces",
			})
		}

		return {
			introduction: `Hello! I'm Blue Code in ${modeConfig.name} mode.`,
			capabilities:
				capabilities.length > 0
					? capabilities
					: [
							{
								category: "Custom Functionality",
								description: modeConfig.description || "Specialized capabilities for this mode",
							},
						],
			callToAction: "How can I assist you today?",
		}
	}

	/**
	 * Builds the final response string from the template and context
	 */
	private static buildResponse(template: GreetingTemplate, context: GreetingContext): string {
		let response = template.introduction

		if (template.capabilities.length > 0) {
			response += ` In ${context.modeConfig.name} mode, I can:\n\n`

			template.capabilities.forEach((capability) => {
				response += `• **${capability.category}**: ${capability.description}\n`
				if (capability.examples && capability.examples.length > 0) {
					const exampleText = capability.examples.slice(0, 3).join(", ")
					response += `  _Examples: ${exampleText}_\n`
				}
			})
		}

		// Add contextual information
		if (context.workspacePath) {
			const contextNote = this.getProjectContextNote(context)
			if (contextNote) {
				response += `\n${contextNote}\n`
			}
		}

		// Add call to action
		response += `\n${template.callToAction}`

		return response
	}

	/**
	 * Generates a contextual note based on the project/workspace
	 */
	private static getProjectContextNote(context: GreetingContext): string | undefined {
		if (!context.workspacePath) return undefined

		let note = ""

		if (context.projectName) {
			note += `I can see you're working on the "${context.projectName}" project`
		} else {
			note += "I can see you have a workspace open"
		}

		if (context.projectType) {
			note += ` (${context.projectType})`
		}

		if (context.hasFiles) {
			note += " with files ready to explore"
		}

		return note + "."
	}
}

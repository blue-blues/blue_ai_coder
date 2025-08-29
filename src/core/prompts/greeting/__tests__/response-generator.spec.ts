import { GreetingResponseGenerator } from "../response-generator"
import type { GreetingContext } from "../types"
import { DEFAULT_MODES } from "@blues-code/types"

describe("GreetingResponseGenerator", () => {
	const createContext = (modeSlug: string, overrides: Partial<GreetingContext> = {}): GreetingContext => {
		const modeConfig = DEFAULT_MODES.find((m) => m.slug === modeSlug) || DEFAULT_MODES[0]
		return {
			mode: modeSlug,
			modeConfig,
			...overrides,
		}
	}

	describe("generateResponse", () => {
		it("should generate response for Code mode", () => {
			const context = createContext("code")
			const response = GreetingResponseGenerator.generateResponse(context)

			expect(response).toContain("Hi there! I'm Blue Code")
			expect(response).toContain("software development")
			expect(response).toContain("Code Development")
			expect(response).toContain("Debugging & Troubleshooting")
			expect(response).toContain("What would you like to build or fix today?")
		})

		it("should generate response for Orchestrator mode", () => {
			const context = createContext("orchestrator")
			const response = GreetingResponseGenerator.generateResponse(context)

			expect(response).toContain("Hello! I'm Blue Code in Orchestrator mode")
			expect(response).toContain("complex, multi-step projects")
			expect(response).toContain("Task Breakdown")
			expect(response).toContain("Mode Coordination")
			expect(response).toContain("What ambitious project can I help you tackle today?")
		})

		it("should generate response for Architect mode", () => {
			const context = createContext("architect")
			const response = GreetingResponseGenerator.generateResponse(context)

			expect(response).toContain("Hello! I'm Blue Code in Architect mode")
			expect(response).toContain("technical planning and design")
			expect(response).toContain("System Design")
			expect(response).toContain("Problem Analysis")
			expect(response).toContain("What system or solution would you like me to help you design?")
		})

		it("should generate response for Ask mode", () => {
			const context = createContext("ask")
			const response = GreetingResponseGenerator.generateResponse(context)

			expect(response).toContain("Hi! I'm Blue Code in Ask mode")
			expect(response).toContain("explanations and answer")
			expect(response).toContain("Code Explanation")
			expect(response).toContain("Technology Guidance")
			expect(response).toContain("What would you like to learn or understand better?")
		})

		it("should generate response for Debug mode", () => {
			const context = createContext("debug")
			const response = GreetingResponseGenerator.generateResponse(context)

			expect(response).toContain("Hello! I'm Blue Code in Debug mode")
			expect(response).toContain("troubleshooting and problem-solving")
			expect(response).toContain("Error Investigation")
			expect(response).toContain("Root Cause Analysis")
			expect(response).toContain("What issue would you like me to help you debug?")
		})

		it("should generate response for Translate mode", () => {
			const context = createContext("translate")
			const response = GreetingResponseGenerator.generateResponse(context)

			expect(response).toContain("Hello! I'm Blue Code in Translate mode")
			expect(response).toContain("localization and translation")
			expect(response).toContain("Localization Management")
			expect(response).toContain("Multi-language Support")
			expect(response).toContain("What translation or localization task can I help you with?")
		})

		it("should generate response for Test mode", () => {
			const context = createContext("test")
			const response = GreetingResponseGenerator.generateResponse(context)

			expect(response).toContain("Hi! I'm Blue Code in Test mode")
			expect(response).toContain("Jest testing specialist")
			expect(response).toContain("Test Development")
			expect(response).toContain("Mocking & Stubbing")
			expect(response).toContain("What testing challenges can I help you solve?")
		})

		it("should generate response for custom mode", () => {
			const customModeConfig = {
				slug: "custom",
				name: "Custom Mode",
				description: "A custom mode for testing",
				roleDefinition: "You are a custom assistant",
				groups: ["read", "edit"] as ("read" | "edit")[],
			}

			const context: GreetingContext = {
				mode: "custom",
				modeConfig: customModeConfig,
			}

			const response = GreetingResponseGenerator.generateResponse(context)

			expect(response).toContain("Hello! I'm Blue Code in Custom Mode mode")
			expect(response).toContain("File Operations")
			expect(response).toContain("Code Modification")
			expect(response).toContain("How can I assist you today?")
		})

		it("should include project context when available", () => {
			const context = createContext("code", {
				workspacePath: "/path/to/project",
				projectName: "MyProject",
				projectType: "React project",
				hasFiles: true,
			})

			const response = GreetingResponseGenerator.generateResponse(context)

			expect(response).toContain(
				'I can see you\'re working on the "MyProject" project (React project) with files ready to explore.',
			)
		})

		it("should handle project context without project type", () => {
			const context = createContext("code", {
				workspacePath: "/path/to/project",
				projectName: "MyProject",
				hasFiles: false,
			})

			const response = GreetingResponseGenerator.generateResponse(context)

			expect(response).toContain('I can see you\'re working on the "MyProject" project.')
			expect(response).not.toContain("with files ready to explore")
		})

		it("should handle workspace without project name", () => {
			const context = createContext("code", {
				workspacePath: "/path/to/project",
				projectType: "Node.js project",
			})

			const response = GreetingResponseGenerator.generateResponse(context)

			expect(response).toContain("I can see you have a workspace open (Node.js project).")
		})

		it("should handle minimal workspace context", () => {
			const context = createContext("code", {
				workspacePath: "/path/to/project",
			})

			const response = GreetingResponseGenerator.generateResponse(context)

			expect(response).toContain("I can see you have a workspace open.")
		})

		it("should format capabilities with examples", () => {
			const context = createContext("code")
			const response = GreetingResponseGenerator.generateResponse(context)

			// Check that examples are included and formatted correctly
			expect(response).toContain("_Examples:")
			expect(response).toContain("Create new functions")
			expect(response).toContain("Fix bugs")
		})

		it("should handle custom mode with no tool groups", () => {
			const customModeConfig = {
				slug: "minimal",
				name: "Minimal Mode",
				description: "A minimal custom mode",
				roleDefinition: "You are a minimal assistant",
				groups: [] as ("read" | "edit" | "browser" | "command" | "mcp" | "modes")[],
			}

			const context: GreetingContext = {
				mode: "minimal",
				modeConfig: customModeConfig,
			}

			const response = GreetingResponseGenerator.generateResponse(context)

			expect(response).toContain("Hello! I'm Blue Code in Minimal Mode mode")
			expect(response).toContain("Custom Functionality")
			expect(response).toContain("A minimal custom mode")
		})

		it("should handle custom mode with browser tools", () => {
			const customModeConfig = {
				slug: "web",
				name: "Web Mode",
				description: "Web testing mode",
				roleDefinition: "You are a web testing assistant",
				groups: ["browser", "command"] as ("browser" | "command")[],
			}

			const context: GreetingContext = {
				mode: "web",
				modeConfig: customModeConfig,
			}

			const response = GreetingResponseGenerator.generateResponse(context)

			expect(response).toContain("Browser Automation")
			expect(response).toContain("Command Execution")
		})
	})
})

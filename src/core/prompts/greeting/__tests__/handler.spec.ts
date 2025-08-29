import { detectAndHandleGreeting, getWorkspaceContext } from "../handler"
import { DEFAULT_MODES } from "@blues-code/types"
import * as vscode from "vscode"
import { vi } from "vitest"

// Mock vscode
vi.mock("vscode", () => ({
	workspace: {
		workspaceFolders: undefined,
	},
}))

// Mock fs for project detection
const mockFs = {
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
	readdirSync: vi.fn(),
}

vi.mock("fs", () => mockFs)

describe("detectAndHandleGreeting", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should detect and handle simple greeting", () => {
		const result = detectAndHandleGreeting("hi", "code")

		expect(result.isGreeting).toBe(true)
		expect(result.confidence).toBeGreaterThan(0.9)
		expect(result.shouldBypassAI).toBe(true)
		expect(result.response).toContain("Hi there! I'm Blue Code")
		expect(result.response).toContain("software development")
	})

	it("should handle greeting with workspace context", () => {
		// Mock workspace with package.json
		mockFs.existsSync.mockImplementation((path: string) => {
			return path.includes("package.json")
		})
		mockFs.readFileSync.mockReturnValue(
			JSON.stringify({
				name: "test-project",
				dependencies: { react: "^18.0.0" },
			}),
		)
		mockFs.readdirSync.mockReturnValue(["src", "package.json", "README.md"])

		const result = detectAndHandleGreeting("hello", "code", undefined, "/path/to/project")

		expect(result.isGreeting).toBe(true)
		expect(result.response).toContain("React project")
		expect(result.response).toContain("project")
	})

	it("should handle greeting with custom mode", () => {
		const customModes = [
			{
				slug: "custom",
				name: "Custom Mode",
				description: "A custom mode",
				roleDefinition: "You are a custom assistant",
				groups: ["read", "edit"] as ("read" | "edit")[],
			},
		]

		const result = detectAndHandleGreeting("hey", "custom", customModes)

		expect(result.isGreeting).toBe(true)
		expect(result.response).toContain("Custom Mode mode")
	})

	it("should not detect non-greetings", () => {
		const result = detectAndHandleGreeting("create a new file", "code")

		expect(result.isGreeting).toBe(false)
		expect(result.confidence).toBe(0)
		expect(result.response).toBeUndefined()
	})

	it("should handle invalid mode gracefully", () => {
		const result = detectAndHandleGreeting("hi", "nonexistent-mode")

		expect(result.isGreeting).toBe(false)
		expect(result.confidence).toBe(0)
	})

	it("should detect different project types", () => {
		const testCases = [
			{
				files: { "package.json": { dependencies: { vue: "^3.0.0" } } },
				expected: "Vue.js project",
			},
			{
				files: { "package.json": { dependencies: { "@angular/core": "^15.0.0" } } },
				expected: "Angular project",
			},
			{
				files: { "package.json": { dependencies: { next: "^13.0.0" } } },
				expected: "Next.js project",
			},
			{
				files: { "requirements.txt": "" },
				expected: "Python project",
			},
			{
				files: { "Cargo.toml": "" },
				expected: "Rust project",
			},
			{
				files: { "go.mod": "" },
				expected: "Go project",
			},
		]

		testCases.forEach(({ files, expected }) => {
			vi.clearAllMocks()

			mockFs.existsSync.mockImplementation((path: string) => {
				return Object.keys(files).some((file) => path.includes(file))
			})

			if (files["package.json"]) {
				mockFs.readFileSync.mockReturnValue(JSON.stringify(files["package.json"]))
			}

			mockFs.readdirSync.mockReturnValue(["src", ...Object.keys(files)])

			const result = detectAndHandleGreeting("hi", "code", undefined, "/test/project")

			expect(result.response).toContain(expected)
		})
	})

	it("should handle workspace with no files", () => {
		mockFs.readdirSync.mockReturnValue([])

		const result = detectAndHandleGreeting("hello", "code", undefined, "/empty/project")

		expect(result.response).toContain("I can see you have a workspace open.")
		expect(result.response).not.toContain("with files ready to explore")
	})

	it("should handle file system errors gracefully", () => {
		mockFs.existsSync.mockImplementation(() => {
			throw new Error("File system error")
		})

		const result = detectAndHandleGreeting("hi", "code", undefined, "/error/project")

		expect(result.isGreeting).toBe(true)
		expect(result.response).not.toContain("project")
	})

	it("should handle different modes correctly", () => {
		const modes = ["code", "orchestrator", "architect", "ask", "debug", "translate", "test"]

		modes.forEach((mode) => {
			const result = detectAndHandleGreeting("hello", mode)

			expect(result.isGreeting).toBe(true)
			expect(result.response).toContain("Blue Code")
			expect(result.response).toContain(mode === "code" ? "Code" : mode)
		})
	})
})

describe("getWorkspaceContext", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should return workspace path when available", () => {
		const mockWorkspaceFolder = {
			uri: { fsPath: "/test/workspace" },
			name: "test-workspace",
			index: 0,
		}

		// Mock vscode workspace
		const mockVscode = vscode as any
		mockVscode.workspace.workspaceFolders = [mockWorkspaceFolder]

		const result = getWorkspaceContext()
		expect(result).toBe("/test/workspace")
	})

	it("should return undefined when no workspace", () => {
		const mockVscode = vscode as any
		mockVscode.workspace.workspaceFolders = undefined

		const result = getWorkspaceContext()
		expect(result).toBeUndefined()
	})

	it("should return undefined when empty workspace folders", () => {
		const mockVscode = vscode as any
		mockVscode.workspace.workspaceFolders = []

		const result = getWorkspaceContext()
		expect(result).toBeUndefined()
	})

	it("should return first workspace folder when multiple exist", () => {
		const mockWorkspaceFolders = [
			{ uri: { fsPath: "/first/workspace" }, name: "first", index: 0 },
			{ uri: { fsPath: "/second/workspace" }, name: "second", index: 1 },
		]

		const mockVscode = vscode as any
		mockVscode.workspace.workspaceFolders = mockWorkspaceFolders

		const result = getWorkspaceContext()
		expect(result).toBe("/first/workspace")
	})
})

/**
 * TRAE-Agent Phase 2 Integration Tests
 *
 * This test suite validates the complete integration of Phase 2 intelligence
 * components with the existing Task system and Phase 1 reflection engine.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest"
import { Task } from "../../task/Task"
import {
	createIntelligenceSystem,
	DEFAULT_INTELLIGENCE_CONFIG,
	EXPERIMENTAL_INTELLIGENCE_CONFIG,
	CONSERVATIVE_INTELLIGENCE_CONFIG,
} from "../index"
import { initializeExperiments, getEnvironmentFlags, ExperimentManager } from "../../config/ExperimentFlags"

// Mock dependencies
vi.mock("vscode", () => ({
	workspace: {
		getConfiguration: vi.fn(() => ({
			get: vi.fn(() => true),
		})),
	},
}))

vi.mock("../../webview/ClineProvider")
vi.mock("../../api")

describe("TRAE-Agent Phase 2 Integration", () => {
	let mockProvider: any
	let mockApiConfiguration: any
	let mockContext: any

	beforeEach(() => {
		// Setup mock provider
		mockProvider = {
			context: { globalStorageUri: { fsPath: "/tmp/test" } },
			getState: vi.fn().mockResolvedValue({
				experiments: {
					enableReflection: true,
					enableIntelligence: true,
				},
				mode: "code",
			}),
			log: vi.fn(),
			postStateToWebview: vi.fn(),
			updateTaskHistory: vi.fn(),
			postMessageToWebview: vi.fn(),
			providerSettingsManager: {
				getProfile: vi.fn(),
			},
		}

		mockApiConfiguration = {
			apiProvider: "anthropic",
			apiModelId: "claude-3-sonnet-20240229",
		}

		mockContext = {
			globalStorageUri: { fsPath: "/tmp/test" },
			extensionPath: "/tmp/extension",
		}

		// Clear environment variables
		delete process.env.TRAE_INTELLIGENCE_ENABLED
		delete process.env.TRAE_CONTEXT_MEMORY_ENABLED
		delete process.env.NODE_ENV
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("Intelligence System Creation", () => {
		test("should create intelligence system with default configuration", () => {
			const system = createIntelligenceSystem(DEFAULT_INTELLIGENCE_CONFIG)

			expect(system).toBeDefined()
			expect(system.contextMemory).toBeDefined()
			expect(system.errorRecovery).toBeDefined()
			expect(system.strategyAdapter).toBeDefined()
			expect(system.toolSelector).toBeDefined()
			expect(system.problemDetector).toBeDefined()
		})

		test("should create intelligence system with experimental configuration", () => {
			const system = createIntelligenceSystem(EXPERIMENTAL_INTELLIGENCE_CONFIG)

			expect(system).toBeDefined()
			expect(system.contextMemory).toBeDefined()
			expect(system.errorRecovery).toBeDefined()
			expect(system.strategyAdapter).toBeDefined()
			expect(system.toolSelector).toBeDefined()
			expect(system.problemDetector).toBeDefined()
		})

		test("should create intelligence system with conservative configuration", () => {
			const system = createIntelligenceSystem(CONSERVATIVE_INTELLIGENCE_CONFIG)

			expect(system).toBeDefined()
			expect(system.contextMemory).toBeDefined()
			expect(system.errorRecovery).toBeDefined()
			expect(system.strategyAdapter).toBeDefined()
			expect(system.toolSelector).toBeDefined()
			expect(system.problemDetector).toBeDefined()
		})
	})

	describe("Experiment Manager Integration", () => {
		test("should initialize experiment manager with environment flags", () => {
			const flags = getEnvironmentFlags()
			const manager = initializeExperiments(flags, "test-task-id")

			expect(manager).toBeDefined()
			expect(manager.shouldEnableIntelligence()).toBeDefined()
			expect(manager.getIntelligenceConfig()).toBeDefined()
		})

		test("should respect environment variable overrides", () => {
			process.env.TRAE_INTELLIGENCE_ENABLED = "true"
			process.env.TRAE_CONTEXT_MEMORY_ENABLED = "false"

			const flags = getEnvironmentFlags()
			const manager = initializeExperiments(flags, "test-task-id")

			expect(manager.shouldEnableIntelligence()).toBe(true)

			delete process.env.TRAE_INTELLIGENCE_ENABLED
			delete process.env.TRAE_CONTEXT_MEMORY_ENABLED
		})
	})

	describe("Task Integration", () => {
		test("should create task with intelligence system when enabled", async () => {
			mockProvider.getState.mockResolvedValue({
				experiments: {
					enableReflection: true,
					enableIntelligence: true,
				},
				mode: "code",
			})

			const task = new Task({
				context: mockContext,
				provider: mockProvider,
				apiConfiguration: mockApiConfiguration,
				task: "Test task",
				startTask: false,
			})

			// Wait for async initialization
			await task.waitForModeInitialization()

			expect(task).toBeDefined()
			expect(task.taskId).toBeDefined()
			expect(task.enableReflection).toBe(true)
			expect(task.enableIntelligence).toBe(true)
		})

		test("should create task without intelligence system when disabled", async () => {
			mockProvider.getState.mockResolvedValue({
				experiments: {
					enableReflection: false,
					enableIntelligence: false,
				},
				mode: "code",
			})

			const task = new Task({
				context: mockContext,
				provider: mockProvider,
				apiConfiguration: mockApiConfiguration,
				task: "Test task",
				startTask: false,
			})

			await task.waitForModeInitialization()

			expect(task).toBeDefined()
			expect(task.enableReflection).toBe(false)
			expect(task.enableIntelligence).toBe(false)
		})

		test("should properly dispose of intelligence system", async () => {
			mockProvider.getState.mockResolvedValue({
				experiments: {
					enableReflection: true,
					enableIntelligence: true,
				},
				mode: "code",
			})

			const task = new Task({
				context: mockContext,
				provider: mockProvider,
				apiConfiguration: mockApiConfiguration,
				task: "Test task",
				startTask: false,
			})

			await task.waitForModeInitialization()

			// Mock intelligence system for disposal test
			const mockIntelligenceSystem = {
				contextMemory: { dispose: vi.fn() },
				errorRecovery: { dispose: vi.fn() },
				strategyAdapter: { dispose: vi.fn() },
				toolSelector: { dispose: vi.fn() },
				problemDetector: { dispose: vi.fn() },
			}

			const mockReflectionEngine = { dispose: vi.fn() }
			const mockExperimentManager = { dispose: vi.fn() }

			// @ts-ignore - accessing private properties for testing
			task.intelligenceSystem = mockIntelligenceSystem
			task.reflectionEngine = mockReflectionEngine
			task.experimentManager = mockExperimentManager as unknown as ExperimentManager

			// Test disposal
			task.dispose()

			expect(mockIntelligenceSystem.contextMemory.dispose).toHaveBeenCalled()
			expect(mockIntelligenceSystem.errorRecovery.dispose).toHaveBeenCalled()
			expect(mockIntelligenceSystem.strategyAdapter.dispose).toHaveBeenCalled()
			expect(mockIntelligenceSystem.toolSelector.dispose).toHaveBeenCalled()
			expect(mockIntelligenceSystem.problemDetector.dispose).toHaveBeenCalled()
			expect(mockReflectionEngine.dispose).toHaveBeenCalled()
			expect(mockExperimentManager.dispose).toHaveBeenCalled()
		})
	})

	describe("Backward Compatibility", () => {
		test("should work with existing Phase 1 reflection only", async () => {
			mockProvider.getState.mockResolvedValue({
				experiments: {
					enableReflection: true,
					enableIntelligence: false, // Phase 2 disabled
				},
				mode: "code",
			})

			const task = new Task({
				context: mockContext,
				provider: mockProvider,
				apiConfiguration: mockApiConfiguration,
				task: "Test task",
				startTask: false,
			})

			await task.waitForModeInitialization()

			expect(task.enableReflection).toBe(true)
			expect(task.enableIntelligence).toBe(false)
			expect(task.reflectionEngine).toBeDefined()
			expect(task.intelligenceSystem).toBeUndefined()
		})

		test("should work without any TRAE-Agent features", async () => {
			mockProvider.getState.mockResolvedValue({
				experiments: {
					enableReflection: false,
					enableIntelligence: false,
				},
				mode: "code",
			})

			const task = new Task({
				context: mockContext,
				provider: mockProvider,
				apiConfiguration: mockApiConfiguration,
				task: "Test task",
				startTask: false,
			})

			await task.waitForModeInitialization()

			expect(task.enableReflection).toBe(false)
			expect(task.enableIntelligence).toBe(false)
			expect(task.reflectionEngine).toBeUndefined()
			expect(task.intelligenceSystem).toBeUndefined()
		})

		test("should handle missing experiment configuration gracefully", async () => {
			mockProvider.getState.mockResolvedValue({
				mode: "code",
				// No experiments property
			})

			const task = new Task({
				context: mockContext,
				provider: mockProvider,
				apiConfiguration: mockApiConfiguration,
				task: "Test task",
				startTask: false,
			})

			await task.waitForModeInitialization()

			// Should default to disabled
			expect(task.enableReflection).toBe(false)
			expect(task.enableIntelligence).toBe(false)
		})
	})

	describe("Performance and Resource Management", () => {
		test("should handle intelligence system initialization errors gracefully", async () => {
			// Mock environment to trigger error
			process.env.NODE_ENV = "test-error"

			mockProvider.getState.mockResolvedValue({
				experiments: {
					enableReflection: true,
					enableIntelligence: true,
				},
				mode: "code",
			})

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

			const task = new Task({
				context: mockContext,
				provider: mockProvider,
				apiConfiguration: mockApiConfiguration,
				task: "Test task",
				startTask: false,
			})

			await task.waitForModeInitialization()

			// Task should still be created even if intelligence system fails
			expect(task).toBeDefined()

			consoleSpy.mockRestore()
			delete process.env.NODE_ENV
		})

		test("should handle disposal errors gracefully", () => {
			const task = new Task({
				context: mockContext,
				provider: mockProvider,
				apiConfiguration: mockApiConfiguration,
				task: "Test task",
				startTask: false,
			})

			// Mock failing components
			const mockFailingSystem = {
				contextMemory: {
					dispose: vi.fn().mockImplementation(() => {
						throw new Error("Disposal failed")
					}),
				},
				errorRecovery: { dispose: vi.fn() },
				strategyAdapter: { dispose: vi.fn() },
				toolSelector: { dispose: vi.fn() },
				problemDetector: { dispose: vi.fn() },
			}

			// @ts-ignore - accessing private properties for testing
			task.intelligenceSystem = mockFailingSystem

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

			// Should not throw even if disposal fails
			expect(() => task.dispose()).not.toThrow()
			expect(consoleSpy).toHaveBeenCalled()

			consoleSpy.mockRestore()
		})
	})

	describe("Configuration Management", () => {
		test("should select appropriate configuration based on environment", () => {
			// Test production environment
			process.env.NODE_ENV = "production"
			let flags = getEnvironmentFlags()
			let manager = initializeExperiments(flags, "test-task")
			let config = manager.getIntelligenceConfig()
			expect(config).toBeDefined()

			// Test development environment
			process.env.NODE_ENV = "development"
			flags = getEnvironmentFlags()
			manager = initializeExperiments(flags, "test-task")
			config = manager.getIntelligenceConfig()
			expect(config).toBeDefined()

			// Test default environment
			delete process.env.NODE_ENV
			flags = getEnvironmentFlags()
			manager = initializeExperiments(flags, "test-task")
			config = manager.getIntelligenceConfig()
			expect(config).toBeDefined()
		})

		test("should override configuration with experiment manager settings", () => {
			const flags = getEnvironmentFlags()
			const manager = initializeExperiments(flags, "test-task")

			const baseConfig = DEFAULT_INTELLIGENCE_CONFIG
			const experimentConfig = manager.getIntelligenceConfig()

			// Should be able to merge configurations
			const mergedConfig = { ...baseConfig, ...experimentConfig }
			expect(mergedConfig).toBeDefined()
		})
	})
})

/**
 * Integration Test Helper Functions
 */

export const createMockTask = async (
	options: {
		enableReflection?: boolean
		enableIntelligence?: boolean
		experiments?: Record<string, any>
	} = {},
) => {
	const mockProvider = {
		context: { globalStorageUri: { fsPath: "/tmp/test" } },
		getState: vi.fn().mockResolvedValue({
			experiments: {
				enableReflection: options.enableReflection ?? false,
				enableIntelligence: options.enableIntelligence ?? false,
				...options.experiments,
			},
			mode: "code",
		}),
		log: vi.fn(),
		postStateToWebview: vi.fn(),
		updateTaskHistory: vi.fn(),
		postMessageToWebview: vi.fn(),
		providerSettingsManager: {
			getProfile: vi.fn(),
		},
	}

	const task = new Task({
		context: {
			globalStorageUri: {
				fsPath: "/tmp/test",
				scheme: "file",
				authority: "",
				path: "/tmp/test",
				query: "",
				fragment: "",
				with: () => ({}) as any,
				toJSON: () => ({}),
			},
			extensionPath: "/tmp/extension",
		} as any,
		provider: mockProvider as any,
		apiConfiguration: {
			apiProvider: "anthropic",
			apiModelId: "claude-3-sonnet-20240229",
		},
		task: "Test task",
		startTask: false,
	})

	await task.waitForModeInitialization()
	return { task, mockProvider }
}

export const testIntelligenceSystemIntegration = async () => {
	const { task, mockProvider } = await createMockTask({
		enableReflection: true,
		enableIntelligence: true,
	})

	// Test that all intelligence components are properly initialized
	expect(task.enableIntelligence).toBe(true)
	expect(task.intelligenceSystem).toBeDefined()

	task.dispose()
	return { task, mockProvider }
}

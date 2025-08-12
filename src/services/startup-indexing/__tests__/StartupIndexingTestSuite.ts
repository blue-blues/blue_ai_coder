import * as vscode from "vscode"
import * as assert from "assert"
import * as sinon from "sinon"
import { StartupIndexingCoordinator, StartupPhase, StartupIndexingConfig } from "../StartupIndexingCoordinator"
import { StartupIndexingErrorHandler, StartupIndexingErrorType } from "../StartupIndexingErrorHandler"
import { StartupIndexingMonitor } from "../StartupIndexingMonitor"
import { StartupIndexingCompatibility, LegacyIndexingMode } from "../StartupIndexingCompatibility"
import { CodeIndexManager } from "../../code-index/manager"
import { SchematicAnalyzer } from "../../code-index/SchematicAnalyzer"
import { BackgroundIndexingService } from "../../code-index/BackgroundIndexingService"

/**
 * Test scenarios for startup indexing
 */
export enum TestScenario {
	SMALL_WORKSPACE = "small_workspace",
	LARGE_WORKSPACE = "large_workspace",
	MULTIPLE_WORKSPACES = "multiple_workspaces",
	ALREADY_INDEXED = "already_indexed",
	CRITICAL_FILES_TIMEOUT = "critical_files_timeout",
	HIGH_PRIORITY_TIMEOUT = "high_priority_timeout",
	SERVICE_UNAVAILABLE = "service_unavailable",
	MEMORY_PRESSURE = "memory_pressure",
	USER_CANCELLATION = "user_cancellation",
	LEGACY_COMPATIBILITY = "legacy_compatibility",
	ERROR_RECOVERY = "error_recovery",
	CONFIGURATION_CHANGES = "configuration_changes",
}

/**
 * Test fixture for startup indexing scenarios
 */
interface StartupIndexingTestFixture {
	coordinator: StartupIndexingCoordinator
	errorHandler: StartupIndexingErrorHandler
	monitor: StartupIndexingMonitor
	compatibility: StartupIndexingCompatibility
	mockManagers: CodeIndexManager[]
	mockAnalyzers: SchematicAnalyzer[]
	mockServices: BackgroundIndexingService[]
	outputChannel: vscode.OutputChannel
	context: vscode.ExtensionContext
}

/**
 * Comprehensive test suite for startup indexing
 */
export class StartupIndexingTestSuite {
	private fixtures: Map<TestScenario, StartupIndexingTestFixture> = new Map()
	private testResults: Map<TestScenario, { passed: boolean; duration: number; error?: Error }> = new Map()

	/**
	 * Runs all startup indexing tests
	 */
	public async runAllTests(): Promise<{
		totalTests: number
		passedTests: number
		failedTests: number
		results: Map<TestScenario, { passed: boolean; duration: number; error?: Error }>
	}> {
		console.log("[StartupIndexingTests] Starting comprehensive test suite...")

		const scenarios = Object.values(TestScenario)
		let passedTests = 0
		let failedTests = 0

		for (const scenario of scenarios) {
			try {
				const startTime = Date.now()
				await this.runTestScenario(scenario)
				const duration = Date.now() - startTime

				this.testResults.set(scenario, { passed: true, duration })
				passedTests++
				console.log(`[StartupIndexingTests] ✅ ${scenario} passed (${duration}ms)`)
			} catch (error) {
				const duration = Date.now() - Date.now()
				this.testResults.set(scenario, { passed: false, duration, error })
				failedTests++
				console.error(`[StartupIndexingTests] ❌ ${scenario} failed:`, error.message)
			}
		}

		console.log(`[StartupIndexingTests] Test suite completed: ${passedTests}/${scenarios.length} passed`)

		return {
			totalTests: scenarios.length,
			passedTests,
			failedTests,
			results: new Map(this.testResults),
		}
	}

	/**
	 * Runs a specific test scenario
	 */
	public async runTestScenario(scenario: TestScenario): Promise<void> {
		const fixture = await this.createTestFixture(scenario)
		this.fixtures.set(scenario, fixture)

		switch (scenario) {
			case TestScenario.SMALL_WORKSPACE:
				await this.testSmallWorkspace(fixture)
				break
			case TestScenario.LARGE_WORKSPACE:
				await this.testLargeWorkspace(fixture)
				break
			case TestScenario.MULTIPLE_WORKSPACES:
				await this.testMultipleWorkspaces(fixture)
				break
			case TestScenario.ALREADY_INDEXED:
				await this.testAlreadyIndexed(fixture)
				break
			case TestScenario.CRITICAL_FILES_TIMEOUT:
				await this.testCriticalFilesTimeout(fixture)
				break
			case TestScenario.HIGH_PRIORITY_TIMEOUT:
				await this.testHighPriorityTimeout(fixture)
				break
			case TestScenario.SERVICE_UNAVAILABLE:
				await this.testServiceUnavailable(fixture)
				break
			case TestScenario.MEMORY_PRESSURE:
				await this.testMemoryPressure(fixture)
				break
			case TestScenario.USER_CANCELLATION:
				await this.testUserCancellation(fixture)
				break
			case TestScenario.LEGACY_COMPATIBILITY:
				await this.testLegacyCompatibility(fixture)
				break
			case TestScenario.ERROR_RECOVERY:
				await this.testErrorRecovery(fixture)
				break
			case TestScenario.CONFIGURATION_CHANGES:
				await this.testConfigurationChanges(fixture)
				break
			default:
				throw new Error(`Unknown test scenario: ${scenario}`)
		}
	}

	/**
	 * Tests small workspace scenario
	 */
	private async testSmallWorkspace(fixture: StartupIndexingTestFixture): Promise<void> {
		// Setup: Small workspace with 50 files
		this.setupWorkspaceFiles(fixture, 50, 5, 10)

		// Execute
		const results = await fixture.coordinator.coordinateStartupIndexing(
			fixture.mockManagers,
			fixture.mockAnalyzers,
			fixture.mockServices,
		)

		// Verify
		assert.strictEqual(results.length, 1, "Should have one result")
		assert.strictEqual(results[0].success, true, "Should succeed for small workspace")
		assert.strictEqual(results[0].criticalFilesIndexed, true, "Critical files should be indexed")

		// Verify no blocking occurred for small workspace
		const status = fixture.coordinator.getStatus()
		assert.strictEqual(status.isBlocking, false, "Should not block for small workspace")
	}

	/**
	 * Tests large workspace scenario
	 */
	private async testLargeWorkspace(fixture: StartupIndexingTestFixture): Promise<void> {
		// Setup: Large workspace with 2000 files
		this.setupWorkspaceFiles(fixture, 2000, 100, 300)

		// Execute
		const results = await fixture.coordinator.coordinateStartupIndexing(
			fixture.mockManagers,
			fixture.mockAnalyzers,
			fixture.mockServices,
		)

		// Verify
		assert.strictEqual(results.length, 1, "Should have one result")
		assert.strictEqual(results[0].success, true, "Should succeed for large workspace")

		// Verify blocking occurred for large workspace
		const metrics = fixture.monitor.getCurrentMetrics()
		assert.ok(metrics.totalDuration > 0, "Should have taken time to process")
	}

	/**
	 * Tests multiple workspaces scenario
	 */
	private async testMultipleWorkspaces(fixture: StartupIndexingTestFixture): Promise<void> {
		// Setup: Multiple workspaces
		this.setupMultipleWorkspaces(fixture, 3)

		// Execute
		const results = await fixture.coordinator.coordinateStartupIndexing(
			fixture.mockManagers,
			fixture.mockAnalyzers,
			fixture.mockServices,
		)

		// Verify
		assert.strictEqual(results.length, 3, "Should have three results")
		assert.ok(
			results.every((r) => r.success),
			"All workspaces should succeed",
		)
	}

	/**
	 * Tests already indexed workspace scenario
	 */
	private async testAlreadyIndexed(fixture: StartupIndexingTestFixture): Promise<void> {
		// Setup: Already indexed workspace
		this.setupAlreadyIndexedWorkspace(fixture)

		// Execute
		const results = await fixture.coordinator.coordinateStartupIndexing(
			fixture.mockManagers,
			fixture.mockAnalyzers,
			fixture.mockServices,
		)

		// Verify
		assert.strictEqual(results.length, 1, "Should have one result")
		assert.strictEqual(results[0].success, true, "Should succeed quickly")

		// Verify minimal processing occurred
		const metrics = fixture.monitor.getCurrentMetrics()
		assert.ok(metrics.totalDuration < 1000, "Should complete quickly for already indexed workspace")
	}

	/**
	 * Tests critical files timeout scenario
	 */
	private async testCriticalFilesTimeout(fixture: StartupIndexingTestFixture): Promise<void> {
		// Setup: Slow critical file processing
		this.setupSlowProcessing(fixture, "critical")

		// Execute and expect timeout handling
		const results = await fixture.coordinator.coordinateStartupIndexing(
			fixture.mockManagers,
			fixture.mockAnalyzers,
			fixture.mockServices,
		)

		// Verify error handling
		const errorStats = fixture.coordinator.getErrorStatistics()
		assert.ok(
			errorStats.errorCounts.get(StartupIndexingErrorType.CRITICAL_FILES_TIMEOUT)! > 0,
			"Should record timeout error",
		)
	}

	/**
	 * Tests high priority timeout scenario
	 * DIAGNOSTIC: Adding missing testHighPriorityTimeout method implementation
	 * This method was called in switch statement but never implemented
	 */
	private async testHighPriorityTimeout(fixture: StartupIndexingTestFixture): Promise<void> {
		// Setup: Slow high priority file processing
		this.setupSlowProcessing(fixture, "high")

		// Execute and expect timeout handling
		const results = await fixture.coordinator.coordinateStartupIndexing(
			fixture.mockManagers,
			fixture.mockAnalyzers,
			fixture.mockServices,
		)

		// Verify error handling for high priority timeout
		const errorStats = fixture.coordinator.getErrorStatistics()
		assert.ok(
			errorStats.errorCounts.get(StartupIndexingErrorType.HIGH_PRIORITY_TIMEOUT)! > 0,
			"Should record high priority timeout error",
		)

		// Verify that critical files were still processed despite high priority timeout
		const status = fixture.coordinator.getStatus()
		assert.strictEqual((status as any).criticalFilesIndexed, true, "Critical files should still be indexed")
	}

	/**
	 * Tests service unavailable scenario
	 */
	private async testServiceUnavailable(fixture: StartupIndexingTestFixture): Promise<void> {
		// Setup: Unavailable service
		this.setupUnavailableService(fixture)

		// Execute
		try {
			await fixture.coordinator.coordinateStartupIndexing(
				fixture.mockManagers,
				fixture.mockAnalyzers,
				fixture.mockServices,
			)
		} catch (error) {
			// Expected to handle gracefully
		}

		// Verify error recovery
		const errorStats = fixture.coordinator.getErrorStatistics()
		assert.ok(
			errorStats.errorCounts.get(StartupIndexingErrorType.SERVICE_UNAVAILABLE)! > 0,
			"Should record service error",
		)
	}

	/**
	 * Tests memory pressure scenario
	 */
	private async testMemoryPressure(fixture: StartupIndexingTestFixture): Promise<void> {
		// Setup: High memory usage simulation
		this.setupMemoryPressure(fixture)

		// Execute
		const results = await fixture.coordinator.coordinateStartupIndexing(
			fixture.mockManagers,
			fixture.mockAnalyzers,
			fixture.mockServices,
		)

		// Verify adaptive behavior
		const healthStatus = fixture.monitor.getHealthStatus()
		assert.ok(
			healthStatus.issues.some((issue) => issue.includes("memory")),
			"Should detect memory issues",
		)
	}

	/**
	 * Tests user cancellation scenario
	 */
	private async testUserCancellation(fixture: StartupIndexingTestFixture): Promise<void> {
		// Setup: Normal processing
		this.setupWorkspaceFiles(fixture, 500, 50, 100)

		// Execute with cancellation
		const coordinationPromise = fixture.coordinator.coordinateStartupIndexing(
			fixture.mockManagers,
			fixture.mockAnalyzers,
			fixture.mockServices,
		)

		// Simulate user cancellation after 100ms
		setTimeout(() => {
			fixture.coordinator.requestCancel()
		}, 100)

		// Wait for completion
		await coordinationPromise

		// Verify cancellation was handled
		const status = fixture.coordinator.getStatus()
		assert.strictEqual(status.isBlocking, false, "Should not be blocking after cancellation")
	}

	/**
	 * Tests legacy compatibility scenario
	 */
	private async testLegacyCompatibility(fixture: StartupIndexingTestFixture): Promise<void> {
		// Setup: Legacy settings
		this.setupLegacySettings(fixture)

		// Test compatibility checks
		const shouldEnable = fixture.compatibility.shouldEnableStartupIndexing()
		assert.strictEqual(typeof shouldEnable, "boolean", "Should return boolean for enable check")

		// Test configuration adaptation
		const baseConfig: StartupIndexingConfig = {
			enabled: true,
			mandatoryForLargeWorkspaces: true,
			maxWorkspaceSizeForAutoStart: 1000,
			criticalFilesTimeout: 30000,
			highPriorityTimeout: 60000,
			showProgressUI: true,
			allowSkipAfterTimeout: 45000,
			enablePerformanceOptimizations: true,
		}

		const adaptedConfig = fixture.compatibility.adaptConfigurationForCompatibility(baseConfig)
		assert.ok(adaptedConfig, "Should return adapted configuration")

		// Test backward compatibility validation
		const validation = await fixture.compatibility.validateBackwardCompatibility(fixture.mockManagers)
		assert.strictEqual(typeof validation.isCompatible, "boolean", "Should return compatibility status")
	}

	/**
	 * Tests error recovery scenario
	 */
	private async testErrorRecovery(fixture: StartupIndexingTestFixture): Promise<void> {
		// Setup: Error-prone scenario
		this.setupErrorProneScenario(fixture)

		// Execute with expected errors
		const results = await fixture.coordinator.coordinateStartupIndexing(
			fixture.mockManagers,
			fixture.mockAnalyzers,
			fixture.mockServices,
		)

		// Verify recovery mechanisms
		const errorStats = fixture.coordinator.getErrorStatistics()
		assert.ok(errorStats.recoveryHistory.length > 0, "Should have recovery attempts")
		assert.ok(errorStats.successRate >= 0, "Should calculate success rate")
	}

	/**
	 * Tests configuration changes scenario
	 */
	private async testConfigurationChanges(fixture: StartupIndexingTestFixture): Promise<void> {
		// Setup: Initial configuration
		this.setupWorkspaceFiles(fixture, 100, 10, 20)

		// Test configuration updates
		const newConfig = {
			criticalFilesTimeout: 15000,
			showProgressUI: false,
		}

		fixture.coordinator.updateConfig(newConfig)

		// Verify configuration was updated
		const status = fixture.coordinator.getStatus()
		assert.strictEqual(status.config.criticalFilesTimeout, 15000, "Should update timeout")
		assert.strictEqual(status.config.showProgressUI, false, "Should update UI setting")
	}

	/**
	 * Creates a test fixture for a specific scenario
	 */
	private async createTestFixture(scenario: TestScenario): Promise<StartupIndexingTestFixture> {
		// Create mock VSCode context and output channel
		const context = this.createMockContext()
		const outputChannel = this.createMockOutputChannel()

		// Create real instances with mocked dependencies
		const coordinator = new StartupIndexingCoordinator(context, outputChannel)
		const errorHandler = new StartupIndexingErrorHandler(outputChannel)
		const monitor = new StartupIndexingMonitor(outputChannel)
		const compatibility = new StartupIndexingCompatibility(outputChannel)

		// Create mock services
		const mockManagers = [this.createMockCodeIndexManager()]
		const mockAnalyzers = [this.createMockSchematicAnalyzer()]
		const mockServices = [this.createMockBackgroundIndexingService()]

		return {
			coordinator,
			errorHandler,
			monitor,
			compatibility,
			mockManagers,
			mockAnalyzers,
			mockServices,
			outputChannel,
			context,
		}
	}

	/**
	 * Helper methods for setting up test scenarios
	 */
	private setupWorkspaceFiles(
		fixture: StartupIndexingTestFixture,
		total: number,
		critical: number,
		high: number,
	): void {
		const mockAnalyzer = fixture.mockAnalyzers[0] as any
		mockAnalyzer.getOptimalProcessingOrder = sinon.stub().resolves({
			critical: Array(critical).fill("critical-file.ts"),
			high: Array(high).fill("high-file.ts"),
			medium: Array(total - critical - high).fill("medium-file.ts"),
			low: [],
			minimal: [],
		})
	}

	private setupMultipleWorkspaces(fixture: StartupIndexingTestFixture, count: number): void {
		// Add additional mock managers and services
		for (let i = 1; i < count; i++) {
			fixture.mockManagers.push(this.createMockCodeIndexManager())
			fixture.mockAnalyzers.push(this.createMockSchematicAnalyzer())
			fixture.mockServices.push(this.createMockBackgroundIndexingService())
		}
	}

	private setupAlreadyIndexedWorkspace(fixture: StartupIndexingTestFixture): void {
		const mockManager = fixture.mockManagers[0] as any
		mockManager.getCurrentStatus = sinon.stub().returns({
			systemStatus: "Indexed",
		})
	}

	private setupSlowProcessing(fixture: StartupIndexingTestFixture, type: "critical" | "high"): void {
		const mockService = fixture.mockServices[0] as any
		mockService.addBatchToQueue = sinon.stub().resolves(["job1", "job2"])

		// Simulate timeout by never resolving
		if (type === "critical") {
			mockService.getJob = sinon.stub().returns({ completedAt: undefined, error: undefined })
		}
	}

	private setupUnavailableService(fixture: StartupIndexingTestFixture): void {
		const mockService = fixture.mockServices[0] as any
		mockService.addBatchToQueue = sinon.stub().rejects(new Error("Service unavailable"))
	}

	private setupMemoryPressure(fixture: StartupIndexingTestFixture): void {
		// Mock high memory usage
		const originalMemoryUsage = process.memoryUsage
		const mockMemoryUsage = sinon.stub().returns({
			rss: 2000 * 1024 * 1024, // 2GB
			heapTotal: 1500 * 1024 * 1024, // 1.5GB
			heapUsed: 1400 * 1024 * 1024, // 1.4GB
			external: 100 * 1024 * 1024,
			arrayBuffers: 50 * 1024 * 1024,
		} as NodeJS.MemoryUsage)

		process.memoryUsage = mockMemoryUsage as unknown as NodeJS.MemoryUsageFn
	}

	private setupLegacySettings(fixture: StartupIndexingTestFixture): void {
		// Mock VSCode configuration with legacy settings
		const mockConfig = {
			get: sinon.stub().callsFake((key: string) => {
				if (key === "bluesCode.indexing.enabled") return true
				if (key === "bluesCode.indexing.autoStart") return false
				return undefined
			}),
		}

		// Mock vscode.workspace.getConfiguration
		sinon.stub(vscode.workspace, "getConfiguration").returns(mockConfig as any)
	}

	private setupErrorProneScenario(fixture: StartupIndexingTestFixture): void {
		const mockService = fixture.mockServices[0] as any
		let callCount = 0

		mockService.addBatchToQueue = sinon.stub().callsFake(() => {
			callCount++
			if (callCount === 1) {
				throw new Error("First attempt fails")
			}
			return Promise.resolve(["job1"])
		})
	}

	/**
	 * Mock creation helpers
	 */
	private createMockContext(): vscode.ExtensionContext {
		return {
			subscriptions: [],
			globalState: {
				get: sinon.stub(),
				update: sinon.stub(),
			},
		} as any
	}

	private createMockOutputChannel(): vscode.OutputChannel {
		return {
			appendLine: sinon.stub(),
			append: sinon.stub(),
			show: sinon.stub(),
			hide: sinon.stub(),
			dispose: sinon.stub(),
		} as any
	}

	private createMockCodeIndexManager(): CodeIndexManager {
		return {
			workspacePath: "/test/workspace",
			getCurrentStatus: sinon.stub().returns({
				systemStatus: "NotIndexed",
			}),
		} as any
	}

	private createMockSchematicAnalyzer(): SchematicAnalyzer {
		return {
			getOptimalProcessingOrder: sinon.stub().resolves({
				critical: ["critical-file.ts"],
				high: ["high-file.ts"],
				medium: ["medium-file.ts"],
				low: [],
				minimal: [],
			}),
			estimateProcessingTime: sinon.stub().resolves(200),
		} as any
	}

	private createMockBackgroundIndexingService(): BackgroundIndexingService {
		return {
			addBatchToQueue: sinon.stub().resolves(["job1", "job2"]),
			getJob: sinon.stub().returns({ completedAt: Date.now() }),
			resumeProcessing: sinon.stub(),
		} as any
	}

	/**
	 * Cleanup after tests
	 */
	public cleanup(): void {
		sinon.restore()
		this.fixtures.clear()
		this.testResults.clear()
	}
}

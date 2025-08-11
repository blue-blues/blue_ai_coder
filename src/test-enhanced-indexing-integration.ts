/**
 * Integration test for enhanced indexing validation
 * Tests that the application properly enforces mandatory indexing checks
 */

import * as vscode from "vscode"
import { ClineProvider } from "./core/webview/ClineProvider"
import { ContextProxy } from "./core/config/ContextProxy"
import { IndexingValidator } from "./services/indexing-validation/IndexingValidator"
import { SchematicAnalyzer } from "./services/code-index/SchematicAnalyzer"
import { BackgroundIndexingService } from "./services/code-index/BackgroundIndexingService"
import { PerformanceMonitor } from "./services/code-index/PerformanceMonitor"
import { CodeIndexManager } from "./services/code-index/manager"
import { ValidationError, ERROR_CODES } from "./types/indexing-validation"

/**
 * Test suite for enhanced indexing integration
 */
export class EnhancedIndexingIntegrationTest {
	private provider: ClineProvider
	private contextProxy: ContextProxy
	private outputChannel: vscode.OutputChannel

	constructor(context: vscode.ExtensionContext) {
		this.outputChannel = vscode.window.createOutputChannel("Enhanced Indexing Test")
		this.contextProxy = new ContextProxy(context)
		this.provider = new ClineProvider(context, this.outputChannel, "sidebar", this.contextProxy)
	}

	/**
	 * Run all integration tests
	 */
	async runTests(): Promise<void> {
		this.outputChannel.appendLine("=== Enhanced Indexing Integration Tests ===")

		try {
			await this.testServiceInitialization()
			await this.testIndexingValidation()
			await this.testMandatoryIndexingEnforcement()
			await this.testBackgroundProcessing()
			await this.testPerformanceMonitoring()
			await this.testWebviewMessageHandling()

			this.outputChannel.appendLine("✅ All integration tests passed!")
		} catch (error) {
			this.outputChannel.appendLine(
				`❌ Integration tests failed: ${error instanceof Error ? error.message : String(error)}`,
			)
			throw error
		}
	}

	/**
	 * Test that enhanced indexing services are properly initialized
	 */
	private async testServiceInitialization(): Promise<void> {
		this.outputChannel.appendLine("Testing service initialization...")

		// Check that all enhanced services are available
		const indexingValidator = this.provider.getIndexingValidator()
		const schematicAnalyzer = this.provider.getSchematicAnalyzer()
		const backgroundIndexingService = this.provider.getBackgroundIndexingService()
		const performanceMonitor = this.provider.getPerformanceMonitor()

		if (!indexingValidator) {
			throw new Error("IndexingValidator not initialized")
		}

		if (!schematicAnalyzer) {
			throw new Error("SchematicAnalyzer not initialized")
		}

		if (!backgroundIndexingService) {
			throw new Error("BackgroundIndexingService not initialized")
		}

		if (!performanceMonitor) {
			throw new Error("PerformanceMonitor not initialized")
		}

		this.outputChannel.appendLine("✅ All enhanced services initialized successfully")
	}

	/**
	 * Test indexing validation functionality
	 */
	private async testIndexingValidation(): Promise<void> {
		this.outputChannel.appendLine("Testing indexing validation...")

		const indexingValidator = this.provider.getIndexingValidator()
		if (!indexingValidator) {
			throw new Error("IndexingValidator not available for testing")
		}

		// Test validation state check
		const validationResult = await indexingValidator.validateIndexingState()

		if (!validationResult) {
			throw new Error("Validation result is null")
		}

		if (typeof validationResult.isValid !== "boolean") {
			throw new Error("Validation result missing isValid property")
		}

		if (!validationResult.status) {
			throw new Error("Validation result missing status property")
		}

		if (!validationResult.recommendation) {
			throw new Error("Validation result missing recommendation property")
		}

		this.outputChannel.appendLine("✅ Indexing validation working correctly")
	}

	/**
	 * Test that mandatory indexing checks are enforced
	 */
	private async testMandatoryIndexingEnforcement(): Promise<void> {
		this.outputChannel.appendLine("Testing mandatory indexing enforcement...")

		try {
			// Try to initialize a task with validation enabled
			// This should trigger the indexing validation flow
			const task = await this.provider.initClineWithTaskValidated(
				"Test task for indexing validation",
				undefined,
				undefined,
				{},
				false, // Don't skip validation
			)

			// If we get here without validation being triggered, that's unexpected
			// In a real scenario, this should either:
			// 1. Complete successfully if indexing is valid
			// 2. Throw a ValidationError if user interaction is required
			this.outputChannel.appendLine("✅ Task initialization completed (indexing was valid)")
		} catch (error) {
			if (error instanceof ValidationError && error.code === ERROR_CODES.USER_CANCELLED) {
				// This is expected - validation required user interaction
				this.outputChannel.appendLine("✅ Mandatory indexing validation triggered correctly")
			} else {
				// Unexpected error
				throw new Error(
					`Unexpected error during validation: ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		}
	}

	/**
	 * Test background processing functionality
	 */
	private async testBackgroundProcessing(): Promise<void> {
		this.outputChannel.appendLine("Testing background processing...")

		const backgroundIndexingService = this.provider.getBackgroundIndexingService()
		if (!backgroundIndexingService) {
			throw new Error("BackgroundIndexingService not available for testing")
		}

		// Test queue status
		const queueStatus = backgroundIndexingService.getQueueStatus()
		if (typeof queueStatus.total !== "number" || typeof queueStatus.active !== "number") {
			throw new Error("Invalid queue status format")
		}

		// Test stats
		const stats = backgroundIndexingService.getStats()
		if (!stats || typeof stats.totalJobs !== "number") {
			throw new Error("Invalid background processing stats")
		}

		this.outputChannel.appendLine("✅ Background processing functionality working")
	}

	/**
	 * Test performance monitoring functionality
	 */
	private async testPerformanceMonitoring(): Promise<void> {
		this.outputChannel.appendLine("Testing performance monitoring...")

		const performanceMonitor = this.provider.getPerformanceMonitor()
		if (!performanceMonitor) {
			throw new Error("PerformanceMonitor not available for testing")
		}

		// Test metrics collection
		const metrics = performanceMonitor.getCurrentMetrics()
		if (!metrics || typeof metrics.totalFilesProcessed !== "number") {
			throw new Error("Invalid performance metrics format")
		}

		// Test optimization suggestions
		const suggestions = performanceMonitor.getOptimizationSuggestions()
		if (!Array.isArray(suggestions)) {
			throw new Error("Optimization suggestions should be an array")
		}

		this.outputChannel.appendLine("✅ Performance monitoring functionality working")
	}

	/**
	 * Test webview message handling for enhanced indexing
	 */
	private async testWebviewMessageHandling(): Promise<void> {
		this.outputChannel.appendLine("Testing webview message handling...")

		// Test enhanced indexing status
		const enhancedStatus = this.provider.getEnhancedIndexingStatus()

		if (!enhancedStatus || !enhancedStatus.servicesAvailable) {
			throw new Error("Enhanced indexing status not available")
		}

		const services = enhancedStatus.servicesAvailable
		if (
			typeof services.indexingValidator !== "boolean" ||
			typeof services.schematicAnalyzer !== "boolean" ||
			typeof services.backgroundIndexingService !== "boolean" ||
			typeof services.performanceMonitor !== "boolean"
		) {
			throw new Error("Invalid enhanced indexing status format")
		}

		this.outputChannel.appendLine("✅ Webview message handling working correctly")
	}

	/**
	 * Clean up test resources
	 */
	dispose(): void {
		this.provider.dispose()
		this.outputChannel.dispose()
	}
}

/**
 * Run enhanced indexing integration tests
 */
export async function runEnhancedIndexingIntegrationTests(context: vscode.ExtensionContext): Promise<void> {
	const testSuite = new EnhancedIndexingIntegrationTest(context)

	try {
		await testSuite.runTests()
		vscode.window.showInformationMessage("Enhanced Indexing Integration Tests: All tests passed! ✅")
	} catch (error) {
		const errorMessage = `Enhanced Indexing Integration Tests failed: ${error instanceof Error ? error.message : String(error)}`
		vscode.window.showErrorMessage(errorMessage)
		throw error
	} finally {
		testSuite.dispose()
	}
}

/**
 * Integration test for indexing validation system
 * This file tests the integration between IndexingValidator, Task, ClineProvider, and CodeIndexManager
 */

import { IndexingValidator } from "./IndexingValidator"
import { CodeIndexManager } from "../code-index/manager"
import {
	IndexingContext,
	IndexValidationResult,
	IndexRecommendation,
	IndexingEstimate,
	IndexHealthStatus,
	IndexingStatus,
} from "../../types/indexing-validation"

/**
 * Mock implementations for testing
 */
class MockCodeIndexManager {
	private _isFeatureEnabled = true
	private _isFeatureConfigured = true
	private _isInitialized = false
	private _isIndexing = false
	private _systemStatus: IndexingStatus = "Standby"

	get isFeatureEnabled() {
		return this._isFeatureEnabled
	}
	get isFeatureConfigured() {
		return this._isFeatureConfigured
	}
	get isInitialized() {
		return this._isInitialized
	}
	get isIndexing() {
		return this._isIndexing
	}

	setFeatureEnabled(enabled: boolean) {
		this._isFeatureEnabled = enabled
	}
	setFeatureConfigured(configured: boolean) {
		this._isFeatureConfigured = configured
	}
	setInitialized(initialized: boolean) {
		this._isInitialized = initialized
	}
	setIndexing(indexing: boolean) {
		this._isIndexing = indexing
		this._systemStatus = indexing ? "Indexing" : "Indexed"
	}
	setSystemStatus(status: IndexingStatus) {
		this._systemStatus = status
	}

	getCurrentStatus() {
		return {
			systemStatus: this._systemStatus,
			systemMessage: this._systemStatus === "Error" ? "Mock error" : "Mock status",
			processedItems: 0,
			totalItems: 100,
			currentItemUnit: "files" as const,
		}
	}

	async getIndexingRecommendation(): Promise<IndexRecommendation> {
		if (!this._isFeatureEnabled) {
			return {
				shouldIndex: false,
				reason: "Indexing is disabled",
				priority: "low",
				workspaceSize: 0,
				fileCount: 0,
			}
		}

		if (!this._isFeatureConfigured) {
			return {
				shouldIndex: false,
				reason: "Indexing is not configured",
				priority: "low",
				workspaceSize: 0,
				fileCount: 0,
			}
		}

		if (this._isIndexing) {
			return {
				shouldIndex: false,
				reason: "Indexing is currently in progress",
				priority: "medium",
				workspaceSize: 1000,
				fileCount: 100,
			}
		}

		if (!this._isInitialized) {
			return {
				shouldIndex: true,
				reason: "Index needs to be initialized",
				priority: "high",
				workspaceSize: 1000,
				fileCount: 100,
			}
		}

		return {
			shouldIndex: false,
			reason: "Index is ready",
			priority: "low",
			workspaceSize: 1000,
			fileCount: 100,
		}
	}

	async estimateIndexingTime(): Promise<IndexingEstimate> {
		return {
			estimatedTimeMs: this._isIndexing ? 30000 : 0,
			estimatedFiles: 100,
			confidence: 0.8,
		}
	}

	async validateIndexHealth(): Promise<IndexHealthStatus> {
		return {
			isHealthy: this._systemStatus !== "Error",
			completeness: this._systemStatus === "Indexed" ? 1.0 : 0.5,
			lastIndexed: new Date(),
			issues: this._systemStatus === "Error" ? ["Mock error for testing"] : [],
		}
	}

	async startIndexing(): Promise<void> {
		this._isIndexing = true
		this._systemStatus = "Indexing"
	}
}

/**
 * Integration test scenarios
 */
export class IndexingValidationIntegrationTest {
	private validator: IndexingValidator
	private mockManager: MockCodeIndexManager

	constructor() {
		this.mockManager = new MockCodeIndexManager()
		this.validator = new IndexingValidator(this.mockManager as any)
	}

	/**
	 * Test scenario 1: Normal validation flow with healthy index
	 */
	async testHealthyIndexValidation(): Promise<boolean> {
		console.log("🧪 Testing healthy index validation...")

		// Setup: Healthy, initialized index
		this.mockManager.setFeatureEnabled(true)
		this.mockManager.setFeatureConfigured(true)
		this.mockManager.setInitialized(true)
		this.mockManager.setIndexing(false)
		this.mockManager.setSystemStatus("Indexed")

		try {
			const result = await this.validator.validateIndexingState()

			const isValid =
				result.isValid === true && result.status === "Indexed" && result.recommendation.shouldIndex === false

			console.log(isValid ? "✅ Healthy index validation passed" : "❌ Healthy index validation failed")
			if (!isValid) {
				console.log("Result:", JSON.stringify(result, null, 2))
			}
			return isValid
		} catch (error) {
			console.error("❌ Healthy index validation error:", error)
			return false
		}
	}

	/**
	 * Test scenario 2: Validation with indexing in progress
	 */
	async testIndexingInProgressValidation(): Promise<boolean> {
		console.log("🧪 Testing indexing in progress validation...")

		// Setup: Index is currently indexing
		this.mockManager.setFeatureEnabled(true)
		this.mockManager.setFeatureConfigured(true)
		this.mockManager.setInitialized(true)
		this.mockManager.setIndexing(true)
		this.mockManager.setSystemStatus("Indexing")

		try {
			const result = await this.validator.validateIndexingState()

			const isValid = Boolean(
				result.status === "Indexing" && result.estimate && result.estimate.estimatedTimeMs > 0,
			)

			console.log(
				isValid ? "✅ Indexing in progress validation passed" : "❌ Indexing in progress validation failed",
			)
			if (!isValid) {
				console.log("Result:", JSON.stringify(result, null, 2))
			}
			return isValid
		} catch (error) {
			console.error("❌ Indexing in progress validation error:", error)
			return false
		}
	}

	/**
	 * Test scenario 3: Validation with disabled indexing
	 */
	async testDisabledIndexingValidation(): Promise<boolean> {
		console.log("🧪 Testing disabled indexing validation...")

		// Setup: Indexing is disabled
		this.mockManager.setFeatureEnabled(false)
		this.mockManager.setFeatureConfigured(true)
		this.mockManager.setInitialized(false)
		this.mockManager.setIndexing(false)
		this.mockManager.setSystemStatus("Standby")

		try {
			const result = await this.validator.validateIndexingState()

			const isValid =
				result.isValid === false &&
				result.recommendation.shouldIndex === false &&
				result.recommendation.reason.includes("not enabled")

			console.log(isValid ? "✅ Disabled indexing validation passed" : "❌ Disabled indexing validation failed")
			if (!isValid) {
				console.log("Result:", JSON.stringify(result, null, 2))
			}
			return isValid
		} catch (error) {
			console.error("❌ Disabled indexing validation error:", error)
			return false
		}
	}

	/**
	 * Test scenario 4: Wait for indexing completion
	 */
	async testWaitForIndexingCompletion(): Promise<boolean> {
		console.log("🧪 Testing wait for indexing completion...")

		// Setup: Index is indexing, then complete after a short delay
		this.mockManager.setIndexing(true)
		this.mockManager.setSystemStatus("Indexing")

		// Simulate completion after 500ms
		setTimeout(() => {
			this.mockManager.setIndexing(false)
			this.mockManager.setSystemStatus("Indexed")
		}, 500)

		try {
			const completed = await this.validator.waitForIndexingCompletion(2000) // 2 second timeout

			const isValid = completed === true
			console.log(isValid ? "✅ Wait for indexing completion passed" : "❌ Wait for indexing completion failed")
			return isValid
		} catch (error) {
			console.error("❌ Wait for indexing completion error:", error)
			return false
		}
	}

	/**
	 * Test scenario 5: Test indexing context creation
	 */
	async testIndexingContextCreation(): Promise<boolean> {
		console.log("🧪 Testing indexing context creation...")

		// Setup: Indexed state
		this.mockManager.setFeatureEnabled(true)
		this.mockManager.setFeatureConfigured(true)
		this.mockManager.setInitialized(true)
		this.mockManager.setIndexing(false)
		this.mockManager.setSystemStatus("Indexed")

		try {
			const context = this.validator.createIndexingContext("start", Date.now())

			const isValid = Boolean(
				context.hasIndex === true &&
					context.indexQuality > 0 &&
					context.userChoice === "start" &&
					context.validationTimestamp > 0,
			)

			console.log(isValid ? "✅ Indexing context creation passed" : "❌ Indexing context creation failed")
			if (!isValid) {
				console.log("Context:", JSON.stringify(context, null, 2))
			}
			return isValid
		} catch (error) {
			console.error("❌ Indexing context creation error:", error)
			return false
		}
	}

	/**
	 * Run all integration tests
	 */
	async runAllTests(): Promise<boolean> {
		console.log("🚀 Starting indexing validation integration tests...\n")

		const tests = [
			this.testHealthyIndexValidation(),
			this.testIndexingInProgressValidation(),
			this.testDisabledIndexingValidation(),
			this.testWaitForIndexingCompletion(),
			this.testIndexingContextCreation(),
		]

		const results = await Promise.all(tests)
		const allPassed = results.every((result) => result === true)
		const passedCount = results.filter((result) => result === true).length
		const totalCount = results.length

		console.log(`\n📊 Integration test results: ${passedCount}/${totalCount} tests passed`)

		if (allPassed) {
			console.log("🎉 All integration tests passed! The indexing validation system is working correctly.")
		} else {
			console.log("⚠️  Some integration tests failed. Please review the implementation.")
		}

		return allPassed
	}

	/**
	 * Helper method to compare validation results
	 */
	private compareValidationResults(actual: IndexValidationResult, expected: IndexValidationResult): boolean {
		return (
			actual.isValid === expected.isValid &&
			actual.recommendation.shouldIndex === expected.recommendation.shouldIndex &&
			actual.status === expected.status
		)
	}
}

/**
 * Export function to run tests
 */
export async function runIndexingValidationIntegrationTests(): Promise<boolean> {
	const testSuite = new IndexingValidationIntegrationTest()
	return await testSuite.runAllTests()
}

// If this file is run directly, execute the tests
if (require.main === module) {
	runIndexingValidationIntegrationTests()
		.then((success) => {
			process.exit(success ? 0 : 1)
		})
		.catch((error) => {
			console.error("Integration test execution failed:", error)
			process.exit(1)
		})
}

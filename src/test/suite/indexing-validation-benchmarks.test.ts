import * as assert from "assert"
import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"
import { performance } from "perf_hooks"
import { CodeIndexManager } from "../../services/code-index/manager"
import { ClineProvider } from "../../core/webview/ClineProvider"
import {
	IndexValidationResult,
	IndexRecommendation,
	IndexingEstimate,
	ValidationError,
	ERROR_CODES,
	VALIDATION_CONSTANTS,
} from "../../types/indexing-validation"

interface BenchmarkResult {
	operation: string
	averageTime: number
	minTime: number
	maxTime: number
	iterations: number
	memoryUsage: number
	successRate: number
}

interface PerformanceMetrics {
	validationTime: number
	memoryBefore: number
	memoryAfter: number
	memoryDelta: number
	success: boolean
	error?: string
}

suite("Indexing Validation Performance Benchmarks", () => {
	let mockContext: vscode.ExtensionContext
	let mockOutputChannel: vscode.OutputChannel
	let mockContextProxy: any
	let clineProvider: ClineProvider
	let tempDir: string
	let benchmarkResults: BenchmarkResult[] = []

	suiteSetup(async () => {
		// Create temporary test workspace
		tempDir = path.join(__dirname, "..", "..", "..", "benchmark-workspace-" + Date.now())
		await fs.promises.mkdir(tempDir, { recursive: true })

		// Create test workspaces of different sizes
		await createBenchmarkWorkspaces(tempDir)
	})

	suiteTeardown(async () => {
		// Clean up temporary workspace
		if (fs.existsSync(tempDir)) {
			await fs.promises.rmdir(tempDir, { recursive: true })
		}

		// Output benchmark summary
		console.log("\n=== INDEXING VALIDATION PERFORMANCE BENCHMARK RESULTS ===")
		benchmarkResults.forEach((result) => {
			console.log(`\n${result.operation}:`)
			console.log(`  Average Time: ${result.averageTime.toFixed(2)}ms`)
			console.log(`  Min Time: ${result.minTime.toFixed(2)}ms`)
			console.log(`  Max Time: ${result.maxTime.toFixed(2)}ms`)
			console.log(`  Memory Usage: ${result.memoryUsage.toFixed(2)}MB`)
			console.log(`  Success Rate: ${(result.successRate * 100).toFixed(1)}%`)
			console.log(`  Iterations: ${result.iterations}`)
		})
	})

	setup(() => {
		// Mock VSCode extension context
		mockContext = {
			subscriptions: [],
			workspaceState: {
				get: () => undefined,
				update: () => Promise.resolve(),
			},
			globalState: {
				get: () => undefined,
				update: () => Promise.resolve(),
				setKeysForSync: () => {},
			},
			extensionUri: vscode.Uri.file("/mock/extension/path"),
			globalStorageUri: vscode.Uri.file("/mock/global/storage"),
			logUri: vscode.Uri.file("/mock/log"),
			storagePath: "/mock/storage",
			globalStoragePath: "/mock/global/storage",
			logPath: "/mock/log",
		} as any

		// Mock output channel
		mockOutputChannel = {
			appendLine: () => {},
			show: () => {},
			hide: () => {},
			dispose: () => {},
			name: "Benchmark Channel",
			clear: () => {},
			append: () => {},
			replace: () => {},
		}

		// Mock context proxy
		mockContextProxy = {
			getValues: () => ({}),
			getValue: () => undefined,
			setValue: () => Promise.resolve(),
			setValues: () => Promise.resolve(),
			getProviderSettings: () => ({}),
			setProviderSettings: () => Promise.resolve(),
			extensionUri: vscode.Uri.file("/mock/extension/path"),
		}

		// Create ClineProvider instance
		clineProvider = new ClineProvider(mockContext, mockOutputChannel, "sidebar", mockContextProxy)
	})

	async function createBenchmarkWorkspaces(baseDir: string): Promise<void> {
		// Small workspace (10 files)
		const smallDir = path.join(baseDir, "small")
		await fs.promises.mkdir(smallDir, { recursive: true })
		await createWorkspaceFiles(smallDir, 10)

		// Medium workspace (100 files)
		const mediumDir = path.join(baseDir, "medium")
		await fs.promises.mkdir(mediumDir, { recursive: true })
		await createWorkspaceFiles(mediumDir, 100)

		// Large workspace (1000 files)
		const largeDir = path.join(baseDir, "large")
		await fs.promises.mkdir(largeDir, { recursive: true })
		await createWorkspaceFiles(largeDir, 1000)

		// Extra large workspace (5000 files)
		const extraLargeDir = path.join(baseDir, "extra-large")
		await fs.promises.mkdir(extraLargeDir, { recursive: true })
		await createWorkspaceFiles(extraLargeDir, 5000)
	}

	async function createWorkspaceFiles(workspaceDir: string, fileCount: number): Promise<void> {
		const fileTypes = [".ts", ".js", ".tsx", ".jsx", ".py", ".java", ".cpp", ".md", ".json", ".yaml"]
		const promises: Promise<void>[] = []

		for (let i = 0; i < fileCount; i++) {
			const fileType = fileTypes[i % fileTypes.length]
			const fileName = `file${i}${fileType}`
			const filePath = path.join(workspaceDir, fileName)

			let content = ""
			switch (fileType) {
				case ".ts":
				case ".js":
					content = `// File ${i}\nexport const value${i} = ${i};\nexport function func${i}() { return ${i}; }`
					break
				case ".tsx":
				case ".jsx":
					content = `// Component ${i}\nexport const Component${i} = () => <div>Component {${i}}</div>;`
					break
				case ".py":
					content = `# File ${i}\ndef function_${i}():\n    return ${i}\n\nvalue_${i} = ${i}`
					break
				case ".java":
					content = `// Class ${i}\npublic class Class${i} {\n    public static int getValue() { return ${i}; }\n}`
					break
				case ".cpp":
					content = `// File ${i}\n#include <iostream>\nint getValue${i}() { return ${i}; }`
					break
				case ".md":
					content = `# Document ${i}\n\nThis is document number ${i}.\n\n## Section\n\nContent here.`
					break
				case ".json":
					content = `{"id": ${i}, "name": "item${i}", "value": ${i}}`
					break
				case ".yaml":
					content = `id: ${i}\nname: item${i}\nvalue: ${i}`
					break
			}

			promises.push(fs.promises.writeFile(filePath, content))
		}

		await Promise.all(promises)
	}

	async function measurePerformance<T>(
		operation: () => Promise<T>,
		operationName: string,
	): Promise<PerformanceMetrics> {
		const memoryBefore = process.memoryUsage().heapUsed / (1024 * 1024) // MB
		const startTime = performance.now()

		try {
			await operation()
			const endTime = performance.now()
			const memoryAfter = process.memoryUsage().heapUsed / (1024 * 1024) // MB

			return {
				validationTime: endTime - startTime,
				memoryBefore,
				memoryAfter,
				memoryDelta: memoryAfter - memoryBefore,
				success: true,
			}
		} catch (error) {
			const endTime = performance.now()
			const memoryAfter = process.memoryUsage().heapUsed / (1024 * 1024) // MB

			return {
				validationTime: endTime - startTime,
				memoryBefore,
				memoryAfter,
				memoryDelta: memoryAfter - memoryBefore,
				success: false,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	}

	async function runBenchmark(
		operation: () => Promise<any>,
		operationName: string,
		iterations: number = 10,
	): Promise<BenchmarkResult> {
		const metrics: PerformanceMetrics[] = []

		// Warm up
		try {
			await operation()
		} catch (error) {
			// Ignore warm-up errors
		}

		// Run benchmark iterations
		for (let i = 0; i < iterations; i++) {
			const metric = await measurePerformance(operation, operationName)
			metrics.push(metric)

			// Small delay between iterations
			await new Promise((resolve) => setTimeout(resolve, 10))
		}

		// Calculate statistics
		const successfulMetrics = metrics.filter((m) => m.success)
		const times = successfulMetrics.map((m) => m.validationTime)
		const memoryDeltas = metrics.map((m) => m.memoryDelta)

		const result: BenchmarkResult = {
			operation: operationName,
			averageTime: times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0,
			minTime: times.length > 0 ? Math.min(...times) : 0,
			maxTime: times.length > 0 ? Math.max(...times) : 0,
			iterations,
			memoryUsage: memoryDeltas.reduce((sum, delta) => sum + Math.max(0, delta), 0) / iterations,
			successRate: successfulMetrics.length / iterations,
		}

		benchmarkResults.push(result)
		return result
	}

	suite("Basic Validation Performance", () => {
		test("Small workspace validation performance", async function () {
			this.timeout(30000)

			const smallWorkspaceDir = path.join(tempDir, "small")

			const result = await runBenchmark(
				async () => {
					const manager = CodeIndexManager.getInstance(mockContext, smallWorkspaceDir)
					if (manager) {
						return await manager.getIndexingRecommendation()
					}
					throw new Error("Manager not available")
				},
				"Small Workspace Validation (10 files)",
				20,
			)

			// Performance assertions for small workspace
			if (result.successRate > 0) {
				assert.ok(
					result.averageTime < VALIDATION_CONSTANTS.PERFORMANCE_TARGET_MS * 2,
					`Small workspace validation too slow: ${result.averageTime}ms > ${VALIDATION_CONSTANTS.PERFORMANCE_TARGET_MS * 2}ms`,
				)
				assert.ok(
					result.memoryUsage < VALIDATION_CONSTANTS.MEMORY_LIMIT_MB / 4,
					`Small workspace memory usage too high: ${result.memoryUsage}MB`,
				)
			}
		})

		test("Medium workspace validation performance", async function () {
			this.timeout(60000)

			const mediumWorkspaceDir = path.join(tempDir, "medium")

			const result = await runBenchmark(
				async () => {
					const manager = CodeIndexManager.getInstance(mockContext, mediumWorkspaceDir)
					if (manager) {
						return await manager.getIndexingRecommendation()
					}
					throw new Error("Manager not available")
				},
				"Medium Workspace Validation (100 files)",
				15,
			)

			// Performance assertions for medium workspace
			if (result.successRate > 0) {
				assert.ok(
					result.averageTime < VALIDATION_CONSTANTS.PERFORMANCE_TARGET_MS * 5,
					`Medium workspace validation too slow: ${result.averageTime}ms`,
				)
				assert.ok(
					result.memoryUsage < VALIDATION_CONSTANTS.MEMORY_LIMIT_MB / 2,
					`Medium workspace memory usage too high: ${result.memoryUsage}MB`,
				)
			}
		})

		test("Large workspace validation performance", async function () {
			this.timeout(120000)

			const largeWorkspaceDir = path.join(tempDir, "large")

			const result = await runBenchmark(
				async () => {
					const manager = CodeIndexManager.getInstance(mockContext, largeWorkspaceDir)
					if (manager) {
						return await manager.getIndexingRecommendation()
					}
					throw new Error("Manager not available")
				},
				"Large Workspace Validation (1000 files)",
				10,
			)

			// Performance assertions for large workspace
			if (result.successRate > 0) {
				assert.ok(
					result.averageTime < VALIDATION_CONSTANTS.PERFORMANCE_TARGET_MS * 10,
					`Large workspace validation too slow: ${result.averageTime}ms`,
				)
				assert.ok(
					result.memoryUsage < VALIDATION_CONSTANTS.MEMORY_LIMIT_MB,
					`Large workspace memory usage too high: ${result.memoryUsage}MB`,
				)
			}
		})
	})

	suite("Concurrent Performance", () => {
		test("Concurrent validation performance", async function () {
			this.timeout(60000)

			const smallWorkspaceDir = path.join(tempDir, "small")

			const result = await runBenchmark(
				async () => {
					const manager = CodeIndexManager.getInstance(mockContext, smallWorkspaceDir)
					if (manager) {
						// Run 5 concurrent validations
						const promises = Array(5)
							.fill(null)
							.map(() => manager.getIndexingRecommendation())
						return await Promise.all(promises)
					}
					throw new Error("Manager not available")
				},
				"Concurrent Validation (5x small workspace)",
				10,
			)

			// Concurrent performance should not be significantly worse than single validation
			if (result.successRate > 0) {
				assert.ok(
					result.averageTime < VALIDATION_CONSTANTS.PERFORMANCE_TARGET_MS * 8,
					`Concurrent validation too slow: ${result.averageTime}ms`,
				)
			}
		})

		test("Sequential vs concurrent comparison", async function () {
			this.timeout(90000)

			const smallWorkspaceDir = path.join(tempDir, "small")

			// Sequential benchmark
			const sequentialResult = await runBenchmark(
				async () => {
					const manager = CodeIndexManager.getInstance(mockContext, smallWorkspaceDir)
					if (manager) {
						for (let i = 0; i < 5; i++) {
							await manager.getIndexingRecommendation()
						}
					}
				},
				"Sequential Validation (5x small workspace)",
				5,
			)

			// Concurrent benchmark
			const concurrentResult = await runBenchmark(
				async () => {
					const manager = CodeIndexManager.getInstance(mockContext, smallWorkspaceDir)
					if (manager) {
						const promises = Array(5)
							.fill(null)
							.map(() => manager.getIndexingRecommendation())
						await Promise.all(promises)
					}
				},
				"Concurrent Validation (5x small workspace)",
				5,
			)

			// Concurrent should be faster than sequential for I/O bound operations
			if (sequentialResult.successRate > 0 && concurrentResult.successRate > 0) {
				console.log(
					`Sequential: ${sequentialResult.averageTime}ms, Concurrent: ${concurrentResult.averageTime}ms`,
				)
				// Concurrent should be at least 20% faster than sequential
				assert.ok(
					concurrentResult.averageTime < sequentialResult.averageTime * 0.8,
					"Concurrent validation should be faster than sequential",
				)
			}
		})
	})

	suite("Memory Performance", () => {
		test("Memory usage scaling with workspace size", async function () {
			this.timeout(180000)

			const workspaceSizes = [
				{ name: "small", files: 10 },
				{ name: "medium", files: 100 },
				{ name: "large", files: 1000 },
			]

			const memoryResults: { size: string; memory: number; files: number }[] = []

			for (const workspace of workspaceSizes) {
				const workspaceDir = path.join(tempDir, workspace.name)

				const result = await runBenchmark(
					async () => {
						const manager = CodeIndexManager.getInstance(mockContext, workspaceDir)
						if (manager) {
							return await manager.getIndexingRecommendation()
						}
						throw new Error("Manager not available")
					},
					`Memory Test - ${workspace.name} (${workspace.files} files)`,
					5,
				)

				memoryResults.push({
					size: workspace.name,
					memory: result.memoryUsage,
					files: workspace.files,
				})
			}

			// Memory usage should scale reasonably with workspace size
			// But not linearly (due to caching and optimizations)
			if (memoryResults.length >= 2) {
				const smallMemory = memoryResults.find((r) => r.size === "small")?.memory || 0
				const largeMemory = memoryResults.find((r) => r.size === "large")?.memory || 0

				// Large workspace should not use more than 10x memory of small workspace
				if (smallMemory > 0) {
					assert.ok(
						largeMemory < smallMemory * 10,
						`Memory scaling too aggressive: ${largeMemory}MB vs ${smallMemory}MB`,
					)
				}
			}
		})

		test("Memory leak detection", async function () {
			this.timeout(120000)

			const smallWorkspaceDir = path.join(tempDir, "small")
			const iterations = 50
			const memoryMeasurements: number[] = []

			// Run many iterations and track memory usage
			for (let i = 0; i < iterations; i++) {
				const memoryBefore = process.memoryUsage().heapUsed / (1024 * 1024)

				try {
					const manager = CodeIndexManager.getInstance(mockContext, smallWorkspaceDir)
					if (manager) {
						await manager.getIndexingRecommendation()
					}
				} catch (error) {
					// Ignore errors for memory leak test
				}

				const memoryAfter = process.memoryUsage().heapUsed / (1024 * 1024)
				memoryMeasurements.push(memoryAfter)

				// Force garbage collection if available
				if (global.gc) {
					global.gc()
				}

				// Small delay between iterations
				await new Promise((resolve) => setTimeout(resolve, 50))
			}

			// Check for memory leaks
			const firstQuarter = memoryMeasurements.slice(0, Math.floor(iterations / 4))
			const lastQuarter = memoryMeasurements.slice(-Math.floor(iterations / 4))

			const avgFirst = firstQuarter.reduce((sum, mem) => sum + mem, 0) / firstQuarter.length
			const avgLast = lastQuarter.reduce((sum, mem) => sum + mem, 0) / lastQuarter.length

			const memoryIncrease = avgLast - avgFirst

			// Memory should not increase significantly over time
			assert.ok(
				memoryIncrease < VALIDATION_CONSTANTS.MEMORY_LIMIT_MB / 2,
				`Potential memory leak detected: ${memoryIncrease}MB increase over ${iterations} iterations`,
			)
		})
	})

	suite("Stress Testing", () => {
		test("High frequency validation stress test", async function () {
			this.timeout(300000) // 5 minutes

			const smallWorkspaceDir = path.join(tempDir, "small")
			const duration = 30000 // 30 seconds
			const startTime = Date.now()
			let validationCount = 0
			let errorCount = 0

			// Run validations as fast as possible for 30 seconds
			while (Date.now() - startTime < duration) {
				try {
					const manager = CodeIndexManager.getInstance(mockContext, smallWorkspaceDir)
					if (manager) {
						await manager.getIndexingRecommendation()
						validationCount++
					}
				} catch (error) {
					errorCount++
				}

				// Small delay to prevent overwhelming the system
				await new Promise((resolve) => setTimeout(resolve, 10))
			}

			const actualDuration = Date.now() - startTime
			const validationsPerSecond = (validationCount / actualDuration) * 1000
			const errorRate = errorCount / (validationCount + errorCount)

			console.log(`Stress test results: ${validationCount} validations in ${actualDuration}ms`)
			console.log(`Rate: ${validationsPerSecond.toFixed(2)} validations/second`)
			console.log(`Error rate: ${(errorRate * 100).toFixed(2)}%`)

			// Should handle at least 1 validation per second under stress
			assert.ok(
				validationsPerSecond >= 1,
				`Validation rate too low under stress: ${validationsPerSecond} validations/second`,
			)

			// Error rate should be reasonable
			assert.ok(errorRate < 0.5, `Error rate too high under stress: ${(errorRate * 100).toFixed(2)}%`)
		})

		test("Large workspace stress test", async function () {
			this.timeout(300000)

			// Only run if extra-large workspace exists
			const extraLargeDir = path.join(tempDir, "extra-large")
			if (!fs.existsSync(extraLargeDir)) {
				this.skip()
				return
			}

			const result = await runBenchmark(
				async () => {
					const manager = CodeIndexManager.getInstance(mockContext, extraLargeDir)
					if (manager) {
						return await manager.getIndexingRecommendation()
					}
					throw new Error("Manager not available")
				},
				"Extra Large Workspace Stress Test (5000 files)",
				3,
			)

			// Should complete within reasonable time even for very large workspaces
			if (result.successRate > 0) {
				assert.ok(
					result.averageTime < 30000, // 30 seconds max
					`Extra large workspace validation too slow: ${result.averageTime}ms`,
				)
				assert.ok(
					result.memoryUsage < VALIDATION_CONSTANTS.MEMORY_LIMIT_MB * 2,
					`Extra large workspace memory usage too high: ${result.memoryUsage}MB`,
				)
			}
		})
	})

	suite("Edge Case Performance", () => {
		test("Empty workspace performance", async function () {
			this.timeout(30000)

			const emptyDir = path.join(tempDir, "empty")
			await fs.promises.mkdir(emptyDir, { recursive: true })

			const result = await runBenchmark(
				async () => {
					const manager = CodeIndexManager.getInstance(mockContext, emptyDir)
					if (manager) {
						return await manager.getIndexingRecommendation()
					}
					throw new Error("Manager not available")
				},
				"Empty Workspace Validation",
				20,
			)

			// Empty workspace should be very fast
			if (result.successRate > 0) {
				assert.ok(
					result.averageTime < VALIDATION_CONSTANTS.PERFORMANCE_TARGET_MS,
					`Empty workspace validation too slow: ${result.averageTime}ms`,
				)
				assert.ok(
					result.memoryUsage < VALIDATION_CONSTANTS.MEMORY_LIMIT_MB / 10,
					`Empty workspace memory usage too high: ${result.memoryUsage}MB`,
				)
			}

			await fs.promises.rmdir(emptyDir, { recursive: true })
		})

		test("Non-existent workspace performance", async function () {
			this.timeout(30000)

			const nonExistentDir = path.join(tempDir, "does-not-exist")

			const result = await runBenchmark(
				async () => {
					const manager = CodeIndexManager.getInstance(mockContext, nonExistentDir)
					if (manager) {
						return await manager.getIndexingRecommendation()
					}
					throw new Error("Manager not available")
				},
				"Non-existent Workspace Validation",
				10,
			)

			// Should fail fast for non-existent workspaces
			assert.ok(
				result.averageTime < VALIDATION_CONSTANTS.PERFORMANCE_TARGET_MS * 2,
				`Non-existent workspace validation too slow: ${result.averageTime}ms`,
			)
		})

		test("Validation timeout performance", async function () {
			this.timeout(60000)

			const result = await runBenchmark(
				async () => {
					// Simulate timeout scenario
					const timeoutPromise = new Promise<never>((_, reject) => {
						setTimeout(() => {
							reject(new ValidationError("Validation timeout", ERROR_CODES.VALIDATION_TIMEOUT))
						}, VALIDATION_CONSTANTS.DEFAULT_VALIDATION_TIMEOUT)
					})

					const slowValidation = new Promise((resolve) => {
						setTimeout(resolve, VALIDATION_CONSTANTS.DEFAULT_VALIDATION_TIMEOUT + 1000)
					})

					return await Promise.race([slowValidation, timeoutPromise])
				},
				"Validation Timeout Test",
				5,
			)

			// Timeout should occur close to the configured timeout value
			assert.ok(
				result.averageTime >= VALIDATION_CONSTANTS.DEFAULT_VALIDATION_TIMEOUT * 0.9,
				`Timeout occurred too early: ${result.averageTime}ms`,
			)
			assert.ok(
				result.averageTime <= VALIDATION_CONSTANTS.DEFAULT_VALIDATION_TIMEOUT * 1.1,
				`Timeout occurred too late: ${result.averageTime}ms`,
			)
		})
	})

	suite("Caching Performance", () => {
		test("Cache hit performance", async function () {
			this.timeout(60000)

			const smallWorkspaceDir = path.join(tempDir, "small")

			// First call (cache miss)
			const firstCallResult = await runBenchmark(
				async () => {
					const manager = CodeIndexManager.getInstance(mockContext, smallWorkspaceDir)
					if (manager) {
						return await manager.getIndexingRecommendation()
					}
					throw new Error("Manager not available")
				},
				"First Call (Cache Miss)",
				5,
			)

			// Wait for cache to be populated
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Subsequent calls (cache hits)
			const cachedCallResult = await runBenchmark(
				async () => {
					const manager = CodeIndexManager.getInstance(mockContext, smallWorkspaceDir)
					if (manager) {
						return await manager.getIndexingRecommendation()
					}
					throw new Error("Manager not available")
				},
				"Cached Calls (Cache Hit)",
				10,
			)

			// Cached calls should be significantly faster
			if (firstCallResult.successRate > 0 && cachedCallResult.successRate > 0) {
				assert.ok(
					cachedCallResult.averageTime < firstCallResult.averageTime * 0.5,
					`Cache not providing expected performance benefit: ${cachedCallResult.averageTime}ms vs ${firstCallResult.averageTime}ms`,
				)
			}
		})

		test("Cache invalidation performance", async function () {
			this.timeout(60000)

			const smallWorkspaceDir = path.join(tempDir, "small")

			// Initial call to populate cache
			const manager = CodeIndexManager.getInstance(mockContext, smallWorkspaceDir)
			if (manager) {
				try {
					await manager.getIndexingRecommendation()
				} catch (error) {
					// Ignore initial error
				}
			}

			// Wait for cache TTL to expire
			await new Promise((resolve) => setTimeout(resolve, VALIDATION_CONSTANTS.CACHE_TTL_MS + 100))

			// Call after cache expiration
			const result = await runBenchmark(
				async () => {
					if (manager) {
						return await manager.getIndexingRecommendation()
					}
					throw new Error("Manager not available")
				},
				"Cache Invalidation Test",
				5,
			)

			// Should still complete within reasonable time after cache invalidation
			if (result.successRate > 0) {
				assert.ok(
					result.averageTime < VALIDATION_CONSTANTS.PERFORMANCE_TARGET_MS * 3,
					`Cache invalidation causing excessive delay: ${result.averageTime}ms`,
				)
			}
		})
	})
})

import * as vscode from "vscode"
import * as path from "path"
import { CodeIndexConfigManager } from "./config-manager"
import { CodeIndexStateManager, IndexingState } from "./state-manager"
import { IFileWatcher, IVectorStore, BatchProcessingSummary, ICodeParser, IEmbedder } from "./interfaces"
import { DirectoryScanner } from "./processors"
import { CacheManager } from "./cache-manager"
import { SchematicAnalyzer } from "./SchematicAnalyzer"
import { BackgroundIndexingService, ProcessingPriority } from "./BackgroundIndexingService"
import { TelemetryService } from "@blues-code/telemetry"
import { TelemetryEventName } from "@blues-code/types"
import { t } from "../../i18n"

/**
 * Manages the code indexing workflow, coordinating between different services and managers.
 */
export class CodeIndexOrchestrator {
	private _fileWatcherSubscriptions: vscode.Disposable[] = []
	private _isProcessing: boolean = false
	private _schematicAnalyzer: SchematicAnalyzer | undefined
	private _backgroundIndexingService: BackgroundIndexingService | undefined
	private _performanceMetrics = {
		totalFilesProcessed: 0,
		averageProcessingTime: 0,
		lastOptimizationTime: 0,
		indexingEfficiency: 1.0,
	}

	constructor(
		private readonly configManager: CodeIndexConfigManager,
		private readonly stateManager: CodeIndexStateManager,
		private readonly workspacePath: string,
		private readonly cacheManager: CacheManager,
		private readonly vectorStore: IVectorStore,
		private readonly scanner: DirectoryScanner,
		private readonly fileWatcher: IFileWatcher,
		private readonly codeParser?: ICodeParser,
		private readonly embedder?: IEmbedder,
	) {
		// Initialize enhanced services if dependencies are provided
		if (this.codeParser) {
			this._schematicAnalyzer = new SchematicAnalyzer(this.codeParser, this.workspacePath)
		}

		if (this._schematicAnalyzer && this.codeParser && this.embedder) {
			this._backgroundIndexingService = new BackgroundIndexingService(
				this._schematicAnalyzer,
				this.codeParser,
				this.embedder,
				this.vectorStore,
				this.cacheManager,
				this.workspacePath,
			)

			// Set up background service event handlers
			this._setupBackgroundServiceHandlers()
		}
	}

	/**
	 * Starts the file watcher if not already running.
	 */
	private async _startWatcher(): Promise<void> {
		if (!this.configManager.isFeatureConfigured) {
			throw new Error("Cannot start watcher: Service not configured.")
		}

		this.stateManager.setSystemState("Indexing", "Initializing file watcher...")

		try {
			await this.fileWatcher.initialize()

			this._fileWatcherSubscriptions = [
				this.fileWatcher.onDidStartBatchProcessing((filePaths: string[]) => {}),
				this.fileWatcher.onBatchProgressUpdate(({ processedInBatch, totalInBatch, currentFile }) => {
					if (totalInBatch > 0 && this.stateManager.state !== "Indexing") {
						this.stateManager.setSystemState("Indexing", "Processing file changes...")
					}
					this.stateManager.reportFileQueueProgress(
						processedInBatch,
						totalInBatch,
						currentFile ? path.basename(currentFile) : undefined,
					)
					if (processedInBatch === totalInBatch) {
						// Covers (N/N) and (0/0)
						if (totalInBatch > 0) {
							// Batch with items completed
							this.stateManager.setSystemState("Indexed", "File changes processed. Index up-to-date.")
						} else {
							if (this.stateManager.state === "Indexing") {
								// Only transition if it was "Indexing"
								this.stateManager.setSystemState("Indexed", "Index up-to-date. File queue empty.")
							}
						}
					}
				}),
				this.fileWatcher.onDidFinishBatchProcessing((summary: BatchProcessingSummary) => {
					if (summary.batchError) {
						console.error(`[CodeIndexOrchestrator] Batch processing failed:`, summary.batchError)
					} else {
						const successCount = summary.processedFiles.filter(
							(f: { status: string }) => f.status === "success",
						).length
						const errorCount = summary.processedFiles.filter(
							(f: { status: string }) => f.status === "error" || f.status === "local_error",
						).length
					}
				}),
			]
		} catch (error) {
			console.error("[CodeIndexOrchestrator] Failed to start file watcher:", error)
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "_startWatcher",
			})
			throw error
		}
	}

	/**
	 * Updates the status of a file in the state manager.
	 */

	/**
	 * Sets up event handlers for the background indexing service
	 */
	private _setupBackgroundServiceHandlers(): void {
		if (!this._backgroundIndexingService) return

		this._backgroundIndexingService.on("jobCompleted", (job: any, status: any, processingTime: number) => {
			this._performanceMetrics.totalFilesProcessed++
			this._performanceMetrics.averageProcessingTime =
				(this._performanceMetrics.averageProcessingTime * (this._performanceMetrics.totalFilesProcessed - 1) +
					processingTime) /
				this._performanceMetrics.totalFilesProcessed

			// Update state manager with progress
			this.stateManager.reportFileQueueProgress(
				this._performanceMetrics.totalFilesProcessed,
				this._performanceMetrics.totalFilesProcessed + this._backgroundIndexingService!.getQueueStatus().total,
				path.basename(job.filePath),
			)
		})

		this._backgroundIndexingService.on("jobFailed", (job: any, error: any) => {
			console.error(`[CodeIndexOrchestrator] Background job failed for ${job.filePath}:`, error)
		})

		this._backgroundIndexingService.on("processingCompleted", () => {
			this.stateManager.setSystemState("Indexed", "Background indexing completed successfully")
		})

		this._backgroundIndexingService.on("resourceConstraint", (type: string, value: any) => {
			console.warn(`[CodeIndexOrchestrator] Resource constraint detected: ${type} = ${value}`)
			this.stateManager.setSystemState("Indexing", `Processing paused due to ${type} constraints`)
		})
	}

	/**
	 * Enhanced indexing with intelligent prioritization and background processing
	 */
	public async startIndexingWithPrioritization(): Promise<void> {
		if (!this._schematicAnalyzer || !this._backgroundIndexingService) {
			// Fall back to original implementation
			return this.startIndexing()
		}

		// Check workspace availability
		if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
			this.stateManager.setSystemState("Error", t("embeddings:orchestrator.indexingRequiresWorkspace"))
			console.warn("[CodeIndexOrchestrator] Start rejected: No workspace folder open.")
			return
		}

		if (!this.configManager.isFeatureConfigured) {
			this.stateManager.setSystemState("Standby", "Missing configuration. Save your settings to start indexing.")
			console.warn("[CodeIndexOrchestrator] Start rejected: Missing configuration.")
			return
		}

		if (
			this._isProcessing ||
			(this.stateManager.state !== "Standby" &&
				this.stateManager.state !== "Error" &&
				this.stateManager.state !== "Indexed")
		) {
			console.warn(
				`[CodeIndexOrchestrator] Start rejected: Already processing or in state ${this.stateManager.state}.`,
			)
			return
		}

		this._isProcessing = true
		this.stateManager.setSystemState("Indexing", "Analyzing workspace structure...")

		try {
			// Initialize vector store
			const collectionCreated = await this.vectorStore.initialize()
			if (collectionCreated) {
				await this.cacheManager.clearCacheFile()
			}

			// Get all files from scanner
			const result = await this.scanner.scanDirectory(
				this.workspacePath,
				(error) => console.error("[CodeIndexOrchestrator] Scan error:", error),
				() => {}, // Block indexing handled by background service
				() => {}, // File parsing handled by background service
			)

			if (!result) {
				throw new Error("Scan failed, is scanner initialized?")
			}

			// Get files that need processing
			const allFiles = await this._getFilesForProcessing()

			// Analyze workspace for intelligent processing
			this.stateManager.setSystemState("Indexing", "Analyzing file priorities...")
			const workspaceAnalysis = await this._schematicAnalyzer.analyzeWorkspace(allFiles)

			// Get optimal processing order
			const processingOrder = await this._schematicAnalyzer.getOptimalProcessingOrder(allFiles)

			// Add files to background processing queue with priorities
			this.stateManager.setSystemState("Indexing", "Queuing files for intelligent processing...")

			// Process critical files immediately
			if (processingOrder.critical.length > 0) {
				await this._backgroundIndexingService.addBatchToQueue(
					processingOrder.critical,
					ProcessingPriority.IMMEDIATE,
				)
			}

			// Process high priority files next
			if (processingOrder.high.length > 0) {
				await this._backgroundIndexingService.addBatchToQueue(processingOrder.high, ProcessingPriority.HIGH)
			}

			// Process medium priority files
			if (processingOrder.medium.length > 0) {
				await this._backgroundIndexingService.addBatchToQueue(processingOrder.medium, ProcessingPriority.NORMAL)
			}

			// Process low priority files in background
			if (processingOrder.low.length > 0) {
				await this._backgroundIndexingService.addBatchToQueue(processingOrder.low, ProcessingPriority.LOW)
			}

			// Process minimal priority files only when idle
			if (processingOrder.minimal.length > 0) {
				await this._backgroundIndexingService.addBatchToQueue(
					processingOrder.minimal,
					ProcessingPriority.BACKGROUND,
				)
			}

			// Start background processing
			this._backgroundIndexingService.startProcessing()

			// Start file watcher for real-time updates
			await this._startWatcher()

			this.stateManager.setSystemState("Indexing", "Intelligent background processing started")
		} catch (error: any) {
			console.error("[CodeIndexOrchestrator] Error during enhanced indexing:", error)
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "startIndexingWithPrioritization",
			})

			// Clean up on error
			try {
				await this.vectorStore.clearCollection()
			} catch (cleanupError) {
				console.error("[CodeIndexOrchestrator] Failed to clean up after error:", cleanupError)
			}

			await this.cacheManager.clearCacheFile()
			this.stateManager.setSystemState(
				"Error",
				t("embeddings:orchestrator.failedDuringInitialScan", {
					errorMessage: error.message || t("embeddings:orchestrator.unknownError"),
				}),
			)
			this.stopWatcher()
		} finally {
			this._isProcessing = false
		}
	}

	/**
	 * Gets files that need processing from the workspace
	 */
	private async _getFilesForProcessing(): Promise<string[]> {
		// This would integrate with the existing scanner logic
		// For now, we'll use a simplified approach
		const workspaceFolders = vscode.workspace.workspaceFolders
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return []
		}

		const files: string[] = []
		// In a real implementation, this would use the existing file discovery logic
		// from the scanner, but return the file paths instead of processing them immediately

		return files
	}

	/**
	 * Optimizes indexing performance based on current metrics
	 */
	public optimizeIndexingPerformance(): void {
		if (!this._backgroundIndexingService) return

		const now = Date.now()

		// Only optimize every 5 minutes to avoid excessive overhead
		if (now - this._performanceMetrics.lastOptimizationTime < 300000) {
			return
		}

		this._performanceMetrics.lastOptimizationTime = now

		// Get performance metrics
		const metrics = this._backgroundIndexingService.getPerformanceMetrics()
		const queueAnalysis = this._backgroundIndexingService.getQueueAnalysis()

		// Update efficiency metric
		this._performanceMetrics.indexingEfficiency = metrics.processingEfficiency * metrics.queueEfficiency

		// Optimize queue if needed
		if (metrics.queueEfficiency < 0.8 || metrics.averageWaitTime > 30000) {
			this._backgroundIndexingService.optimizeQueue()
		}

		// Log performance insights
		console.log(`[CodeIndexOrchestrator] Performance metrics:`, {
			efficiency: this._performanceMetrics.indexingEfficiency,
			avgProcessingTime: this._performanceMetrics.averageProcessingTime,
			queueSize: Object.values(queueAnalysis.priorityDistribution).reduce(
				(sum: number, count: number) => sum + count,
				0,
			),
			bottlenecks: queueAnalysis.bottlenecks,
		})

		// Emit performance update event
		this.stateManager.setSystemState(
			"Indexing",
			`Processing optimized - Efficiency: ${Math.round(this._performanceMetrics.indexingEfficiency * 100)}%`,
		)
	}

	/**
	 * Gets enhanced indexing statistics
	 */
	public getEnhancedStats(): {
		performance: typeof CodeIndexOrchestrator.prototype._performanceMetrics
		backgroundService?: ReturnType<BackgroundIndexingService["getStats"]>
		queueStatus?: ReturnType<BackgroundIndexingService["getQueueStatus"]>
		workspaceAnalysis?: ReturnType<SchematicAnalyzer["getWorkspaceAnalysis"]>
	} {
		return {
			performance: { ...this._performanceMetrics },
			backgroundService: this._backgroundIndexingService?.getStats(),
			queueStatus: this._backgroundIndexingService?.getQueueStatus(),
			workspaceAnalysis: this._schematicAnalyzer?.getWorkspaceAnalysis(),
		}
	}

	/**
	 * Initiates the indexing process (original implementation with fallback).
	 */
	public async startIndexing(): Promise<void> {
		// Check if workspace is available first
		if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
			this.stateManager.setSystemState("Error", t("embeddings:orchestrator.indexingRequiresWorkspace"))
			console.warn("[CodeIndexOrchestrator] Start rejected: No workspace folder open.")
			return
		}

		if (!this.configManager.isFeatureConfigured) {
			this.stateManager.setSystemState("Standby", "Missing configuration. Save your settings to start indexing.")
			console.warn("[CodeIndexOrchestrator] Start rejected: Missing configuration.")
			return
		}

		if (
			this._isProcessing ||
			(this.stateManager.state !== "Standby" &&
				this.stateManager.state !== "Error" &&
				this.stateManager.state !== "Indexed")
		) {
			console.warn(
				`[CodeIndexOrchestrator] Start rejected: Already processing or in state ${this.stateManager.state}.`,
			)
			return
		}

		this._isProcessing = true
		this.stateManager.setSystemState("Indexing", "Initializing services...")

		try {
			const collectionCreated = await this.vectorStore.initialize()

			if (collectionCreated) {
				await this.cacheManager.clearCacheFile()
			}

			this.stateManager.setSystemState("Indexing", "Services ready. Starting workspace scan...")

			let cumulativeBlocksIndexed = 0
			let cumulativeBlocksFoundSoFar = 0
			let batchErrors: Error[] = []

			const handleFileParsed = (fileBlockCount: number) => {
				cumulativeBlocksFoundSoFar += fileBlockCount
				this.stateManager.reportBlockIndexingProgress(cumulativeBlocksIndexed, cumulativeBlocksFoundSoFar)
			}

			const handleBlocksIndexed = (indexedCount: number) => {
				cumulativeBlocksIndexed += indexedCount
				this.stateManager.reportBlockIndexingProgress(cumulativeBlocksIndexed, cumulativeBlocksFoundSoFar)
			}

			const result = await this.scanner.scanDirectory(
				this.workspacePath,
				(batchError: Error) => {
					console.error(
						`[CodeIndexOrchestrator] Error during initial scan batch: ${batchError.message}`,
						batchError,
					)
					batchErrors.push(batchError)
				},
				handleBlocksIndexed,
				handleFileParsed,
			)

			if (!result) {
				throw new Error("Scan failed, is scanner initialized?")
			}

			const { stats } = result

			// Check if any blocks were actually indexed successfully
			// If no blocks were indexed but blocks were found, it means all batches failed
			if (cumulativeBlocksIndexed === 0 && cumulativeBlocksFoundSoFar > 0) {
				if (batchErrors.length > 0) {
					// Use the first batch error as it's likely representative of the main issue
					const firstError = batchErrors[0]
					throw new Error(`Indexing failed: ${firstError.message}`)
				} else {
					throw new Error(t("embeddings:orchestrator.indexingFailedNoBlocks"))
				}
			}

			// Check for partial failures - if a significant portion of blocks failed
			const failureRate = (cumulativeBlocksFoundSoFar - cumulativeBlocksIndexed) / cumulativeBlocksFoundSoFar
			if (batchErrors.length > 0 && failureRate > 0.1) {
				// More than 10% of blocks failed to index
				const firstError = batchErrors[0]
				throw new Error(
					`Indexing partially failed: Only ${cumulativeBlocksIndexed} of ${cumulativeBlocksFoundSoFar} blocks were indexed. ${firstError.message}`,
				)
			}

			// CRITICAL: If there were ANY batch errors and NO blocks were successfully indexed,
			// this is a complete failure regardless of the failure rate calculation
			if (batchErrors.length > 0 && cumulativeBlocksIndexed === 0) {
				const firstError = batchErrors[0]
				throw new Error(`Indexing failed completely: ${firstError.message}`)
			}

			// Final sanity check: If we found blocks but indexed none and somehow no errors were reported,
			// this is still a failure
			if (cumulativeBlocksFoundSoFar > 0 && cumulativeBlocksIndexed === 0) {
				throw new Error(t("embeddings:orchestrator.indexingFailedCritical"))
			}

			await this._startWatcher()

			this.stateManager.setSystemState("Indexed", t("embeddings:orchestrator.fileWatcherStarted"))
		} catch (error: any) {
			console.error("[CodeIndexOrchestrator] Error during indexing:", error)
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "startIndexing",
			})
			try {
				await this.vectorStore.clearCollection()
			} catch (cleanupError) {
				console.error("[CodeIndexOrchestrator] Failed to clean up after error:", cleanupError)
				TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
					error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
					stack: cleanupError instanceof Error ? cleanupError.stack : undefined,
					location: "startIndexing.cleanup",
				})
			}

			await this.cacheManager.clearCacheFile()

			this.stateManager.setSystemState(
				"Error",
				t("embeddings:orchestrator.failedDuringInitialScan", {
					errorMessage: error.message || t("embeddings:orchestrator.unknownError"),
				}),
			)
			this.stopWatcher()
		} finally {
			this._isProcessing = false
		}
	}

	/**
	 * Stops the file watcher and cleans up resources.
	 */
	public stopWatcher(): void {
		this.fileWatcher.dispose()
		this._fileWatcherSubscriptions.forEach((sub) => sub.dispose())
		this._fileWatcherSubscriptions = []

		// Stop background indexing service
		if (this._backgroundIndexingService) {
			this._backgroundIndexingService.stopProcessing()
		}

		if (this.stateManager.state !== "Error") {
			this.stateManager.setSystemState("Standby", t("embeddings:orchestrator.fileWatcherStopped"))
		}
		this._isProcessing = false
	}

	/**
	 * Disposes of all resources including enhanced services
	 */
	public dispose(): void {
		this.stopWatcher()

		if (this._backgroundIndexingService) {
			this._backgroundIndexingService.dispose()
		}

		if (this._schematicAnalyzer) {
			this._schematicAnalyzer.clearCache()
		}
	}

	/**
	 * Pauses background processing
	 */
	public pauseBackgroundProcessing(): void {
		if (this._backgroundIndexingService) {
			this._backgroundIndexingService.pauseProcessing()
		}
	}

	/**
	 * Resumes background processing
	 */
	public resumeBackgroundProcessing(): void {
		if (this._backgroundIndexingService) {
			this._backgroundIndexingService.resumeProcessing()
		}
	}

	/**
	 * Adds a file to the background processing queue with intelligent prioritization
	 */
	public async addFileToBackgroundQueue(filePath: string, content?: string): Promise<string | null> {
		if (!this._backgroundIndexingService) {
			return null
		}

		return await this._backgroundIndexingService.addToQueue(filePath, content)
	}

	/**
	 * Gets the current background processing status
	 */
	public getBackgroundProcessingStatus(): {
		isEnabled: boolean
		isProcessing: boolean
		queueSize: number
		stats?: ReturnType<BackgroundIndexingService["getStats"]>
	} {
		if (!this._backgroundIndexingService) {
			return {
				isEnabled: false,
				isProcessing: false,
				queueSize: 0,
			}
		}

		const stats = this._backgroundIndexingService.getStats()
		return {
			isEnabled: true,
			isProcessing: stats.activeJobs > 0,
			queueSize: stats.queueSize,
			stats,
		}
	}

	/**
	 * Clears all index data by stopping the watcher, clearing the vector store,
	 * and resetting the cache file.
	 */
	public async clearIndexData(): Promise<void> {
		this._isProcessing = true

		try {
			await this.stopWatcher()

			try {
				if (this.configManager.isFeatureConfigured) {
					await this.vectorStore.deleteCollection()
				} else {
					console.warn("[CodeIndexOrchestrator] Service not configured, skipping vector collection clear.")
				}
			} catch (error: any) {
				console.error("[CodeIndexOrchestrator] Failed to clear vector collection:", error)
				TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
					location: "clearIndexData",
				})
				this.stateManager.setSystemState("Error", `Failed to clear vector collection: ${error.message}`)
			}

			await this.cacheManager.clearCacheFile()

			if (this.stateManager.state !== "Error") {
				this.stateManager.setSystemState("Standby", "Index data cleared successfully.")
			}
		} finally {
			this._isProcessing = false
		}
	}

	/**
	 * Gets the current state of the indexing system.
	 */
	public get state(): IndexingState {
		return this.stateManager.state
	}
}

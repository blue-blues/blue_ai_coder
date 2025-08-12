import * as vscode from "vscode"
import { EventEmitter } from "events"
import { SchematicAnalyzer, FileAnalysis, ImportanceLevel } from "./SchematicAnalyzer"
import { ICodeParser, IEmbedder, IVectorStore, CodeBlock } from "./interfaces"
import { CacheManager } from "./cache-manager"
import { TelemetryService } from "@blues-code/telemetry"
import { TelemetryEventName } from "@blues-code/types"
import { sanitizeErrorMessage } from "./shared/validation-helpers"
import { createHash } from "crypto"
import { v5 as uuidv5 } from "uuid"
import { QDRANT_CODE_BLOCK_NAMESPACE } from "./constants"
import { generateNormalizedAbsolutePath, generateRelativeFilePath } from "./shared/get-relative-path"

/**
 * Priority levels for background processing queue
 */
export enum ProcessingPriority {
	IMMEDIATE = 0, // Critical files that need immediate processing
	HIGH = 1, // Important files that should be processed soon
	NORMAL = 2, // Regular files in normal processing order
	LOW = 3, // Less important files processed when idle
	BACKGROUND = 4, // Files processed only during idle time
}

/**
 * Processing job in the queue
 */
export interface ProcessingJob {
	id: string
	filePath: string
	priority: ProcessingPriority
	estimatedTime: number
	retryCount: number
	maxRetries: number
	addedAt: Date
	startedAt?: Date
	completedAt?: Date
	error?: Error
	analysis?: FileAnalysis
	content?: string
	fileHash?: string
}

/**
 * Processing statistics and metrics
 */
export interface ProcessingStats {
	totalJobs: number
	completedJobs: number
	failedJobs: number
	averageProcessingTime: number
	totalProcessingTime: number
	queueSize: number
	activeJobs: number
	throughputPerMinute: number
	errorRate: number
	lastProcessedAt?: Date
}

/**
 * Processing batch for efficient processing
 */
export interface ProcessingBatch {
	id: string
	jobs: ProcessingJob[]
	priority: ProcessingPriority
	estimatedTime: number
	createdAt: Date
	startedAt?: Date
	completedAt?: Date
}

/**
 * Background processing configuration
 */
export interface BackgroundProcessingConfig {
	maxConcurrentJobs: number
	maxQueueSize: number
	batchSize: number
	idleThreshold: number // ms of inactivity before starting background processing
	maxRetries: number
	retryDelay: number // ms
	priorityThresholds: {
		immediate: number // ms - process immediately
		high: number // ms - process within this time
		normal: number // ms - normal processing window
	}
	memoryThreshold: number // MB - pause processing if memory usage exceeds
	cpuThreshold: number // % - pause processing if CPU usage exceeds
}

/**
 * Default configuration for background processing
 */
const DEFAULT_CONFIG: BackgroundProcessingConfig = {
	maxConcurrentJobs: 3,
	maxQueueSize: 1000,
	batchSize: 20,
	idleThreshold: 2000,
	maxRetries: 3,
	retryDelay: 1000,
	priorityThresholds: {
		immediate: 0,
		high: 5000,
		normal: 30000,
	},
	memoryThreshold: 512, // 512MB
	cpuThreshold: 80, // 80%
}

/**
 * BackgroundIndexingService provides intelligent queue-based processing
 * with priority management, batch optimization, and resource monitoring
 */
export class BackgroundIndexingService extends EventEmitter {
	private processingQueue: ProcessingJob[] = []
	private activeJobs = new Map<string, ProcessingJob>()
	private completedJobs: ProcessingJob[] = []
	private failedJobs: ProcessingJob[] = []
	private processingBatches: ProcessingBatch[] = []

	private isProcessing = false
	private isPaused = false
	private lastActivityTime = Date.now()
	private processingTimer: NodeJS.Timeout | null = null
	private idleTimer: NodeJS.Timeout | null = null
	private statsTimer: NodeJS.Timeout | null = null

	private stats: ProcessingStats = {
		totalJobs: 0,
		completedJobs: 0,
		failedJobs: 0,
		averageProcessingTime: 0,
		totalProcessingTime: 0,
		queueSize: 0,
		activeJobs: 0,
		throughputPerMinute: 0,
		errorRate: 0,
	}

	constructor(
		private readonly schematicAnalyzer: SchematicAnalyzer,
		private readonly codeParser: ICodeParser,
		private readonly embedder: IEmbedder,
		private readonly vectorStore: IVectorStore,
		private readonly cacheManager: CacheManager,
		private readonly workspacePath: string,
		private readonly config: BackgroundProcessingConfig = DEFAULT_CONFIG,
	) {
		super()
		this.startStatsCollection()
		this.startIdleMonitoring()
	}

	/**
	 * Adds a file to the processing queue with intelligent prioritization
	 */
	async addToQueue(filePath: string, content?: string, forcePriority?: ProcessingPriority): Promise<string> {
		// Check queue size limit
		if (this.processingQueue.length >= this.config.maxQueueSize) {
			// Remove lowest priority jobs to make space
			this.processingQueue = this.processingQueue
				.sort((a, b) => a.priority - b.priority)
				.slice(0, this.config.maxQueueSize - 1)
		}

		// Generate unique job ID
		const jobId = createHash("md5").update(`${filePath}-${Date.now()}`).digest("hex")

		// Determine priority if not forced
		let priority = forcePriority
		if (priority === undefined) {
			priority = await this.determinePriority(filePath)
		}

		// Estimate processing time
		const estimatedTime = await this.schematicAnalyzer.estimateProcessingTime(filePath)

		// Create processing job
		const job: ProcessingJob = {
			id: jobId,
			filePath,
			priority,
			estimatedTime,
			retryCount: 0,
			maxRetries: this.config.maxRetries,
			addedAt: new Date(),
			content,
			fileHash: content ? createHash("sha256").update(content).digest("hex") : undefined,
		}

		// Add to queue in priority order
		this.insertJobByPriority(job)
		this.stats.totalJobs++
		this.stats.queueSize = this.processingQueue.length

		this.emit("jobAdded", job)

		// Start processing if not already running
		if (!this.isProcessing && !this.isPaused) {
			this.startProcessing()
		}

		return jobId
	}

	/**
	 * Adds multiple files to queue with batch optimization
	 */
	async addBatchToQueue(filePaths: string[], forcePriority?: ProcessingPriority): Promise<string[]> {
		const jobIds: string[] = []

		// Get intelligent batches from schematic analyzer
		const batches = await this.schematicAnalyzer.getIntelligentBatches(filePaths, this.config.batchSize)

		for (const batch of batches) {
			for (const filePath of batch) {
				const jobId = await this.addToQueue(filePath, undefined, forcePriority)
				jobIds.push(jobId)
			}
		}

		return jobIds
	}

	/**
	 * Alias for addBatchToQueue for compatibility
	 */
	async addBatch(filePaths: string[], forcePriority?: ProcessingPriority): Promise<string[]> {
		return this.addBatchToQueue(filePaths, forcePriority)
	}

	/**
	 * Alias for startProcessing for compatibility
	 */
	startBackgroundProcessing(): void {
		this.startProcessing()
	}

	/**
	 * Queues a single file for processing
	 */
	async queueFile(filePath: string, priority?: ProcessingPriority): Promise<string> {
		return this.addToQueue(filePath, undefined, priority)
	}

	/**
	 * Adjusts the batch size for processing
	 */
	adjustBatchSize(newBatchSize: number): void {
		this.config.batchSize = Math.max(1, Math.min(100, newBatchSize))
		this.emit("configUpdated", { batchSize: this.config.batchSize })
	}

	/**
	 * Adjusts the concurrency level for processing
	 */
	adjustConcurrency(newConcurrency: number): void {
		this.config.maxConcurrentJobs = Math.max(1, Math.min(10, newConcurrency))
		this.emit("configUpdated", { maxConcurrentJobs: this.config.maxConcurrentJobs })
	}

	/**
	 * Adjusts the priority threshold for processing
	 */
	adjustPriorityThreshold(threshold: number): void {
		this.config.priorityThresholds.normal = Math.max(1000, Math.min(60000, threshold))
		this.emit("configUpdated", { priorityThresholds: this.config.priorityThresholds })
	}

	/**
	 * Starts background processing
	 */
	startProcessing(): void {
		if (this.isProcessing || this.isPaused) {
			return
		}

		this.isProcessing = true
		this.emit("processingStarted")
		this.processQueue()
	}

	/**
	 * Stops background processing
	 */
	stopProcessing(): void {
		this.isProcessing = false
		this.isPaused = true

		if (this.processingTimer) {
			clearTimeout(this.processingTimer)
			this.processingTimer = null
		}

		this.emit("processingStopped")
	}

	/**
	 * Pauses processing temporarily
	 */
	pauseProcessing(): void {
		this.isPaused = true
		this.emit("processingPaused")
	}

	/**
	 * Resumes processing
	 */
	resumeProcessing(): void {
		this.isPaused = false
		this.emit("processingResumed")

		if (!this.isProcessing && this.processingQueue.length > 0) {
			this.startProcessing()
		}
	}

	/**
	 * Clears the processing queue
	 */
	clearQueue(): void {
		const clearedJobs = this.processingQueue.length
		this.processingQueue = []
		this.stats.queueSize = 0

		this.emit("queueCleared", clearedJobs)
	}

	/**
	 * Gets current processing statistics
	 */
	getStats(): ProcessingStats {
		return { ...this.stats }
	}

	/**
	 * Gets current queue status
	 */
	getQueueStatus(): {
		total: number
		byPriority: Record<ProcessingPriority, number>
		active: number
		estimated: number
	} {
		const byPriority: Record<ProcessingPriority, number> = {
			[ProcessingPriority.IMMEDIATE]: 0,
			[ProcessingPriority.HIGH]: 0,
			[ProcessingPriority.NORMAL]: 0,
			[ProcessingPriority.LOW]: 0,
			[ProcessingPriority.BACKGROUND]: 0,
		}

		let estimatedTime = 0
		for (const job of this.processingQueue) {
			byPriority[job.priority]++
			estimatedTime += job.estimatedTime
		}

		return {
			total: this.processingQueue.length,
			byPriority,
			active: this.activeJobs.size,
			estimated: estimatedTime,
		}
	}

	/**
	 * Gets job by ID
	 */
	getJob(jobId: string): ProcessingJob | undefined {
		return (
			this.activeJobs.get(jobId) ||
			this.processingQueue.find((j) => j.id === jobId) ||
			this.completedJobs.find((j) => j.id === jobId) ||
			this.failedJobs.find((j) => j.id === jobId)
		)
	}

	/**
	 * Removes job from queue
	 */
	removeJob(jobId: string): boolean {
		const index = this.processingQueue.findIndex((j) => j.id === jobId)
		if (index >= 0) {
			this.processingQueue.splice(index, 1)
			this.stats.queueSize = this.processingQueue.length
			this.emit("jobRemoved", jobId)
			return true
		}
		return false
	}

	/**
	 * Changes job priority
	 */
	changeJobPriority(jobId: string, newPriority: ProcessingPriority): boolean {
		const jobIndex = this.processingQueue.findIndex((j) => j.id === jobId)
		if (jobIndex >= 0) {
			const job = this.processingQueue.splice(jobIndex, 1)[0]
			job.priority = newPriority
			this.insertJobByPriority(job)
			this.emit("jobPriorityChanged", jobId, newPriority)
			return true
		}
		return false
	}

	/**
	 * Disposes of the service and cleans up resources
	 */
	dispose(): void {
		this.stopProcessing()

		if (this.idleTimer) {
			clearTimeout(this.idleTimer)
		}

		if (this.statsTimer) {
			clearInterval(this.statsTimer)
		}

		this.removeAllListeners()
	}

	// Private methods

	/**
	 * Main processing loop
	 */
	private async processQueue(): Promise<void> {
		while (this.isProcessing && !this.isPaused && this.processingQueue.length > 0) {
			// Check resource constraints
			if (await this.shouldPauseForResources()) {
				this.pauseProcessing()
				setTimeout(() => this.resumeProcessing(), 5000) // Retry in 5 seconds
				break
			}

			// Process jobs up to concurrency limit
			while (this.activeJobs.size < this.config.maxConcurrentJobs && this.processingQueue.length > 0) {
				const job = this.getNextJob()
				if (job) {
					this.processJob(job)
				} else {
					break
				}
			}

			// Wait before next iteration
			await new Promise((resolve) => {
				this.processingTimer = setTimeout(resolve, 100)
			})
		}

		// Processing completed
		if (this.processingQueue.length === 0) {
			this.isProcessing = false
			this.emit("processingCompleted")
		}
	}

	/**
	 * Gets the next job to process based on priority and timing
	 */
	private getNextJob(): ProcessingJob | null {
		if (this.processingQueue.length === 0) {
			return null
		}

		const now = Date.now()

		// Find highest priority job that should be processed now
		for (let i = 0; i < this.processingQueue.length; i++) {
			const job = this.processingQueue[i]
			const waitTime = now - job.addedAt.getTime()

			// Check if job should be processed based on priority and wait time
			if (this.shouldProcessJob(job, waitTime)) {
				return this.processingQueue.splice(i, 1)[0]
			}
		}

		return null
	}

	/**
	 * Determines if a job should be processed now
	 */
	private shouldProcessJob(job: ProcessingJob, waitTime: number): boolean {
		switch (job.priority) {
			case ProcessingPriority.IMMEDIATE:
				return true
			case ProcessingPriority.HIGH:
				return waitTime >= this.config.priorityThresholds.immediate
			case ProcessingPriority.NORMAL:
				return waitTime >= this.config.priorityThresholds.high
			case ProcessingPriority.LOW:
				return waitTime >= this.config.priorityThresholds.normal
			case ProcessingPriority.BACKGROUND:
				// Only process background jobs during idle time
				return this.isIdle() && waitTime >= this.config.priorityThresholds.normal * 2
			default:
				return false
		}
	}

	/**
	 * Processes a single job
	 */
	private async processJob(job: ProcessingJob): Promise<void> {
		job.startedAt = new Date()
		this.activeJobs.set(job.id, job)
		this.stats.activeJobs = this.activeJobs.size
		this.stats.queueSize = this.processingQueue.length

		this.emit("jobStarted", job)

		try {
			// Read file content if not provided
			let content = job.content
			if (!content) {
				const buffer = await vscode.workspace.fs.readFile(vscode.Uri.file(job.filePath))
				content = Buffer.from(buffer).toString("utf-8")
			}

			// Calculate file hash
			const fileHash = createHash("sha256").update(content).digest("hex")
			job.fileHash = fileHash

			// Check cache to see if file needs processing
			const cachedHash = this.cacheManager.getHash(job.filePath)
			if (cachedHash === fileHash) {
				// File unchanged, mark as completed
				this.completeJob(job, "skipped")
				return
			}

			// Analyze file structure
			job.analysis = await this.schematicAnalyzer.analyzeFile(job.filePath, content)

			// Parse code blocks
			const blocks = await this.codeParser.parseFile(job.filePath, { content, fileHash })

			if (blocks.length > 0) {
				// Delete existing points for this file
				await this.vectorStore.deletePointsByFilePath(job.filePath)

				// Create embeddings and upsert points
				const texts = blocks.map((block) => block.content.trim()).filter((text) => text)
				if (texts.length > 0) {
					const { embeddings } = await this.embedder.createEmbeddings(texts)

					const points = blocks.map((block, index) => {
						const normalizedPath = generateNormalizedAbsolutePath(block.file_path, this.workspacePath)
						const pointId = uuidv5(block.segmentHash, QDRANT_CODE_BLOCK_NAMESPACE)

						return {
							id: pointId,
							vector: embeddings[index],
							payload: {
								filePath: generateRelativeFilePath(normalizedPath, this.workspacePath),
								codeChunk: block.content,
								startLine: block.start_line,
								endLine: block.end_line,
								segmentHash: block.segmentHash,
							},
						}
					})

					await this.vectorStore.upsertPoints(points)
				}
			}

			// Update cache
			await this.cacheManager.updateHash(job.filePath, fileHash)

			this.completeJob(job, "success")
		} catch (error) {
			this.handleJobError(job, error as Error)
		}
	}

	/**
	 * Completes a job successfully
	 */
	private completeJob(job: ProcessingJob, status: "success" | "skipped"): void {
		job.completedAt = new Date()

		const processingTime = job.startedAt ? job.completedAt.getTime() - job.startedAt.getTime() : 0

		// Update statistics
		this.stats.completedJobs++
		this.stats.totalProcessingTime += processingTime
		this.stats.averageProcessingTime = this.stats.totalProcessingTime / this.stats.completedJobs
		this.stats.lastProcessedAt = job.completedAt

		// Move to completed jobs
		this.activeJobs.delete(job.id)
		this.completedJobs.push(job)
		this.stats.activeJobs = this.activeJobs.size

		// Keep only recent completed jobs to prevent memory bloat
		if (this.completedJobs.length > 1000) {
			this.completedJobs = this.completedJobs.slice(-500)
		}

		this.emit("jobCompleted", job, status, processingTime)
		this.updateActivity()
	}

	/**
	 * Handles job errors and retries
	 */
	private handleJobError(job: ProcessingJob, error: Error): void {
		job.error = error
		job.retryCount++

		TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
			error: sanitizeErrorMessage(error.message),
			stack: sanitizeErrorMessage(error.stack || ""),
			location: "BackgroundIndexingService.processJob",
			filePath: job.filePath,
			retryCount: job.retryCount,
		})

		if (job.retryCount < job.maxRetries) {
			// Retry the job with exponential backoff
			const delay = this.config.retryDelay * Math.pow(2, job.retryCount - 1)

			setTimeout(() => {
				// Re-add to queue with same priority
				this.insertJobByPriority(job)
				this.stats.queueSize = this.processingQueue.length
			}, delay)

			this.activeJobs.delete(job.id)
			this.stats.activeJobs = this.activeJobs.size

			this.emit("jobRetry", job, error, delay)
		} else {
			// Max retries reached, mark as failed
			job.completedAt = new Date()
			this.stats.failedJobs++
			this.stats.errorRate = this.stats.failedJobs / this.stats.totalJobs

			this.activeJobs.delete(job.id)
			this.failedJobs.push(job)
			this.stats.activeJobs = this.activeJobs.size

			// Keep only recent failed jobs
			if (this.failedJobs.length > 100) {
				this.failedJobs = this.failedJobs.slice(-50)
			}

			this.emit("jobFailed", job, error)
		}

		this.updateActivity()
	}

	/**
	 * Determines processing priority for a file
	 */
	private async determinePriority(filePath: string): Promise<ProcessingPriority> {
		try {
			const shouldPrioritize = await this.schematicAnalyzer.shouldPrioritizeFile(filePath)
			if (shouldPrioritize) {
				return ProcessingPriority.HIGH
			}

			// Check if it's a recently modified file (higher priority)
			const stats = await vscode.workspace.fs.stat(vscode.Uri.file(filePath))
			const modifiedRecently = Date.now() - stats.mtime < 300000 // 5 minutes

			if (modifiedRecently) {
				return ProcessingPriority.NORMAL
			}

			return ProcessingPriority.LOW
		} catch (error) {
			return ProcessingPriority.BACKGROUND
		}
	}

	/**
	 * Inserts job into queue maintaining priority order
	 */
	private insertJobByPriority(job: ProcessingJob): void {
		let insertIndex = this.processingQueue.length

		// Find insertion point to maintain priority order
		for (let i = 0; i < this.processingQueue.length; i++) {
			if (job.priority < this.processingQueue[i].priority) {
				insertIndex = i
				break
			}
		}

		this.processingQueue.splice(insertIndex, 0, job)
	}

	/**
	 * Checks if processing should be paused due to resource constraints
	 */
	private async shouldPauseForResources(): Promise<boolean> {
		try {
			// Check memory usage (simplified - in real implementation would use process.memoryUsage())
			const memoryUsage = process.memoryUsage()
			const memoryMB = memoryUsage.heapUsed / 1024 / 1024

			if (memoryMB > this.config.memoryThreshold) {
				this.emit("resourceConstraint", "memory", memoryMB)
				return true
			}

			// CPU check would require additional monitoring in real implementation
			// For now, we'll use a simple heuristic based on active jobs
			if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
				return false // Normal concurrency limit
			}

			return false
		} catch (error) {
			return false
		}
	}

	/**
	 * Checks if the system is idle
	 */
	private isIdle(): boolean {
		return Date.now() - this.lastActivityTime > this.config.idleThreshold
	}

	/**
	 * Updates last activity time
	 */
	private updateActivity(): void {
		this.lastActivityTime = Date.now()
	}

	/**
	 * Starts idle monitoring
	 */
	private startIdleMonitoring(): void {
		this.idleTimer = setInterval(() => {
			if (this.isIdle() && !this.isProcessing && this.processingQueue.length > 0) {
				// Start background processing during idle time
				const backgroundJobs = this.processingQueue.filter((j) => j.priority === ProcessingPriority.BACKGROUND)
				if (backgroundJobs.length > 0) {
					this.startProcessing()
				}
			}
		}, this.config.idleThreshold)
	}

	/**
	 * Starts statistics collection
	 */
	private startStatsCollection(): void {
		this.statsTimer = setInterval(() => {
			// Calculate throughput
			const now = Date.now()
			const oneMinuteAgo = now - 60000

			const recentJobs = this.completedJobs.filter(
				(job) => job.completedAt && job.completedAt.getTime() > oneMinuteAgo,
			)

			this.stats.throughputPerMinute = recentJobs.length

			// Update queue size
			this.stats.queueSize = this.processingQueue.length

			this.emit("statsUpdated", this.stats)
		}, 10000) // Update every 10 seconds
	}

	/**
	 * Gets performance metrics
	 */
	getPerformanceMetrics(): {
		queueEfficiency: number
		averageWaitTime: number
		processingEfficiency: number
		resourceUtilization: number
	} {
		const now = Date.now()

		// Calculate average wait time
		let totalWaitTime = 0
		let waitTimeJobs = 0

		for (const job of this.completedJobs) {
			if (job.startedAt) {
				totalWaitTime += job.startedAt.getTime() - job.addedAt.getTime()
				waitTimeJobs++
			}
		}

		const averageWaitTime = waitTimeJobs > 0 ? totalWaitTime / waitTimeJobs : 0

		// Calculate queue efficiency (how well we're processing jobs in priority order)
		let queueEfficiency = 1.0
		if (this.processingQueue.length > 1) {
			let outOfOrderCount = 0
			for (let i = 1; i < this.processingQueue.length; i++) {
				if (this.processingQueue[i].priority < this.processingQueue[i - 1].priority) {
					outOfOrderCount++
				}
			}
			queueEfficiency = 1.0 - outOfOrderCount / (this.processingQueue.length - 1)
		}

		// Processing efficiency (actual vs estimated time)
		let processingEfficiency = 1.0
		if (this.completedJobs.length > 0) {
			let totalActual = 0
			let totalEstimated = 0

			for (const job of this.completedJobs.slice(-100)) {
				// Last 100 jobs
				if (job.startedAt && job.completedAt) {
					const actual = job.completedAt.getTime() - job.startedAt.getTime()
					totalActual += actual
					totalEstimated += job.estimatedTime
				}
			}

			if (totalEstimated > 0) {
				processingEfficiency = Math.min(1.0, totalEstimated / totalActual)
			}
		}

		// Resource utilization (how well we're using available concurrency)
		const resourceUtilization = this.activeJobs.size / this.config.maxConcurrentJobs

		return {
			queueEfficiency,
			averageWaitTime,
			processingEfficiency,
			resourceUtilization,
		}
	}

	/**
	 * Optimizes queue based on current performance metrics
	 */
	optimizeQueue(): void {
		const metrics = this.getPerformanceMetrics()

		// If queue efficiency is low, re-sort the queue
		if (metrics.queueEfficiency < 0.8) {
			this.processingQueue.sort((a, b) => {
				if (a.priority !== b.priority) {
					return a.priority - b.priority
				}
				// Secondary sort by wait time for same priority
				return a.addedAt.getTime() - b.addedAt.getTime()
			})

			this.emit("queueOptimized", "priority-resort")
		}

		// If average wait time is high, increase concurrency temporarily
		if (metrics.averageWaitTime > 30000 && this.config.maxConcurrentJobs < 6) {
			this.config.maxConcurrentJobs++
			this.emit("queueOptimized", "increased-concurrency")
		}

		// If resource utilization is low but queue is full, reduce batch size
		if (metrics.resourceUtilization < 0.5 && this.processingQueue.length > 100) {
			this.config.batchSize = Math.max(10, this.config.batchSize - 5)
			this.emit("queueOptimized", "reduced-batch-size")
		}
	}

	/**
	 * Gets detailed queue analysis
	 */
	getQueueAnalysis(): {
		priorityDistribution: Record<ProcessingPriority, number>
		estimatedCompletionTime: number
		oldestJob: Date | null
		averageJobAge: number
		bottlenecks: string[]
	} {
		const priorityDistribution: Record<ProcessingPriority, number> = {
			[ProcessingPriority.IMMEDIATE]: 0,
			[ProcessingPriority.HIGH]: 0,
			[ProcessingPriority.NORMAL]: 0,
			[ProcessingPriority.LOW]: 0,
			[ProcessingPriority.BACKGROUND]: 0,
		}

		let totalEstimatedTime = 0
		let oldestJobTime: Date | null = null
		let totalAge = 0
		const now = Date.now()

		for (const job of this.processingQueue) {
			priorityDistribution[job.priority]++
			totalEstimatedTime += job.estimatedTime

			const jobAge = now - job.addedAt.getTime()
			totalAge += jobAge

			if (!oldestJobTime || job.addedAt < oldestJobTime) {
				oldestJobTime = job.addedAt
			}
		}

		const averageJobAge = this.processingQueue.length > 0 ? totalAge / this.processingQueue.length : 0
		const estimatedCompletionTime = totalEstimatedTime / this.config.maxConcurrentJobs

		// Identify bottlenecks
		const bottlenecks: string[] = []
		if (this.stats.errorRate > 0.1) bottlenecks.push("high-error-rate")
		if (averageJobAge > 300000) bottlenecks.push("long-wait-times")
		if (this.activeJobs.size < this.config.maxConcurrentJobs && this.processingQueue.length > 0) {
			bottlenecks.push("underutilized-concurrency")
		}

		return {
			priorityDistribution,
			estimatedCompletionTime,
			oldestJob: oldestJobTime,
			averageJobAge,
			bottlenecks,
		}
	}
}

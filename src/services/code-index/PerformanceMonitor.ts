import { EventEmitter } from "events"
import { TelemetryService } from "@roo-code/telemetry"
import { TelemetryEventName } from "@roo-code/types"

/**
 * Performance metrics for indexing operations
 */
export interface IndexingPerformanceMetrics {
	// Throughput metrics
	filesPerSecond: number
	blocksPerSecond: number
	bytesPerSecond: number

	// Timing metrics
	averageFileProcessingTime: number
	averageBatchProcessingTime: number
	totalIndexingTime: number

	// Quality metrics
	successRate: number
	errorRate: number
	retryRate: number

	// Resource utilization
	memoryUsage: number
	cpuUsage: number
	diskIORate: number

	// Queue metrics
	averageQueueWaitTime: number
	queueEfficiency: number
	concurrencyUtilization: number

	// Optimization metrics
	cacheHitRate: number
	duplicateDetectionRate: number
	incrementalIndexingEfficiency: number
}

/**
 * Performance trend data
 */
export interface PerformanceTrend {
	timestamp: Date
	metrics: IndexingPerformanceMetrics
	workspaceSize: number
	fileCount: number
}

/**
 * Performance alert configuration
 */
export interface PerformanceAlert {
	id: string
	type: "warning" | "critical"
	metric: keyof IndexingPerformanceMetrics
	threshold: number
	condition: "above" | "below"
	message: string
	enabled: boolean
}

/**
 * Performance optimization suggestion
 */
export interface OptimizationSuggestion {
	id: string
	category: "configuration" | "resource" | "workflow" | "infrastructure"
	priority: "low" | "medium" | "high" | "critical"
	title: string
	description: string
	impact: string
	implementation: string
	estimatedImprovement: number // percentage
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitorConfig {
	enabled: boolean
	samplingInterval: number // ms
	retentionPeriod: number // ms
	alertThresholds: Record<keyof IndexingPerformanceMetrics, number>
	enableTelemetry: boolean
	enableOptimizationSuggestions: boolean
}

/**
 * Default performance monitoring configuration
 */
const DEFAULT_CONFIG: PerformanceMonitorConfig = {
	enabled: true,
	samplingInterval: 10000, // 10 seconds
	retentionPeriod: 86400000, // 24 hours
	alertThresholds: {
		filesPerSecond: 1.0,
		blocksPerSecond: 10.0,
		bytesPerSecond: 1024 * 1024, // 1MB/s
		averageFileProcessingTime: 5000, // 5 seconds
		averageBatchProcessingTime: 30000, // 30 seconds
		totalIndexingTime: 300000, // 5 minutes
		successRate: 0.95, // 95%
		errorRate: 0.05, // 5%
		retryRate: 0.1, // 10%
		memoryUsage: 512 * 1024 * 1024, // 512MB
		cpuUsage: 80, // 80%
		diskIORate: 10 * 1024 * 1024, // 10MB/s
		averageQueueWaitTime: 10000, // 10 seconds
		queueEfficiency: 0.8, // 80%
		concurrencyUtilization: 0.7, // 70%
		cacheHitRate: 0.6, // 60%
		duplicateDetectionRate: 0.1, // 10%
		incrementalIndexingEfficiency: 0.8, // 80%
	},
	enableTelemetry: true,
	enableOptimizationSuggestions: true,
}

/**
 * PerformanceMonitor tracks and analyzes indexing performance,
 * provides optimization suggestions, and alerts on performance issues
 */
export class PerformanceMonitor extends EventEmitter {
	private config: PerformanceMonitorConfig
	private performanceHistory: PerformanceTrend[] = []
	private currentMetrics: Partial<IndexingPerformanceMetrics> = {}
	private alerts: PerformanceAlert[] = []
	private monitoringTimer: NodeJS.Timeout | null = null
	private startTime: number = 0
	private lastSampleTime: number = 0

	// Counters for metrics calculation
	private counters = {
		filesProcessed: 0,
		blocksProcessed: 0,
		bytesProcessed: 0,
		successfulOperations: 0,
		failedOperations: 0,
		retryOperations: 0,
		cacheHits: 0,
		cacheMisses: 0,
		duplicatesDetected: 0,
		totalOperations: 0,
	}

	// Timing accumulators
	private timingAccumulators = {
		fileProcessingTimes: [] as number[],
		batchProcessingTimes: [] as number[],
		queueWaitTimes: [] as number[],
	}

	constructor(config: Partial<PerformanceMonitorConfig> = {}) {
		super()
		this.config = { ...DEFAULT_CONFIG, ...config }
		this.setupDefaultAlerts()
	}

	/**
	 * Starts performance monitoring
	 */
	start(): void {
		if (!this.config.enabled || this.monitoringTimer) {
			return
		}

		this.startTime = Date.now()
		this.lastSampleTime = this.startTime
		this.resetCounters()

		this.monitoringTimer = setInterval(() => {
			this.collectMetrics()
			this.checkAlerts()
			this.cleanupOldData()
		}, this.config.samplingInterval)

		this.emit("monitoringStarted")
	}

	/**
	 * Stops performance monitoring
	 */
	stop(): void {
		if (this.monitoringTimer) {
			clearInterval(this.monitoringTimer)
			this.monitoringTimer = null
		}

		this.emit("monitoringStopped")
	}

	/**
	 * Records a file processing event
	 */
	recordFileProcessed(processingTime: number, fileSize: number, success: boolean): void {
		this.counters.filesProcessed++
		this.counters.bytesProcessed += fileSize
		this.counters.totalOperations++

		if (success) {
			this.counters.successfulOperations++
		} else {
			this.counters.failedOperations++
		}

		this.timingAccumulators.fileProcessingTimes.push(processingTime)

		// Keep only recent timing data to prevent memory bloat
		if (this.timingAccumulators.fileProcessingTimes.length > 1000) {
			this.timingAccumulators.fileProcessingTimes = this.timingAccumulators.fileProcessingTimes.slice(-500)
		}
	}

	/**
	 * Records a batch processing event
	 */
	recordBatchProcessed(processingTime: number, blockCount: number, success: boolean): void {
		this.counters.blocksProcessed += blockCount
		this.counters.totalOperations++

		if (success) {
			this.counters.successfulOperations++
		} else {
			this.counters.failedOperations++
		}

		this.timingAccumulators.batchProcessingTimes.push(processingTime)

		// Keep only recent timing data
		if (this.timingAccumulators.batchProcessingTimes.length > 1000) {
			this.timingAccumulators.batchProcessingTimes = this.timingAccumulators.batchProcessingTimes.slice(-500)
		}
	}

	/**
	 * Records a retry operation
	 */
	recordRetry(): void {
		this.counters.retryOperations++
	}

	/**
	 * Records a cache hit or miss
	 */
	recordCacheAccess(hit: boolean): void {
		if (hit) {
			this.counters.cacheHits++
		} else {
			this.counters.cacheMisses++
		}
	}

	/**
	 * Records a duplicate detection
	 */
	recordDuplicateDetected(): void {
		this.counters.duplicatesDetected++
	}

	/**
	 * Records queue wait time
	 */
	recordQueueWaitTime(waitTime: number): void {
		this.timingAccumulators.queueWaitTimes.push(waitTime)

		// Keep only recent timing data
		if (this.timingAccumulators.queueWaitTimes.length > 1000) {
			this.timingAccumulators.queueWaitTimes = this.timingAccumulators.queueWaitTimes.slice(-500)
		}
	}

	/**
	 * Gets current performance metrics
	 */
	getCurrentMetrics(): IndexingPerformanceMetrics {
		return { ...this.currentMetrics } as IndexingPerformanceMetrics
	}

	/**
	 * Gets performance history
	 */
	getPerformanceHistory(limit?: number): PerformanceTrend[] {
		const history = [...this.performanceHistory]
		return limit ? history.slice(-limit) : history
	}

	/**
	 * Gets performance trends over time
	 */
	getPerformanceTrends(
		metric: keyof IndexingPerformanceMetrics,
		timeRange: number,
	): {
		timestamps: Date[]
		values: number[]
		trend: "improving" | "declining" | "stable"
		changeRate: number
	} {
		const cutoffTime = Date.now() - timeRange
		const relevantData = this.performanceHistory
			.filter((trend) => trend.timestamp.getTime() > cutoffTime)
			.map((trend) => ({
				timestamp: trend.timestamp,
				value: trend.metrics[metric],
			}))

		if (relevantData.length < 2) {
			return {
				timestamps: [],
				values: [],
				trend: "stable",
				changeRate: 0,
			}
		}

		const timestamps = relevantData.map((d) => d.timestamp)
		const values = relevantData.map((d) => d.value)

		// Calculate trend
		const firstValue = values[0]
		const lastValue = values[values.length - 1]
		const changeRate = ((lastValue - firstValue) / firstValue) * 100

		let trend: "improving" | "declining" | "stable" = "stable"
		if (Math.abs(changeRate) > 5) {
			// 5% threshold
			// For metrics where higher is better
			const higherIsBetter = [
				"filesPerSecond",
				"blocksPerSecond",
				"bytesPerSecond",
				"successRate",
				"queueEfficiency",
				"concurrencyUtilization",
				"cacheHitRate",
				"incrementalIndexingEfficiency",
			]

			if (higherIsBetter.includes(metric)) {
				trend = changeRate > 0 ? "improving" : "declining"
			} else {
				trend = changeRate < 0 ? "improving" : "declining"
			}
		}

		return {
			timestamps,
			values,
			trend,
			changeRate,
		}
	}

	/**
	 * Gets optimization suggestions based on current performance
	 */
	getOptimizationSuggestions(): OptimizationSuggestion[] {
		if (!this.config.enableOptimizationSuggestions) {
			return []
		}

		const suggestions: OptimizationSuggestion[] = []
		const metrics = this.currentMetrics

		// Low throughput suggestions
		if (metrics.filesPerSecond && metrics.filesPerSecond < 2) {
			suggestions.push({
				id: "increase-concurrency",
				category: "configuration",
				priority: "high",
				title: "Increase Processing Concurrency",
				description: "File processing throughput is below optimal levels",
				impact: "Could improve indexing speed by 50-100%",
				implementation: "Increase maxConcurrentJobs in BackgroundIndexingService configuration",
				estimatedImprovement: 75,
			})
		}

		// High error rate suggestions
		if (metrics.errorRate && metrics.errorRate > 0.1) {
			suggestions.push({
				id: "investigate-errors",
				category: "workflow",
				priority: "critical",
				title: "Investigate High Error Rate",
				description: `Error rate is ${Math.round(metrics.errorRate * 100)}%, which is above the 10% threshold`,
				impact: "Reducing errors will improve indexing reliability and speed",
				implementation: "Check logs for common error patterns and address root causes",
				estimatedImprovement: 30,
			})
		}

		// Low cache hit rate suggestions
		if (metrics.cacheHitRate && metrics.cacheHitRate < 0.5) {
			suggestions.push({
				id: "optimize-caching",
				category: "configuration",
				priority: "medium",
				title: "Optimize Caching Strategy",
				description: `Cache hit rate is ${Math.round(metrics.cacheHitRate * 100)}%, indicating inefficient caching`,
				impact: "Better caching can reduce redundant processing by 20-40%",
				implementation: "Review cache invalidation strategy and increase cache size if needed",
				estimatedImprovement: 25,
			})
		}

		// High memory usage suggestions
		if (metrics.memoryUsage && metrics.memoryUsage > 1024 * 1024 * 1024) {
			// 1GB
			suggestions.push({
				id: "reduce-memory-usage",
				category: "resource",
				priority: "high",
				title: "Optimize Memory Usage",
				description: "Memory usage is high, which may impact system performance",
				impact: "Reducing memory usage will improve overall system stability",
				implementation: "Reduce batch sizes and implement more aggressive garbage collection",
				estimatedImprovement: 20,
			})
		}

		// Low queue efficiency suggestions
		if (metrics.queueEfficiency && metrics.queueEfficiency < 0.7) {
			suggestions.push({
				id: "optimize-queue",
				category: "workflow",
				priority: "medium",
				title: "Optimize Processing Queue",
				description: "Queue efficiency is below optimal levels",
				impact: "Better queue management can improve processing order and reduce wait times",
				implementation: "Review file prioritization logic and queue management algorithms",
				estimatedImprovement: 15,
			})
		}

		return suggestions.sort((a, b) => {
			const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
			return priorityOrder[b.priority] - priorityOrder[a.priority]
		})
	}

	/**
	 * Gets active performance alerts
	 */
	getActiveAlerts(): PerformanceAlert[] {
		return this.alerts.filter((alert) => alert.enabled)
	}

	/**
	 * Adds a custom performance alert
	 */
	addAlert(alert: Omit<PerformanceAlert, "id">): string {
		const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
		this.alerts.push({ ...alert, id })
		return id
	}

	/**
	 * Removes a performance alert
	 */
	removeAlert(alertId: string): boolean {
		const index = this.alerts.findIndex((alert) => alert.id === alertId)
		if (index >= 0) {
			this.alerts.splice(index, 1)
			return true
		}
		return false
	}

	/**
	 * Updates alert configuration
	 */
	updateAlert(alertId: string, updates: Partial<PerformanceAlert>): boolean {
		const alert = this.alerts.find((a) => a.id === alertId)
		if (alert) {
			Object.assign(alert, updates)
			return true
		}
		return false
	}

	/**
	 * Exports performance data for analysis
	 */
	exportPerformanceData(): {
		config: PerformanceMonitorConfig
		currentMetrics: IndexingPerformanceMetrics
		history: PerformanceTrend[]
		alerts: PerformanceAlert[]
		suggestions: OptimizationSuggestion[]
	} {
		return {
			config: { ...this.config },
			currentMetrics: this.getCurrentMetrics(),
			history: this.getPerformanceHistory(),
			alerts: this.alerts,
			suggestions: this.getOptimizationSuggestions(),
		}
	}

	/**
	 * Resets all performance counters and history
	 */
	reset(): void {
		this.resetCounters()
		this.performanceHistory = []
		this.currentMetrics = {}
		this.timingAccumulators = {
			fileProcessingTimes: [],
			batchProcessingTimes: [],
			queueWaitTimes: [],
		}
		this.emit("metricsReset")
	}

	// Private methods

	/**
	 * Collects current performance metrics
	 */
	private collectMetrics(): void {
		const now = Date.now()
		const timeSinceLastSample = now - this.lastSampleTime
		const totalTime = now - this.startTime

		if (timeSinceLastSample === 0) return

		// Calculate throughput metrics
		const filesPerSecond = (this.counters.filesProcessed / totalTime) * 1000
		const blocksPerSecond = (this.counters.blocksProcessed / totalTime) * 1000
		const bytesPerSecond = (this.counters.bytesProcessed / totalTime) * 1000

		// Calculate timing metrics
		const averageFileProcessingTime = this.calculateAverage(this.timingAccumulators.fileProcessingTimes)
		const averageBatchProcessingTime = this.calculateAverage(this.timingAccumulators.batchProcessingTimes)
		const averageQueueWaitTime = this.calculateAverage(this.timingAccumulators.queueWaitTimes)

		// Calculate quality metrics
		const successRate =
			this.counters.totalOperations > 0 ? this.counters.successfulOperations / this.counters.totalOperations : 1
		const errorRate =
			this.counters.totalOperations > 0 ? this.counters.failedOperations / this.counters.totalOperations : 0
		const retryRate =
			this.counters.totalOperations > 0 ? this.counters.retryOperations / this.counters.totalOperations : 0

		// Calculate cache metrics
		const totalCacheAccesses = this.counters.cacheHits + this.counters.cacheMisses
		const cacheHitRate = totalCacheAccesses > 0 ? this.counters.cacheHits / totalCacheAccesses : 0

		// Calculate other metrics
		const duplicateDetectionRate =
			this.counters.filesProcessed > 0 ? this.counters.duplicatesDetected / this.counters.filesProcessed : 0

		// Get system resource metrics (simplified - in real implementation would use system APIs)
		const memoryUsage = this.getMemoryUsage()
		const cpuUsage = this.getCpuUsage()
		const diskIORate = this.getDiskIORate()

		// Calculate efficiency metrics
		const queueEfficiency = this.calculateQueueEfficiency()
		const concurrencyUtilization = this.calculateConcurrencyUtilization()
		const incrementalIndexingEfficiency = this.calculateIncrementalIndexingEfficiency()

		this.currentMetrics = {
			filesPerSecond,
			blocksPerSecond,
			bytesPerSecond,
			averageFileProcessingTime,
			averageBatchProcessingTime,
			totalIndexingTime: totalTime,
			successRate,
			errorRate,
			retryRate,
			memoryUsage,
			cpuUsage,
			diskIORate,
			averageQueueWaitTime,
			queueEfficiency,
			concurrencyUtilization,
			cacheHitRate,
			duplicateDetectionRate,
			incrementalIndexingEfficiency,
		}

		// Add to history
		this.performanceHistory.push({
			timestamp: new Date(now),
			metrics: { ...this.currentMetrics },
			workspaceSize: this.counters.bytesProcessed,
			fileCount: this.counters.filesProcessed,
		})

		this.lastSampleTime = now
		this.emit("metricsUpdated", this.currentMetrics)

		// Send telemetry if enabled
		if (this.config.enableTelemetry) {
			this.sendTelemetry()
		}
	}

	/**
	 * Checks performance alerts
	 */
	private checkAlerts(): void {
		const metrics = this.currentMetrics

		for (const alert of this.alerts) {
			if (!alert.enabled) continue

			const metricValue = metrics[alert.metric]
			if (metricValue === undefined) continue

			let shouldAlert = false
			if (alert.condition === "above" && metricValue > alert.threshold) {
				shouldAlert = true
			} else if (alert.condition === "below" && metricValue < alert.threshold) {
				shouldAlert = true
			}

			if (shouldAlert) {
				this.emit("performanceAlert", alert, metricValue)
			}
		}
	}

	/**
	 * Cleans up old performance data
	 */
	private cleanupOldData(): void {
		const cutoffTime = Date.now() - this.config.retentionPeriod
		this.performanceHistory = this.performanceHistory.filter((trend) => trend.timestamp.getTime() > cutoffTime)
	}

	/**
	 * Sets up default performance alerts
	 */
	private setupDefaultAlerts(): void {
		this.alerts = [
			{
				id: "low-throughput",
				type: "warning",
				metric: "filesPerSecond",
				threshold: 1.0,
				condition: "below",
				message: "File processing throughput is below 1 file/second",
				enabled: true,
			},
			{
				id: "high-error-rate",
				type: "critical",
				metric: "errorRate",
				threshold: 0.1,
				condition: "above",
				message: "Error rate exceeds 10%",
				enabled: true,
			},
			{
				id: "high-memory-usage",
				type: "warning",
				metric: "memoryUsage",
				threshold: 512 * 1024 * 1024, // 512MB
				condition: "above",
				message: "Memory usage exceeds 512MB",
				enabled: true,
			},
			{
				id: "low-cache-hit-rate",
				type: "warning",
				metric: "cacheHitRate",
				threshold: 0.5,
				condition: "below",
				message: "Cache hit rate is below 50%",
				enabled: true,
			},
		]
	}

	/**
	 * Resets performance counters
	 */
	private resetCounters(): void {
		this.counters = {
			filesProcessed: 0,
			blocksProcessed: 0,
			bytesProcessed: 0,
			successfulOperations: 0,
			failedOperations: 0,
			retryOperations: 0,
			cacheHits: 0,
			cacheMisses: 0,
			duplicatesDetected: 0,
			totalOperations: 0,
		}
	}

	/**
	 * Calculates average from array of numbers
	 */
	private calculateAverage(values: number[]): number {
		if (values.length === 0) return 0
		return values.reduce((sum, val) => sum + val, 0) / values.length
	}

	/**
	 * Gets current memory usage (simplified implementation)
	 */
	private getMemoryUsage(): number {
		try {
			return process.memoryUsage().heapUsed
		} catch (error) {
			return 0
		}
	}

	/**
	 * Gets current CPU usage (simplified implementation)
	 */
	private getCpuUsage(): number {
		// In a real implementation, this would use system APIs to get actual CPU usage
		// For now, return a placeholder value
		return 0
	}

	/**
	 * Gets current disk I/O rate (simplified implementation)
	 */
	private getDiskIORate(): number {
		// In a real implementation, this would monitor actual disk I/O
		// For now, estimate based on bytes processed
		const timeSinceStart = Date.now() - this.startTime
		return timeSinceStart > 0 ? (this.counters.bytesProcessed / timeSinceStart) * 1000 : 0
	}

	/**
	 * Calculates queue efficiency
	 */
	private calculateQueueEfficiency(): number {
		// Simplified calculation based on success rate and retry rate
		const baseEfficiency =
			this.counters.totalOperations > 0 ? this.counters.successfulOperations / this.counters.totalOperations : 1
		const retryPenalty =
			this.counters.totalOperations > 0 ? this.counters.retryOperations / this.counters.totalOperations : 0

		return Math.max(0, baseEfficiency - retryPenalty * 0.5)
	}

	/**
	 * Calculates concurrency utilization
	 */
	private calculateConcurrencyUtilization(): number {
		// This would need to be integrated with the actual concurrency metrics
		// For now, return a placeholder based on throughput
		const targetThroughput = 5 // files per second
		const actualThroughput = this.currentMetrics.filesPerSecond || 0
		return Math.min(1, actualThroughput / targetThroughput)
	}

	/**
	 * Calculates incremental indexing efficiency
	 */
	private calculateIncrementalIndexingEfficiency(): number {
		// Efficiency based on cache hits and duplicate detection
		const cacheEfficiency = this.currentMetrics.cacheHitRate || 0
		const duplicateEfficiency = 1 - (this.currentMetrics.duplicateDetectionRate || 0)
		return (cacheEfficiency + duplicateEfficiency) / 2
	}

	/**
	 * Sends performance telemetry
	 */
	private sendTelemetry(): void {
		try {
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_PERFORMANCE, {
				filesPerSecond: this.currentMetrics.filesPerSecond,
				blocksPerSecond: this.currentMetrics.blocksPerSecond,
				successRate: this.currentMetrics.successRate,
				errorRate: this.currentMetrics.errorRate,
				cacheHitRate: this.currentMetrics.cacheHitRate,
				queueEfficiency: this.currentMetrics.queueEfficiency,
				memoryUsage: this.currentMetrics.memoryUsage,
				totalFiles: this.counters.filesProcessed,
				totalBlocks: this.counters.blocksProcessed,
			})
		} catch (error) {
			console.warn("[PerformanceMonitor] Failed to send telemetry:", error)
		}
	}

	/**
	 * Disposes of the performance monitor
	 */
	dispose(): void {
		this.stop()
		this.removeAllListeners()
		this.performanceHistory = []
		this.alerts = []
	}
}

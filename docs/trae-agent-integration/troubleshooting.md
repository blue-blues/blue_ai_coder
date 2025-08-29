# TRAE-Agent Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting information for the TRAE-Agent integration in BluesCode. It covers common issues, debugging techniques, performance problems, and their solutions.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Common Issues](#common-issues)
- [Performance Problems](#performance-problems)
- [Configuration Issues](#configuration-issues)
- [Integration Problems](#integration-problems)
- [Debugging Tools](#debugging-tools)
- [Error Codes](#error-codes)
- [Monitoring and Alerts](#monitoring-and-alerts)
- [Recovery Procedures](#recovery-procedures)

## Quick Diagnostics

### Health Check Script

```typescript
// Quick health check for TRAE-Agent system
async function performHealthCheck(): Promise<HealthCheckResult> {
	const results = {
		reflectionEngine: false,
		sequentialThinking: false,
		selfAssessment: false,
		toolRepetitionDetector: false,
		experimentFlags: false,
		memoryUsage: 0,
		errors: [] as string[],
	}

	try {
		// Check experiment flags
		const provider = this.providerRef.deref()
		const state = await provider?.getState()
		results.experimentFlags = state?.experiments?.enableReflection ?? false

		if (!results.experimentFlags) {
			results.errors.push("TRAE-Agent not enabled via experiment flags")
			return results
		}

		// Check reflection engine
		if (this.reflectionEngine) {
			results.reflectionEngine = this.reflectionEngine.isEngineActive()

			// Check components
			results.sequentialThinking = this.reflectionEngine.sequentialThinking?.isActive() ?? false
			results.selfAssessment = this.reflectionEngine.selfAssessment?.isActive() ?? false
			results.toolRepetitionDetector = this.reflectionEngine.toolRepetitionDetector?.isActive() ?? false
		} else {
			results.errors.push("ReflectionEngine not initialized")
		}

		// Check memory usage
		const memoryUsage = process.memoryUsage()
		results.memoryUsage = memoryUsage.heapUsed / 1024 / 1024 // MB

		if (results.memoryUsage > 100) {
			results.errors.push(`High memory usage: ${results.memoryUsage.toFixed(2)}MB`)
		}
	} catch (error) {
		results.errors.push(`Health check failed: ${error.message}`)
	}

	return results
}
```

### Quick Status Check

```bash
# Check if TRAE-Agent is running
echo "Checking TRAE-Agent status..."

# Look for reflection logs in console
grep -i "reflection\|trae-agent" /path/to/logs/bluescode.log | tail -10

# Check memory usage
ps aux | grep bluescode | awk '{print $4, $11}' | head -5

# Check for error patterns
grep -i "error\|timeout\|failed" /path/to/logs/bluescode.log | grep -i reflection | tail -5
```

## Common Issues

### Issue 1: TRAE-Agent Not Activating

**Symptoms:**

- No reflection insights appearing
- No performance assessments running
- No pattern detection warnings

**Diagnosis:**

```typescript
// Check activation status
const isEnabled = await provider.getState().then((state) => state?.experiments?.enableReflection ?? false)

console.log("TRAE-Agent enabled:", isEnabled)
console.log("ReflectionEngine exists:", !!this.reflectionEngine)
console.log("Engine active:", this.reflectionEngine?.isEngineActive())
```

**Solutions:**

1. **Enable Experiment Flag**

    ```json
    {
    	"experiments": {
    		"enableReflection": true
    	}
    }
    ```

2. **Restart BluesCode**

    - Close all BluesCode instances
    - Clear cache if necessary
    - Restart application

3. **Check Configuration**
    ```typescript
    // Verify configuration is valid
    const config = this.reflectionEngine?.getConfig()
    console.log("Current config:", config)
    ```

### Issue 2: High Memory Usage

**Symptoms:**

- Gradual memory increase over time
- System slowdown
- Out of memory errors

**Diagnosis:**

```typescript
// Monitor memory usage
const monitorMemory = () => {
	const usage = process.memoryUsage()
	console.log("Memory Usage:", {
		heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
		heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
		external: `${(usage.external / 1024 / 1024).toFixed(2)}MB`,
	})

	// Check TRAE-Agent specific memory
	const eventCount = this.reflectionEngine?.getRecentEvents().length
	const historySize = this.reflectionEngine?.getPerformanceHistory().length
	console.log("TRAE-Agent Memory:", { eventCount, historySize })
}
```

**Solutions:**

1. **Reduce History Limits**

    ```typescript
    reflectionEngine.updateConfig({
    	maxHistorySize: 200, // Reduce from default 1000
    	performanceWindowSize: 50, // Reduce from default 100
    	trendAnalysisDepth: 10, // Reduce from default 20
    })
    ```

2. **Increase Cleanup Frequency**

    ```typescript
    reflectionEngine.updateConfig({
    	cleanupInterval: 300000, // Clean up every 5 minutes
    })
    ```

3. **Manual Cleanup**

    ```typescript
    // Force cleanup
    reflectionEngine.cleanup()

    // Dispose and recreate if necessary
    reflectionEngine.dispose()
    this.reflectionEngine = createReflectionEngine(config)
    ```

### Issue 3: Slow Performance

**Symptoms:**

- Delayed responses during task execution
- Timeouts in reflection processes
- UI lag during operations

**Diagnosis:**

```typescript
// Performance monitoring
const startTime = Date.now()
const result = await reflectionEngine.reflect(context)
const duration = Date.now() - startTime

console.log(`Reflection took ${duration}ms`)

if (duration > 30000) {
	console.warn("Reflection timeout risk")
}

// Check for bottlenecks
const metrics = reflectionEngine.getPerformanceMetrics()
console.log("Performance metrics:", {
	averageReflectionTime: metrics.averageReflectionTime,
	timeoutRate: metrics.timeoutRate,
	errorRate: metrics.errorRate,
})
```

**Solutions:**

1. **Reduce Processing Load**

    ```typescript
    reflectionEngine.updateConfig({
    	maxReasoningSteps: 5, // Reduce from default 10
    	assessmentInterval: 600000, // Increase to 10 minutes
    	maxConcurrentReflections: 1, // Limit concurrency
    	timeoutMs: 15000, // Shorter timeout
    })
    ```

2. **Optimize Component Settings**

    ```typescript
    // Disable resource-intensive features temporarily
    reflectionEngine.updateConfig({
    	enableSelfAssessment: false, // Disable if not critical
    	enableSemanticDetection: false, // Disable semantic analysis
    	enableContextualAnalysis: false, // Disable context analysis
    })
    ```

3. **System-Level Optimizations**
    ```typescript
    // Use lightweight configuration
    const lightweightConfig = {
    	enableSequentialThinking: true,
    	enableSelfAssessment: false,
    	maxReasoningSteps: 3,
    	performanceWindowSize: 25,
    	memoryLimitMB: 15,
    }
    ```

### Issue 4: False Positive Pattern Detection

**Symptoms:**

- Too many repetition warnings
- Incorrect pattern identification
- Blocking of legitimate tool usage

**Diagnosis:**

```typescript
// Analyze detection accuracy
const recentPatterns = toolRepetitionDetector.getDetectedPatterns(10)
recentPatterns.forEach((pattern) => {
	console.log("Pattern:", {
		type: pattern.type,
		confidence: pattern.confidence,
		strength: pattern.strength,
		toolsInvolved: pattern.toolsInvolved.length,
		description: pattern.description,
	})
})
```

**Solutions:**

1. **Adjust Detection Thresholds**

    ```typescript
    reflectionEngine.updateConfig({
    	patternDetectionThreshold: 0.9, // Increase from 0.7
    	semanticSimilarityThreshold: 0.9, // Increase from 0.8
    	repetitionCountThreshold: 5, // Increase from 3
    })
    ```

2. **Fine-tune Detection Types**

    ```typescript
    toolRepetitionDetector.updateConfig({
    	enableCyclicDetection: false, // Disable if problematic
    	enableSemanticDetection: false, // Disable if too sensitive
    	enableConsecutiveDetection: true, // Keep basic detection
    	contextSimilarityThreshold: 0.9, // Higher context threshold
    })
    ```

3. **Whitelist Legitimate Patterns**
    ```typescript
    // Add pattern exceptions
    toolRepetitionDetector.addPatternException({
    	toolName: "read_file",
    	maxConsecutive: 10, // Allow more consecutive reads
    	reason: "Legitimate file analysis workflow",
    })
    ```

### Issue 5: Missing Important Insights

**Symptoms:**

- No reflection insights generated
- Missing performance recommendations
- Lack of improvement suggestions

**Diagnosis:**

```typescript
// Check insight generation
const recentReflections = reflectionEngine.getRecentEvents(10).filter((event) => event.type === "reflection_insight")

console.log("Recent insights:", recentReflections.length)

if (recentReflections.length === 0) {
	console.log("No insights generated - checking components...")
	console.log("Sequential thinking active:", sequentialThinking.isActive())
	console.log("Self assessment active:", selfAssessment.isActive())
}
```

**Solutions:**

1. **Lower Detection Thresholds**

    ```typescript
    reflectionEngine.updateConfig({
    	patternDetectionThreshold: 0.5, // Lower from 0.7
    	semanticSimilarityThreshold: 0.6, // Lower from 0.8
    	minConfidenceThreshold: 0.3, // Lower confidence requirement
    })
    ```

2. **Increase Analysis Depth**

    ```typescript
    reflectionEngine.updateConfig({
    	maxReasoningSteps: 12, // Increase from 10
    	analysisWindowSize: 30, // Increase from 20
    	trendAnalysisDepth: 30, // Increase from 20
    })
    ```

3. **Enable All Components**
    ```typescript
    reflectionEngine.updateConfig({
    	enableSequentialThinking: true,
    	enableSelfAssessment: true,
    	enableRecommendations: true,
    	requireAllSteps: false, // Don't require all steps
    	allowStepSkipping: false, // Don't skip steps
    })
    ```

## Performance Problems

### CPU Usage Issues

**Symptoms:**

- High CPU usage by BluesCode process
- System responsiveness issues
- Fan noise increase

**Solutions:**

1. **Limit Processing Frequency**

    ```typescript
    const cpuFriendlyConfig = {
    	assessmentInterval: 900000, // 15 minutes
    	cleanupInterval: 1800000, // 30 minutes
    	maxConcurrentReflections: 1,
    	maxActiveChains: 1,
    	timeoutMs: 10000, // Shorter timeout
    }
    ```

2. **Reduce Analysis Complexity**
    ```typescript
    const simplifiedConfig = {
    	maxReasoningSteps: 3,
    	analysisWindowSize: 10,
    	performanceWindowSize: 25,
    	enableSemanticDetection: false,
    	enableContextualAnalysis: false,
    }
    ```

### Memory Leak Detection

**Diagnostic Script:**

```typescript
class MemoryLeakDetector {
	private baseline: number = 0
	private samples: number[] = []

	startMonitoring() {
		this.baseline = process.memoryUsage().heapUsed

		setInterval(() => {
			const current = process.memoryUsage().heapUsed
			this.samples.push(current)

			// Keep last 20 samples
			if (this.samples.length > 20) {
				this.samples.shift()
			}

			// Check for consistent growth
			if (this.samples.length >= 10) {
				const trend = this.calculateTrend()
				if (trend > 1024 * 1024) {
					// 1MB growth trend
					console.warn("Potential memory leak detected:", {
						baseline: `${(this.baseline / 1024 / 1024).toFixed(2)}MB`,
						current: `${(current / 1024 / 1024).toFixed(2)}MB`,
						trend: `${(trend / 1024 / 1024).toFixed(2)}MB/minute`,
					})
				}
			}
		}, 60000) // Check every minute
	}

	private calculateTrend(): number {
		if (this.samples.length < 2) return 0

		const recent = this.samples.slice(-10)
		const slope = (recent[recent.length - 1] - recent[0]) / recent.length
		return slope * 60 // Per minute trend
	}
}
```

### Network-Related Issues

**Symptoms:**

- Slow semantic analysis
- Timeouts during reflection
- Intermittent failures

**Solutions:**

1. **Disable Network-Dependent Features**

    ```typescript
    const offlineConfig = {
    	enableSemanticDetection: false, // May require network
    	enableContextualAnalysis: true, // Uses local context
    	timeoutMs: 5000, // Shorter timeout
    	maxRetries: 1, // Fewer retries
    }
    ```

2. **Implement Offline Fallbacks**
    ```typescript
    // Configure fallback behavior
    reflectionEngine.updateConfig({
    	fallbackToLocalAnalysis: true,
    	networkTimeoutMs: 3000,
    	enableOfflineMode: true,
    })
    ```

## Configuration Issues

### Invalid Configuration Detection

```typescript
function validateConfiguration(config: ReflectionConfig): ValidationResult {
	const issues: string[] = []
	const warnings: string[] = []

	// Check required fields
	if (config.maxReasoningSteps < 1 || config.maxReasoningSteps > 20) {
		issues.push("maxReasoningSteps must be between 1 and 20")
	}

	if (config.memoryLimitMB < 5) {
		issues.push("memoryLimitMB too low, minimum is 5MB")
	}

	if (config.timeoutMs < 1000) {
		issues.push("timeoutMs too low, minimum is 1000ms")
	}

	// Check for performance issues
	if (config.assessmentInterval < 60000) {
		warnings.push("Very frequent assessment may impact performance")
	}

	if (config.maxReasoningSteps > 15) {
		warnings.push("High reasoning steps may cause timeouts")
	}

	// Check for logical inconsistencies
	if (!config.enableSequentialThinking && !config.enableSelfAssessment) {
		issues.push("At least one component must be enabled")
	}

	return { isValid: issues.length === 0, issues, warnings }
}
```

### Configuration Reset

```typescript
// Reset to safe defaults
function resetToSafeConfiguration(): Refl
recommendations: this.generateRecommendations(engine)
        }
    }

    private static generateRecommendations(engine: ReflectionEngine): string[] {
        const recommendations: string[] = []
        const metrics = engine.getPerformanceMetrics()

        if (metrics.averageReflectionTime > 20000) {
            recommendations.push('Consider reducing maxReasoningSteps to improve performance')
        }

        if (metrics.errorRate > 0.1) {
            recommendations.push('High error rate detected - check configuration and system resources')
        }

        if (metrics.memoryUsage > 80) {
            recommendations.push('Memory usage high - consider increasing cleanup frequency')
        }

        return recommendations
    }
}
```

## Recovery Procedures

### Automatic Recovery

```typescript
class TRAERecoveryManager {
	private recoveryStrategies = [
		this.resetToSafeConfig,
		this.clearHistoryAndRestart,
		this.disableNonEssentialFeatures,
		this.restartReflectionEngine,
	]

	async attemptRecovery(error: TRAEError, engine: ReflectionEngine): Promise<boolean> {
		console.log(`[Recovery] Attempting recovery for error: ${error.code}`)

		for (const strategy of this.recoveryStrategies) {
			try {
				await strategy(engine, error)

				// Test if recovery was successful
				const testResult = await this.testRecovery(engine)
				if (testResult.success) {
					console.log(`[Recovery] Successfully recovered using strategy: ${strategy.name}`)
					return true
				}
			} catch (recoveryError) {
				console.warn(`[Recovery] Strategy ${strategy.name} failed:`, recoveryError.message)
			}
		}

		console.error("[Recovery] All recovery strategies failed")
		return false
	}

	private async resetToSafeConfig(engine: ReflectionEngine): Promise<void> {
		const safeConfig = {
			enableSequentialThinking: true,
			enableSelfAssessment: false,
			maxReasoningSteps: 3,
			assessmentInterval: 900000,
			memoryLimitMB: 20,
			timeoutMs: 10000,
		}

		engine.updateConfig(safeConfig)
	}

	private async clearHistoryAndRestart(engine: ReflectionEngine): Promise<void> {
		engine.cleanup()
		engine.clearHistory()

		// Wait a moment for cleanup
		await new Promise((resolve) => setTimeout(resolve, 1000))

		engine.restart()
	}

	private async disableNonEssentialFeatures(engine: ReflectionEngine): Promise<void> {
		engine.updateConfig({
			enableSelfAssessment: false,
			enableSemanticDetection: false,
			enableContextualAnalysis: false,
			maxConcurrentReflections: 1,
		})
	}

	private async restartReflectionEngine(engine: ReflectionEngine): Promise<void> {
		const config = engine.getConfig()
		engine.dispose()

		// Create new instance
		const newEngine = createReflectionEngine(config)

		// Replace in task (this would need to be implemented)
		// this.reflectionEngine = newEngine
	}

	private async testRecovery(engine: ReflectionEngine): Promise<{ success: boolean; error?: string }> {
		try {
			// Simple test reflection
			const testContext = {
				taskId: "recovery-test",
				currentStep: 1,
				totalSteps: 5,
				recentTools: [],
				recentErrors: [],
				performance: { taskCompletionRate: 1.0, errorRate: 0, efficiencyScore: 1.0 },
				environment: {},
			}

			const result = await Promise.race([
				engine.reflect(testContext),
				new Promise((_, reject) => setTimeout(() => reject(new Error("Test timeout")), 5000)),
			])

			return { success: true }
		} catch (error) {
			return { success: false, error: error.message }
		}
	}
}
```

### Manual Recovery Steps

#### Step 1: Basic Recovery

```bash
# Stop BluesCode
pkill -f bluescode

# Clear temporary files
rm -rf ~/.bluescode/temp/reflection*

# Restart with safe mode
bluescode --safe-mode --disable-reflection
```

#### Step 2: Configuration Reset

```typescript
// Reset TRAE-Agent to minimal configuration
const emergencyConfig = {
	enableSequentialThinking: true,
	enableSelfAssessment: false,
	maxReasoningSteps: 1,
	assessmentInterval: 3600000, // 1 hour
	patternDetectionThreshold: 0.95,
	memoryLimitMB: 10,
	timeoutMs: 5000,
}

// Apply emergency configuration
reflectionEngine.updateConfig(emergencyConfig)
```

#### Step 3: Complete Reinstallation

```bash
# Backup current configuration
cp ~/.bluescode/config.json ~/.bluescode/config.json.backup

# Remove TRAE-Agent specific configuration
sed -i '/enableReflection/d' ~/.bluescode/config.json

# Restart BluesCode
bluescode --reset-experiments
```

## Emergency Procedures

### System Unresponsive

1. **Force termination**:

    ```bash
    kill -9 $(pgrep -f bluescode)
    ```

2. **Clear all reflection data**:

    ```bash
    rm -rf ~/.bluescode/reflection/
    rm -rf ~/.bluescode/temp/trae-*
    ```

3. **Start in safe mode**:
    ```bash
    bluescode --safe-mode --no-experiments
    ```

### Memory Exhaustion

1. **Immediate cleanup**:

    ```typescript
    // Emergency memory cleanup
    reflectionEngine.dispose()
    global.gc?.() // Force garbage collection if available
    ```

2. **Restart with minimal configuration**:
    ```typescript
    const minimalConfig = {
    	enableSequentialThinking: false,
    	enableSelfAssessment: false,
    	maxHistorySize: 10,
    	memoryLimitMB: 5,
    }
    ```

### Configuration Corruption

1. **Reset to defaults**:

    ```bash
    # Remove corrupted configuration
    rm ~/.bluescode/experiments.json

    # Restart with defaults
    bluescode --reset-config
    ```

2. **Manual configuration repair**:
    ```json
    {
    	"experiments": {
    		"enableReflection": false
    	}
    }
    ```

## Diagnostic Commands

### System Information Collection

```bash
#!/bin/bash
# TRAE-Agent diagnostic script

echo "=== TRAE-Agent Diagnostic Report ==="
echo "Timestamp: $(date)"
echo ""

echo "=== System Information ==="
echo "OS: $(uname -a)"
echo "Node.js: $(node --version)"
echo "Memory: $(free -h | head -2)"
echo "CPU: $(nproc) cores"
echo ""

echo "=== BluesCode Process ==="
ps aux | grep bluescode | head -5
echo ""

echo "=== Memory Usage ==="
echo "BluesCode memory usage:"
ps -p $(pgrep bluescode) -o pid,vsz,rss,comm
echo ""

echo "=== Log Analysis ==="
echo "Recent TRAE-Agent logs:"
tail -20 ~/.bluescode/logs/main.log | grep -i "trae\|reflection"
echo ""

echo "=== Configuration Status ==="
echo "Experiment flags:"
grep -A 5 -B 5 "enableReflection" ~/.bluescode/config.json
echo ""

echo "=== Error Summary ==="
echo "Recent errors:"
tail -50 ~/.bluescode/logs/error.log | grep -i "trae\|reflection" | tail -10
```

### Performance Analysis

```typescript
// Performance analysis script
async function analyzePerformance(): Promise<PerformanceAnalysis> {
	const analysis = {
		timestamp: Date.now(),
		reflection: {
			totalCount: 0,
			successRate: 0,
			averageTime: 0,
			timeoutRate: 0,
		},
		memory: {
			current: process.memoryUsage(),
			peak: 0,
			trend: "stable" as "increasing" | "decreasing" | "stable",
		},
		recommendations: [] as string[],
	}

	// Analyze reflection performance
	if (reflectionEngine) {
		analysis.reflection.totalCount = reflectionEngine.getReflectionCount()
		analysis.reflection.successRate = reflectionEngine.getSuccessRate()
		analysis.reflection.averageTime = reflectionEngine.getAverageReflectionTime()
		analysis.reflection.timeoutRate = reflectionEngine.getTimeoutRate()
	}

	// Generate recommendations
	if (analysis.reflection.averageTime > 30000) {
		analysis.recommendations.push("Consider reducing maxReasoningSteps")
	}

	if (analysis.reflection.successRate < 0.8) {
		analysis.recommendations.push("Check system resources and configuration")
	}

	if (analysis.memory.current.heapUsed > 100 * 1024 * 1024) {
		analysis.recommendations.push("High memory usage - consider cleanup")
	}

	return analysis
}
```

## Support Resources

### Logging Configuration

```typescript
// Enhanced logging for troubleshooting
const loggingConfig = {
	level: "debug",
	categories: {
		"trae-agent": "debug",
		reflection: "debug",
		performance: "info",
		errors: "error",
	},
	outputs: [
		{
			type: "console",
			level: "info",
		},
		{
			type: "file",
			filename: "trae-agent.log",
			level: "debug",
			maxSize: "10MB",
			maxFiles: 5,
		},
	],
}
```

### Contact Information

For additional support:

- **Documentation**: See [Developer Guide](./developer-guide.md) for technical details
- **Configuration**: See [Configuration Guide](./configuration.md) for setup options
- **Examples**: See [Examples](./examples.md) for usage scenarios
- **Issues**: Check existing issues or create new ones in the project repository

### Common Support Scenarios

1. **Performance Issues**: Start with [Performance Problems](#performance-problems) section
2. **Configuration Problems**: See [Configuration Issues](#configuration-issues) section
3. **Integration Failures**: Check [Integration Problems](#integration-problems) section
4. **Memory/Resource Issues**: Follow [Recovery Procedures](#recovery-procedures)

---

**Remember**: When reporting issues, always include:

- TRAE-Agent configuration
- System specifications
- Error logs and codes
- Steps to reproduce
- Expected vs actual behavior

This troubleshooting guide covers the most common scenarios. For complex issues, consider using the diagnostic tools and recovery procedures outlined above.

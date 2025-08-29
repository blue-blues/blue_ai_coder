# TRAE-Agent Configuration Guide

## Overview

This guide provides comprehensive documentation for configuring the TRAE-Agent integration in BluesCode. The system offers flexible configuration options to optimize performance for different environments and use cases.

## Table of Contents

- [Experiment Flags](#experiment-flags)
- [Core Configuration](#core-configuration)
- [Component-Specific Settings](#component-specific-settings)
- [Environment-Based Configurations](#environment-based-configurations)
- [Performance Tuning](#performance-tuning)
- [Advanced Options](#advanced-options)
- [Configuration Examples](#configuration-examples)

## Experiment Flags

TRAE-Agent features are controlled through experiment flags in the BluesCode provider state:

### Primary Flags

```typescript
interface ExperimentFlags {
	// Main feature control
	enableReflection?: boolean // Enable TRAE-Agent system (default: false)

	// UI integration
	showReflectionInsights?: boolean // Show insights to users (default: false)

	// Development flags
	enableReflectionDebug?: boolean // Enable debug logging (default: false)
	enablePerformanceMetrics?: boolean // Track detailed metrics (default: true)
}
```

### Configuration in Provider State

```json
{
	"experiments": {
		"enableReflection": true,
		"showReflectionInsights": true,
		"enableReflectionDebug": false,
		"enablePerformanceMetrics": true
	}
}
```

### Flag Descriptions

| Flag                       | Purpose                      | Impact                              | Default |
| -------------------------- | ---------------------------- | ----------------------------------- | ------- |
| `enableReflection`         | Master switch for TRAE-Agent | Enables all reflection capabilities | `false` |
| `showReflectionInsights`   | User-visible insights        | Shows reflection insights in UI     | `false` |
| `enableReflectionDebug`    | Debug logging                | Verbose console output              | `false` |
| `enablePerformanceMetrics` | Metrics tracking             | Detailed performance monitoring     | `true`  |

## Core Configuration

### ReflectionConfig Interface

```typescript
interface ReflectionConfig {
	// Component toggles
	enableSequentialThinking: boolean // Enable 5-step reasoning (default: true)
	enableSelfAssessment: boolean // Enable performance assessment (default: true)

	// Processing limits
	maxReasoningSteps: number // Max steps per reasoning chain (default: 10)
	maxHistorySize: number // Max events to retain (default: 1000)

	// Timing intervals
	assessmentInterval: number // Assessment frequency in ms (default: 300000)
	cleanupInterval: number // Cleanup frequency in ms (default: 600000)

	// Detection thresholds
	patternDetectionThreshold: number // Pattern confidence threshold (default: 0.7)
	semanticSimilarityThreshold: number // Semantic similarity threshold (default: 0.8)
	repetitionCountThreshold: number // Min repetitions to flag (default: 3)

	// Performance settings
	performanceWindowSize: number // Metrics window size (default: 100)
	maxConcurrentReflections: number // Max concurrent reflections (default: 1)

	// Resource management
	memoryLimitMB: number // Memory usage limit (default: 50)
	timeoutMs: number // Reflection timeout (default: 30000)
}
```

### Default Configuration

```typescript
const defaultConfig: ReflectionConfig = {
	enableSequentialThinking: true,
	enableSelfAssessment: true,
	maxReasoningSteps: 10,
	maxHistorySize: 1000,
	assessmentInterval: 300000, // 5 minutes
	cleanupInterval: 600000, // 10 minutes
	patternDetectionThreshold: 0.7,
	semanticSimilarityThreshold: 0.8,
	repetitionCountThreshold: 3,
	performanceWindowSize: 100,
	maxConcurrentReflections: 1,
	memoryLimitMB: 50,
	timeoutMs: 30000, // 30 seconds
}
```

## Component-Specific Settings

### SequentialThinking Configuration

```typescript
interface SequentialThinkingConfig {
	// Reasoning control
	maxReasoningSteps: number // Max steps per chain (default: 10)
	minConfidenceThreshold: number // Min confidence to proceed (default: 0.5)

	// Chain management
	maxActiveChains: number // Max concurrent reasoning chains (default: 3)
	chainTimeoutMs: number // Chain processing timeout (default: 15000)

	// Step configuration
	enableObservation: boolean // Enable observation step (default: true)
	enableAnalysis: boolean // Enable analysis step (default: true)
	enableHypothesis: boolean // Enable hypothesis step (default: true)
	enableDecision: boolean // Enable decision step (default: true)
	enableReflection: boolean // Enable reflection step (default: true)

	// Quality control
	requireAllSteps: boolean // Require all 5 steps (default: false)
	allowStepSkipping: boolean // Allow skipping low-value steps (default: true)
}
```

### SelfAssessment Configuration

```typescript
interface SelfAssessmentConfig {
	// Assessment frequency
	assessmentInterval: number // How often to assess (default: 300000)
	continuousAssessment: boolean // Real-time vs interval-based (default: false)

	// Metrics calculation
	performanceWindowSize: number // Window for metrics (default: 100)
	trendAnalysisDepth: number // Depth of trend analysis (default: 20)

	// Thresholds
	lowPerformanceThreshold: number // Performance alert threshold (default: 0.6)
	highErrorRateThreshold: number // Error rate alert threshold (default: 0.15)

	// Assessment components
	enableTaskCompletionTracking: boolean // Track completion rates (default: true)
	enableErrorRateTracking: boolean // Track error rates (default: true)
	enableEfficiencyTracking: boolean // Track efficiency (default: true)
	enableAdaptabilityTracking: boolean // Track adaptability (default: true)

	// Recommendations
	enableRecommendations: boolean // Generate recommendations (default: true)
	maxRecommendations: number // Max recommendations per assessment (default: 5)
}
```

### ToolRepetitionDetector Configuration

```typescript
interface ToolRepetitionDetectorConfig {
	// Detection parameters
	patternDetectionThreshold: number // Pattern confidence threshold (default: 0.7)
	semanticSimilarityThreshold: number // Semantic similarity threshold (default: 0.8)
	repetitionCountThreshold: number // Min repetitions to flag (default: 3)

	// Analysis depth
	analysisWindowSize: number // Tools to analyze (default: 20)
	maxPatternLength: number // Max pattern length (default: 10)

	// Pattern types
	enableConsecutiveDetection: boolean // Detect consecutive repetition (default: true)
	enableCyclicDetection: boolean // Detect cyclic patterns (default: true)
	enableSemanticDetection: boolean // Detect semantic similarity (default: true)

	// Context analysis
	enableContextualAnalysis: boolean // Consider context (default: true)
	contextSimilarityThreshold: number // Context similarity threshold (default: 0.7)

	// Response configuration
	blockRepetitiveActions: boolean // Block detected repetitions (default: false)
	warnOnRepetition: boolean // Warn on repetition (default: true)
	logRepetitionPatterns: boolean // Log patterns (default: true)
}
```

## Environment-Based Configurations

### Development Environment

```typescript
const developmentConfig: ReflectionConfig = {
	enableSequentialThinking: true,
	enableSelfAssessment: true,
	maxReasoningSteps: 8,
	assessmentInterval: 180000, // 3 minutes - more frequent
	patternDetectionThreshold: 0.6, // More sensitive
	semanticSimilarityThreshold: 0.7, // More sensitive
	performanceWindowSize: 50,
	memoryLimitMB: 100, // Higher limit for dev
	timeoutMs: 45000, // Longer timeout for debugging
}
```

### Production Environment

```typescript
const productionConfig: ReflectionConfig = {
	enableSequentialThinking: true,
	enableSelfAssessment: true,
	maxReasoningSteps: 6, // Reduced for performance
	assessmentInterval: 600000, // 10 minutes - less frequent
	patternDetectionThreshold: 0.8, // More conservative
	semanticSimilarityThreshold: 0.85, // More conservative
	performanceWindowSize: 200,
	memoryLimitMB: 30, // Stricter limit
	timeoutMs: 15000, // Shorter timeout
}
```

### High-Performance Environment

```typescript
const highPerformanceConfig: ReflectionConfig = {
	enableSequentialThinking: true,
	enableSelfAssessment: true,
	maxReasoningSteps: 12, // More detailed reasoning
	assessmentInterval: 120000, // 2 minutes - very frequent
	patternDetectionThreshold: 0.9, // Very precise
	semanticSimilarityThreshold: 0.9, // Very precise
	performanceWindowSize: 500, // Large window
	memoryLimitMB: 200, // High limit
	timeoutMs: 60000, // Generous timeout
	maxConcurrentReflections: 3, // Multiple concurrent reflections
}
```

### Resource-Constrained Environment

```typescript
const lightweightConfig: ReflectionConfig = {
	enableSequentialThinking: true,
	enableSelfAssessment: false, // Disable to save resources
	maxReasoningSteps: 3, // Minimal reasoning
	assessmentInterval: 1800000, // 30 minutes - infrequent
	patternDetectionThreshold: 0.5, // Less strict
	semanticSimilarityThreshold: 0.6, // Less strict
	performanceWindowSize: 25, // Small window
	memoryLimitMB: 15, // Very strict limit
	timeoutMs: 5000, // Short timeout
	maxHistorySize: 100, // Minimal history
}
```

## Performance Tuning

### CPU Optimization

```typescript
const cpuOptimizedConfig: Partial<ReflectionConfig> = {
	// Reduce processing frequency
	assessmentInterval: 900000, // 15 minutes
	cleanupInterval: 1800000, // 30 minutes

	// Limit concurrent operations
	maxConcurrentReflections: 1,
	maxActiveChains: 1,

	// Reduce analysis depth
	maxReasoningSteps: 5,
	analysisWindowSize: 10,
	performanceWindowSize: 50,

	// Shorter timeouts
	timeoutMs: 10000,
	chainTimeoutMs: 5000,
}
```

### Memory Optimization

```typescript
const memoryOptimizedConfig: Partial<ReflectionConfig> = {
	// Strict memory limits
	memoryLimitMB: 20,
	maxHistorySize: 200,
	performanceWindowSize: 30,

	// Frequent cleanup
	cleanupInterval: 300000, // 5 minutes

	// Reduce retention
	trendAnalysisDepth: 10,
	maxPatternLength: 5,

	// Disable memory-intensive features
	enableContextualAnalysis: false,
	continuousAssessment: false,
}
```

### Network Optimization

```typescript
const networkOptimizedConfig: Partial<ReflectionConfig> = {
	// Reduce network-dependent operations
	semanticSimilarityThreshold: 0.9, // Reduce semantic analysis
	enableSemanticDetection: false, // Disable if network-dependent

	// Batch operations
	assessmentInterval: 600000, // Batch assessments

	// Local processing preference
	enableContextualAnalysis: true, // Prefer local context analysis
	requireAllSteps: false, // Allow incomplete processing
}
```

## Advanced Options

### Custom Metrics Configuration

```typescript
interface CustomMetricsConfig {
	// Custom performance indicators
	customMetrics: {
		[key: string]: {
			calculator: (context: ReflectionContext) => number
			weight: number
			threshold: number
		}
	}

	// Metric aggregation
	aggregationMethod: "average" | "weighted" | "median"
	normalizationMethod: "minmax" | "zscore" | "none"
}
```

### Plugin Configuration

```typescript
interface PluginConfig {
	// Plugin management
	enabledPlugins: string[]
	pluginTimeout: number

	// Plugin-specific settings
	pluginConfigs: {
		[pluginName: string]: Record<string, unknown>
	}

	// Plugin lifecycle
	autoLoadPlugins: boolean
	pluginLoadTimeout: number
}
```

### Event System Configuration

```typescript
interface EventConfig {
	// Event handling
	maxEventListeners: number // Max listeners per event (default: 10)
	eventBufferSize: number // Event buffer size (default: 1000)

	// Event filtering
	enableEventFiltering: boolean // Filter low-priority events (default: true)
	eventPriorityThreshold: "low" | "medium" | "high"

	// Event persistence
	persistEvents: boolean // Persist events to storage (default: false)
	eventRetentionDays: number // Days to retain events (default: 7)
}
```

## Configuration Examples

### Example 1: Balanced Configuration

```typescript
const balancedConfig: ReflectionConfig = {
	enableSequentialThinking: true,
	enableSelfAssessment: true,
	maxReasoningSteps: 8,
	assessmentInterval: 300000,
	patternDetectionThreshold: 0.75,
	semanticSimilarityThreshold: 0.8,
	performanceWindowSize: 150,
	memoryLimitMB: 40,
	timeoutMs: 20000,

	// Component-specific
	sequentialThinking: {
		maxActiveChains: 2,
		requireAllSteps: false,
		allowStepSkipping: true,
	},

	selfAssessment: {
		continuousAssessment: false,
		enableRecommendations: true,
		maxRecommendations: 3,
	},

	toolRepetitionDetector: {
		enableCyclicDetection: true,
		enableSemanticDetection: true,
		warnOnRepetition: true,
		blockRepetitiveActions: false,
	},
}
```

### Example 2: Debug Configuration

```typescript
const debugConfig: ReflectionConfig = {
	...balancedConfig,

	// Enhanced debugging
	timeoutMs: 60000, // Long timeout for debugging
	maxHistorySize: 2000, // Keep more history

	// Verbose analysis
	maxReasoningSteps: 15,
	analysisWindowSize: 50,
	trendAnalysisDepth: 30,

	// Lower thresholds for more detection
	patternDetectionThreshold: 0.5,
	semanticSimilarityThreshold: 0.6,

	// Enable all features
	enableContextualAnalysis: true,
	enableRecommendations: true,
	logRepetitionPatterns: true,
}
```

### Example 3: Minimal Configuration

```typescript
const minimalConfig: ReflectionConfig = {
	enableSequentialThinking: true,
	enableSelfAssessment: false, // Disabled to minimize overhead
	maxReasoningSteps: 3,
	assessmentInterval: 1800000, // 30 minutes
	patternDetectionThreshold: 0.8,
	semanticSimilarityThreshold: 0.9,
	performanceWindowSize: 25,
	memoryLimitMB: 15,
	timeoutMs: 5000,

	// Minimal component settings
	sequentialThinking: {
		maxActiveChains: 1,
		requireAllSteps: false,
		allowStepSkipping: true,
		enableObservation: true,
		enableAnalysis: false, // Skip analysis for speed
		enableHypothesis: false, // Skip hypothesis for speed
		enableDecision: true,
		enableReflection: false, // Skip reflection for speed
	},

	toolRepetitionDetector: {
		enableCyclicDetection: false,
		enableSemanticDetection: false,
		enableConsecutiveDetection: true, // Only basic detection
		warnOnRepetition: false,
		blockRepetitiveActions: false,
	},
}
```

## Dynamic Configuration

### Runtime Configuration Updates

```typescript
// Update configuration at runtime
reflectionEngine.updateConfig({
	assessmentInterval: 180000, // Change to 3 minutes
	patternDetectionThreshold: 0.8, // Increase threshold
})

// Component-specific updates
sequentialThinking.updateConfig({
	maxReasoningSteps: 6,
})

selfAssessment.updateConfig({
	performanceWindowSize: 200,
})
```

### Environment-Based Auto-Configuration

```typescript
function getEnvironmentConfig(): ReflectionConfig {
	const environment = process.env.NODE_ENV || "development"
	const memoryLimit = parseInt(process.env.REFLECTION_MEMORY_LIMIT || "50")
	const cpuCount = require("os").cpus().length

	switch (environment) {
		case "production":
			return {
				...productionConfig,
				memoryLimitMB: Math.min(memoryLimit, 30),
				maxConcurrentReflections: Math.max(1, Math.floor(cpuCount / 2)),
			}

		case "development":
			return {
				...developmentConfig,
				memoryLimitMB: memoryLimit,
				maxConcurrentReflections: cpuCount,
			}

		case "test":
			return {
				...minimalConfig,
				timeoutMs: 1000, // Fast tests
				assessmentInterval: 10000, // Quick assessment for tests
			}

		default:
			return defaultConfig
	}
}
```

### Adaptive Configuration

```typescript
class AdaptiveConfigManager {
	private baseConfig: ReflectionConfig
	private performanceHistory: PerformanceMetrics[] = []

	constructor(baseConfig: ReflectionConfig) {
		this.baseConfig = baseConfig
	}

	adaptConfiguration(currentMetrics: PerformanceMetrics): Partial<ReflectionConfig> {
		const adaptations: Partial<ReflectionConfig> = {}

		// Adapt based on error rate
		if (currentMetrics.errorRate > 0.2) {
			adaptations.maxReasoningSteps = Math.min(15, this.baseConfig.maxReasoningSteps + 2)
			adaptations.patternDetectionThreshold = Math.max(0.5, this.baseConfig.patternDetectionThreshold - 0.1)
		}

		// Adapt based on efficiency
		if (currentMetrics.efficiencyScore < 0.6) {
			adaptations.assessmentInterval = Math.max(60000, this.baseConfig.assessmentInterval - 60000)
		}

		// Adapt based on memory usage
		const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024
		if (memoryUsage > this.baseConfig.memoryLimitMB * 0.8) {
			adaptations.maxHistorySize = Math.max(100, Math.floor(this.baseConfig.maxHistorySize * 0.8))
			adaptations.performanceWindowSize = Math.max(25, Math.floor(this.baseConfig.performanceWindowSize * 0.8))
		}

		return adaptations
	}
}
```

## Configuration Validation

### Schema Validation

```typescript
import Joi from "joi"

const reflectionConfigSchema = Joi.object({
	enableSequentialThinking: Joi.boolean().default(true),
	enableSelfAssessment: Joi.boolean().default(true),
	maxReasoningSteps: Joi.number().integer().min(1).max(20).default(10),
	maxHistorySize: Joi.number().integer().min(10).max(10000).default(1000),
	assessmentInterval: Joi.number().integer().min(10000).default(300000),
	cleanupInterval: Joi.number().integer().min(30000).default(600000),
	patternDetectionThreshold: Joi.number().min(0).max(1).default(0.7),
	semanticSimilarityThreshold: Joi.number().min(0).max(1).default(0.8),
	repetitionCountThreshold: Joi.number().integer().min(1).max(10).default(3),
	performanceWindowSize: Joi.number().integer().min(10).max(1000).default(100),
	maxConcurrentReflections: Joi.number().integer().min(1).max(10).default(1),
	memoryLimitMB: Joi.number().integer().min(5).max(1000).default(50),
	timeoutMs: Joi.number().integer().min(1000).max(300000).default(30000),
})

function validateConfig(config: Partial<ReflectionConfig>): ReflectionConfig {
	const { error, value } = reflectionConfigSchema.validate(config)

	if (error) {
		throw new Error(`Configuration validation failed: ${error.details[0].message}`)
	}

	return value
}
```

### Configuration Health Check

```typescript
function validateConfigurationHealth(config: ReflectionConfig): {
	isValid: boolean
	warnings: string[]
	errors: string[]
} {
	const warnings: string[] = []
	const errors: string[] = []

	// Check for performance issues
	if (config.assessmentInterval < 60000) {
		warnings.push("Assessment interval < 1 minute may impact performance")
	}

	if (config.maxReasoningSteps > 15) {
		warnings.push("High reasoning steps may cause timeouts")
	}

	if (config.memoryLimitMB < 10) {
		warnings.push("Very low memory limit may cause frequent cleanup")
	}

	// Check for logical inconsistencies
	if (!config.enableSequentialThinking && !config.enableSelfAssessment) {
		errors.push("At least one component must be enabled")
	}

	if (config.timeoutMs < config.assessmentInterval / 10) {
		errors.push("Timeout too short for assessment interval")
	}

	if (config.maxConcurrentReflections > 5) {
		warnings.push("High concurrent reflections may overwhelm system")
	}

	return {
		isValid: errors.length === 0,
		warnings,
		errors,
	}
}
```

## Configuration Best Practices

### 1. Start Conservative

```typescript
// Begin with conservative settings
const initialConfig: ReflectionConfig = {
	enableSequentialThinking: true,
	enableSelfAssessment: true,
	maxReasoningSteps: 5, // Start low
	assessmentInterval: 600000, // Start with longer intervals
	patternDetectionThreshold: 0.8, // Start with higher threshold
	memoryLimitMB: 25, // Start with lower limit
	timeoutMs: 15000, // Start with shorter timeout
}
```

### 2. Monitor and Adjust

```typescript
// Set up monitoring for configuration optimization
const configMonitor = {
	checkPerformance: (metrics: PerformanceMetrics) => {
		if (metrics.efficiencyScore > 0.9) {
			// Performance is good, can increase capability
			return {
				maxReasoningSteps: Math.min(10, currentConfig.maxReasoningSteps + 1),
				assessmentInterval: Math.max(120000, currentConfig.assessmentInterval - 30000),
			}
		} else if (metrics.efficiencyScore < 0.6) {
			// Performance is poor, reduce load
			return {
				maxReasoningSteps: Math.max(3, currentConfig.maxReasoningSteps - 1),
				assessmentInterval: Math.min(900000, currentConfig.assessmentInterval + 60000),
			}
		}
		return {}
	},
}
```

### 3. Environment-Specific Tuning

```typescript
// Production optimizations
const productionOptimizations = {
	// Prioritize stability
	timeoutMs: 10000, // Shorter timeout
	maxReasoningSteps: 6, // Fewer steps
	patternDetectionThreshold: 0.85, // Higher threshold

	// Resource conservation
	memoryLimitMB: 30,
	maxHistorySize: 500,
	cleanupInterval: 300000, // More frequent cleanup

	// Reduced frequency
	assessmentInterval: 900000, // 15 minutes
}

// Development optimizations
const developmentOptimizations = {
	// Enhanced debugging
	timeoutMs: 45000, // Longer timeout
	maxReasoningSteps: 12, // More detailed reasoning
	patternDetectionThreshold: 0.6, // More sensitive

	// More resources
	memoryLimitMB: 100,
	maxHistorySize: 2000,

	// More frequent assessment
	assessmentInterval: 120000, // 2 minutes
}
```

### 4. Configuration Templates

```typescript
// Template for code analysis tasks
const codeAnalysisTemplate: Partial<ReflectionConfig> = {
	maxReasoningSteps: 8,
	enableSequentialThinking: true,
	enableSelfAssessment: true,
	patternDetectionThreshold: 0.7,
	semanticSimilarityThreshold: 0.8,

	sequentialThinking: {
		enableAnalysis: true,
		enableHypothesis: true,
		requireAllSteps: true,
	},
}

// Template for debugging tasks
const debuggingTemplate: Partial<ReflectionConfig> = {
	maxReasoningSteps: 12,
	assessmentInterval: 180000,
	patternDetectionThreshold: 0.6, // More sensitive for debugging

	toolRepetitionDetector: {
		enableCyclicDetection: true,
		enableSemanticDetection: true,
		warnOnRepetition: true,
	},
}

// Template for optimization tasks
const optimizationTemplate: Partial<ReflectionConfig> = {
	enableSelfAssessment: true,
	performanceWindowSize: 200,
	trendAnalysisDepth: 50,

	selfAssessment: {
		continuousAssessment: true,
		enableRecommendations: true,
		maxRecommendations: 5,
	},
}
```

## Troubleshooting Configuration Issues

### Common Configuration Problems

1. **High Memory Usage**

    ```typescript
    // Solution: Reduce memory-intensive settings
    const memoryFriendlyConfig = {
    	maxHistorySize: 200,
    	performanceWindowSize: 50,
    	cleanupInterval: 300000,
    	trendAnalysisDepth: 10,
    }
    ```

2. **Slow Performance**

    ```typescript
    // Solution: Reduce processing load
    const performanceOptimizedConfig = {
    	maxReasoningSteps: 5,
    	assessmentInterval: 900000,
    	maxConcurrentReflections: 1,
    	timeoutMs: 10000,
    }
    ```

3. **Too Many False Positives**

    ```typescript
    // Solution: Increase detection thresholds
    const preciseDetectionConfig = {
    	patternDetectionThreshold: 0.9,
    	semanticSimilarityThreshold: 0.9,
    	repetitionCountThreshold: 5,
    }
    ```

4. **Missing Important Patterns**
    ```typescript
    // Solution: Increase sensitivity
    const sensitiveDetectionConfig = {
    	patternDetectionThreshold: 0.5,
    	semanticSimilarityThreshold: 0.6,
    	repetitionCountThreshold: 2,
    	analysisWindowSize: 30,
    }
    ```

## Configuration Reference Summary

| Setting                       | Default  | Range       | Purpose                       |
| ----------------------------- | -------- | ----------- | ----------------------------- |
| `enableSequentialThinking`    | `true`   | boolean     | Enable 5-step reasoning       |
| `enableSelfAssessment`        | `true`   | boolean     | Enable performance assessment |
| `maxReasoningSteps`           | `10`     | 1-20        | Max steps per reasoning chain |
| `assessmentInterval`          | `300000` | 10000+      | Assessment frequency (ms)     |
| `patternDetectionThreshold`   | `0.7`    | 0.0-1.0     | Pattern confidence threshold  |
| `semanticSimilarityThreshold` | `0.8`    | 0.0-1.0     | Semantic similarity threshold |
| `performanceWindowSize`       | `100`    | 10-1000     | Metrics calculation window    |
| `memoryLimitMB`               | `50`     | 5-1000      | Memory usage limit            |
| `timeoutMs`                   | `30000`  | 1000-300000 | Reflection timeout            |

For additional configuration examples and advanced scenarios, see the [Examples](./examples.md) documentation.

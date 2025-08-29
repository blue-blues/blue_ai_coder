# TRAE-Agent Activation Guide

## Quick Start

### 1. Enable TRAE-Agent in Configuration

```typescript
// In your experiment configuration
experiments: {
    enableReflection: true,      // Phase 1: Reflection system
    enableIntelligence: true,    // Phase 2: Intelligence system
    showReflectionInsights: true // Optional: Show insights to users
}
```

### 2. Set Environment Variables (Optional)

```bash
# Production Setup
export NODE_ENV=production
export TRAE_INTELLIGENCE_ENABLED=true
export TRAE_CONTEXT_MEMORY_ENABLED=true
export TRAE_ERROR_RECOVERY_ENABLED=true
export TRAE_PROBLEM_DETECTOR_ENABLED=true

# Development Setup
export NODE_ENV=development
export TRAE_DEBUG=true
export TRAE_EXPERIMENTAL_FEATURES=true
```

### 3. Verify Activation

Look for these log messages in your console:

```
[TRAE-Agent Phase 2] Intelligence system initialized: {
    contextMemory: true,
    errorRecovery: true,
    strategyAdapter: true,
    toolSelector: true,
    problemDetector: true
}
```

## Gradual Rollout Recommendations

### Stage 1: Foundation (Week 1-2)

```typescript
experiments: {
    enableReflection: true,
    enableIntelligence: false  // Start with Phase 1 only
}
```

### Stage 2: Basic Intelligence (Week 3-4)

```bash
export TRAE_INTELLIGENCE_ENABLED=true
export TRAE_CONTEXT_MEMORY_ENABLED=true
export TRAE_ERROR_RECOVERY_ENABLED=true
export TRAE_STRATEGY_ADAPTER_ENABLED=false
export TRAE_TOOL_SELECTOR_ENABLED=false
export TRAE_PROBLEM_DETECTOR_ENABLED=true
```

### Stage 3: Full System (Week 5+)

```bash
export TRAE_INTELLIGENCE_ENABLED=true
# Enable all components
export TRAE_CONTEXT_MEMORY_ENABLED=true
export TRAE_ERROR_RECOVERY_ENABLED=true
export TRAE_STRATEGY_ADAPTER_ENABLED=true
export TRAE_TOOL_SELECTOR_ENABLED=true
export TRAE_PROBLEM_DETECTOR_ENABLED=true
```

## Monitoring & Troubleshooting

### Success Indicators

- ✅ Task completion rates improve by 15-25%
- ✅ Fewer repetitive tool usage patterns
- ✅ Faster error recovery
- ✅ More contextually appropriate tool selections

### Warning Signs

- ⚠️ Increased memory usage beyond 50MB
- ⚠️ Slower task initialization (>500ms)
- ⚠️ Frequent intelligence system errors in logs

### Emergency Rollback

```typescript
// Disable all TRAE-Agent features
experiments: {
    enableReflection: false,
    enableIntelligence: false
}

// Or via environment
export TRAE_INTELLIGENCE_ENABLED=false
```

## Performance Optimization

### Memory Management

- Monitor memory usage with `process.memoryUsage()`
- Adjust `maxPatterns` in ContextMemory if needed
- Use conservative configuration in production

### Configuration Tuning

```typescript
// Reduce resource usage
const customConfig = {
	...CONSERVATIVE_INTELLIGENCE_CONFIG,
	contextMemory: {
		...CONSERVATIVE_INTELLIGENCE_CONFIG.contextMemory,
		maxPatterns: 500, // Reduce from default 1000
	},
}
```

The TRAE-Agent system is now ready for production deployment with comprehensive monitoring and gradual rollout capabilities!

# TRAE-Agent Migration Guide

## Overview

This guide provides step-by-step instructions for enabling TRAE-Agent features in existing BluesCode installations. Whether you're upgrading from a previous version or enabling these features for the first time, this guide will help ensure a smooth transition.

## Table of Contents

- [Pre-Migration Checklist](#pre-migration-checklist)
- [Migration Steps](#migration-steps)
- [Configuration Migration](#configuration-migration)
- [Feature Activation](#feature-activation)
- [Verification and Testing](#verification-and-testing)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting Migration Issues](#troubleshooting-migration-issues)
- [Post-Migration Optimization](#post-migration-optimization)

## Pre-Migration Checklist

### System Requirements

Before enabling TRAE-Agent features, ensure your system meets these requirements:

- **BluesCode Version**: 2.0.0 or higher
- **Node.js**: Version 16.0.0 or higher
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: Additional 100MB for TRAE-Agent components
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)

### Backup Current Configuration

**1. Backup Configuration Files:**

```bash
# Windows
copy "%USERPROFILE%\.bluescode\config.json" "%USERPROFILE%\.bluescode\config.json.backup"
copy "%USERPROFILE%\.bluescode\experiments.json" "%USERPROFILE%\.bluescode\experiments.json.backup"

# macOS/Linux
cp ~/.bluescode/config.json ~/.bluescode/config.json.backup
cp ~/.bluescode/experiments.json ~/.bluescode/experiments.json.backup
```

**2. Export Current Settings:**

```json
{
	"backupInfo": {
		"date": "2024-01-15T10:30:00Z",
		"version": "1.9.5",
		"userSettings": {
			"theme": "dark",
			"fontSize": 14,
			"autoSave": true
		},
		"experiments": {
			"enableReflection": false
		}
	}
}
```

### Check Current Version

Verify your BluesCode version:

```bash
# Command line
bluescode --version

# Or in BluesCode: Help > About BluesCode
```

## Migration Steps

### Step 1: Update BluesCode (if needed)

If you're running an older version:

**Automatic Update:**

1. Open BluesCode
2. Go to **Help** > **Check for Updates**
3. Follow the update prompts
4. Restart when prompted

**Manual Update:**

```bash
# Download latest version from official website
# Install following standard procedures for your OS
```

### Step 2: Enable Experiment Flags

**Method 1: Through Settings UI**

1. Open BluesCode Settings (`Ctrl/Cmd + ,`)
2. Navigate to **Advanced** > **Experiments**
3. Enable "TRAE-Agent Integration"
4. Click **Save** and restart

**Method 2: Direct Configuration Edit**

Edit your configuration file:

**Windows:** `%USERPROFILE%\.bluescode\config.json`
**macOS/Linux:** `~/.bluescode/config.json`

Add or modify the experiments section:

```json
{
	"experiments": {
		"enableReflection": true,
		"showReflectionInsights": true,
		"enablePerformanceMetrics": true
	}
}
```

### Step 3: Initialize TRAE-Agent Components

**Automatic Initialization:**
The components will initialize automatically on the next restart.

**Manual Initialization (if needed):**

```bash
# Command line initialization
bluescode --init-reflection

# Or through developer console (Ctrl+Shift+I):
window.electronAPI.initializeReflection()
```

### Step 4: Restart BluesCode

**Complete restart required:**

1. Close all BluesCode windows
2. End any background processes:

    ```bash
    # Windows
    taskkill /f /im bluescode.exe

    # macOS/Linux
    pkill -f bluescode
    ```

3. Start BluesCode normally

## Configuration Migration

### Migrating from Legacy Settings

If you have existing AI assistant configurations:

**Legacy Configuration:**

```json
{
	"aiAssistant": {
		"model": "gpt-4",
		"temperature": 0.7,
		"maxTokens": 2000
	}
}
```

**Migrated Configuration:**

```json
{
	"aiAssistant": {
		"model": "gpt-4",
		"temperature": 0.7,
		"maxTokens": 2000
	},
	"experiments": {
		"enableReflection": true,
		"showReflectionInsights": true,
		"reflectionConfig": {
			"enableSequentialThinking": true,
			"enableSelfAssessment": true,
			"maxReasoningSteps": 8
		}
	}
}
```

### Environment-Specific Migration

**Development Environment:**

```json
{
	"experiments": {
		"enableReflection": true,
		"showReflectionInsights": true,
		"enableReflectionDebug": true,
		"reflectionConfig": {
			"maxReasoningSteps": 10,
			"assessmentInterval": 180000,
			"patternDetectionThreshold": 0.6
		}
	}
}
```

**Production Environment:**

```json
{
	"experiments": {
		"enableReflection": true,
		"showReflectionInsights": false,
		"reflectionConfig": {
			"maxReasoningSteps": 6,
			"assessmentInterval": 900000,
			"patternDetectionThreshold": 0.8
		}
	}
}
```

## Feature Activation

### Basic Feature Set

**Minimal Configuration (Recommended for first-time users):**

```json
{
	"experiments": {
		"enableReflection": true,
		"showReflectionInsights": true,
		"reflectionConfig": {
			"enableSequentialThinking": true,
			"enableSelfAssessment": false,
			"maxReasoningSteps": 5
		}
	}
}
```

### Advanced Feature Set

**Full Configuration (For experienced users):**

```json
{
	"experiments": {
		"enableReflection": true,
		"showReflectionInsights": true,
		"enableReflectionDebug": false,
		"reflectionConfig": {
			"enableSequentialThinking": true,
			"enableSelfAssessment": true,
			"maxReasoningSteps": 10,
			"assessmentInterval": 300000,
			"patternDetectionThreshold": 0.7,
			"semanticSimilarityThreshold": 0.8,
			"performanceWindowSize": 100,
			"memoryLimitMB": 50
		}
	}
}
```

### Gradual Activation Strategy

**Week 1: Basic Features**

```json
{
	"experiments": {
		"enableReflection": true,
		"showReflectionInsights": false,
		"reflectionConfig": {
			"enableSequentialThinking": true,
			"enableSelfAssessment": false
		}
	}
}
```

**Week 2: Add Insights**

```json
{
	"experiments": {
		"enableReflection": true,
		"showReflectionInsights": true,
		"reflectionConfig": {
			"enableSequentialThinking": true,
			"enableSelfAssessment": false
		}
	}
}
```

**Week 3: Full Features**

```json
{
	"experiments": {
		"enableReflection": true,
		"showReflectionInsights": true,
		"reflectionConfig": {
			"enableSequentialThinking": true,
			"enableSelfAssessment": true
		}
	}
}
```

## Verification and Testing

### Activation Verification

**1. Check for Activation Messages:**
Look for these messages in the console or chat:

```
🤔 Self-reflection: TRAE-Agent system activated successfully
🤔 Self-reflection: Sequential thinking and self-assessment modules online
```

**2. Test Basic Functionality:**
Ask a simple question and look for sequential thinking indicators:

```
User: "How do I optimize this React component?"

Expected response:
🧠 Observing: React component structure and current implementation
🧠 Analyzing: Performance bottlenecks and optimization opportunities
🧠 Decision: Recommend memoization and code splitting approaches
```

**3. Verify Configuration:**

```javascript
// In developer console (Ctrl+Shift+I)
console.log(window.electronAPI.getReflectionConfig())

// Should show your configuration settings
```

### Feature Testing Checklist

- [ ] Sequential thinking process visible
- [ ] Pattern detection working (try repeating an action)
- [ ] Self-assessment reports appearing (wait 5-10 minutes)
- [ ] Configuration settings applied correctly
- [ ] No error messages in console
- [ ] Performance remains acceptable

### Performance Testing

**Memory Usage Check:**

```javascript
// Monitor memory usage
setInterval(() => {
	console.log("Memory usage:", process.memoryUsage())
}, 30000)
```

**Response Time Testing:**

```javascript
// Test reflection response times
const startTime = Date.now()
// Perform a complex task
// Check if completion time is reasonable (< 30 seconds)
```

## Rollback Procedures

### Quick Rollback

**Disable TRAE-Agent:**

```json
{
	"experiments": {
		"enableReflection": false
	}
}
```

### Complete Rollback

**1. Restore Configuration:**

```bash
# Windows
copy "%USERPROFILE%\.bluescode\config.json.backup" "%USERPROFILE%\.bluescode\config.json"

# macOS/Linux
cp ~/.bluescode/config.json.backup ~/.bluescode/config.json
```

**2. Clear TRAE-Agent Data:**

```bash
# Remove reflection data
rm -rf ~/.bluescode/reflection/
rm -rf ~/.bluescode/temp/trae-*
```

**3. Restart BluesCode:**

```bash
# Force restart
pkill -f bluescode && bluescode
```

### Partial Rollback

**Disable Specific Features:**

```json
{
	"experiments": {
		"enableReflection": true,
		"showReflectionInsights": false,
		"reflectionConfig": {
			"enableSequentialThinking": true,
			"enableSelfAssessment": false
		}
	}
}
```

## Troubleshooting Migration Issues

### Common Migration Problems

**Issue 1: TRAE-Agent Not Activating**

_Symptoms:_

- No activation messages
- No reflection insights appearing

_Solutions:_

1. Verify configuration syntax:

    ```bash
    # Validate JSON
    cat ~/.bluescode/config.json | python -m json.tool
    ```

2. Check file permissions:

    ```bash
    # Ensure config file is writable
    chmod 644 ~/.bluescode/config.json
    ```

3. Complete restart:
    ```bash
    pkill -f bluescode && sleep 2 && bluescode
    ```

**Issue 2: High Memory Usage After Migration**

_Symptoms:_

- Increased memory consumption
- System slowdown

_Solutions:_

1. Reduce memory limits:

    ```json
    {
    	"reflectionConfig": {
    		"memoryLimitMB": 25,
    		"maxHistorySize": 200,
    		"performanceWindowSize": 50
    	}
    }
    ```

2. Increase cleanup frequency:
    ```json
    {
    	"reflectionConfig": {
    		"cleanupInterval": 300000
    	}
    }
    ```

**Issue 3: Configuration Conflicts**

_Symptoms:_

- Unexpected behavior
- Error messages about conflicting settings

_Solutions:_

1. Reset to minimal configuration:

    ```json
    {
    	"experiments": {
    		"enableReflection": true,
    		"reflectionConfig": {
    			"enableSequentialThinking": true,
    			"enableSelfAssessment": false
    		}
    	}
    }
    ```

2. Remove conflicting legacy settings

### Migration Validation Script

```bash
#!/bin/bash
# TRAE-Agent Migration Validation Script

echo "=== TRAE-Agent Migration Validation ==="

# Check BluesCode version
echo "Checking BluesCode version..."
bluescode --version

# Check configuration
echo "Validating configuration..."
if [ -f ~/.bluescode/config.json ]; then
    echo "✓ Configuration file exists"

    # Validate JSON syntax
    if python -m json.tool ~/.bluescode/config.json > /dev/null 2>&1; then
        echo "✓ Configuration syntax valid"
    else
        echo "✗ Configuration syntax invalid"
        exit 1
    fi

    # Check for reflection settings
    if grep -q "enableReflection" ~/.bluescode/config.json; then
        echo "✓ Reflection settings found"
    else
        echo "✗ Reflection settings missing"
        exit 1
    fi
else
    echo "✗ Configuration file not found"
    exit 1
fi

# Check system resources
echo "Checking system resources..."
free -h | head -2

echo "=== Migration validation complete ==="
```

## Post-Migration Optimization

### Performance Optimization

**Monitor and Adjust:**

```json
{
	"experiments": {
		"enableReflection": true,
		"reflectionConfig": {
			"maxReasoningSteps": 6,
			"assessmentInterval": 600000,
			"memoryLimitMB": 40
		}
	}
}
```

### User Experience Optimization

**Customize Insight Frequency:**

```json
{
	"experiments": {
		"showReflectionInsights": true,
		"reflectionInsightLevel": "balanced",
		"reflectionFocus": "performance"
	}
}
```

### Workspace-Specific Settings

**Create Project-Specific Configurations:**

`.bluescode/workspace.json`:

```json
{
	"experiments": {
		"reflectionMode": "development",
		"showDebuggingInsights": true,
		"enablePatternDetection": true
	}
}
```

### Monitoring Setup

**Set Up Performance Monitoring:**

```json
{
	"experiments": {
		"enablePerformanceMetrics": true,
		"enableMetricsCollection": true,
		"metricsReportingInterval": 3600000
	}
}
```

## Migration Checklist

### Pre-Migration

- [ ] Backup current configuration
- [ ] Verify system requirements
- [ ] Check BluesCode version
- [ ] Plan rollback strategy

### During Migration

- [ ] Update BluesCode if needed
- [ ] Enable experiment flags
- [ ] Configure TRAE-Agent settings
- [ ] Restart application

### Post-Migration

- [ ] Verify activation messages
- [ ] Test basic functionality
- [ ] Monitor performance
- [ ] Adjust settings as needed
- [ ] Document any custom configurations

### Validation

- [ ] Sequential thinking working
- [ ] Pattern detection active
- [ ] Self-assessments appearing
- [ ] No error messages
- [ ] Performance acceptable
- [ ] User experience satisfactory

## Support and Resources

### Additional Documentation

- [User Guide](./user-guide.md) - End-user instructions
- [Configuration Guide](./configuration.md) - Detailed settings
- [Troubleshooting Guide](./troubleshooting.md) - Issue resolution
- [Developer Guide](./developer-guide.md) - Technical details

### Migration Support

- Check existing issues in the project repository
- Review troubleshooting documentation
- Enable debug logging for detailed diagnostics
- Document any unique migration challenges

---

**Migration Complete?** Once you've successfully enabled TRAE-Agent features, explore the [User Guide](./user-guide.md) to learn how to make the most of your enhanced AI assistant capabilities

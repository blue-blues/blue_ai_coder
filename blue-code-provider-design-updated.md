# Blue Code API Provider - Updated Implementation Design

## Overview

This document outlines the complete implementation strategy for integrating a Blue Code API provider into the Blues Code system. The provider will be OpenAI-compatible with a hardcoded base URL of `https://coder.bluesminds.com/v1` and expose only token and model configuration to users.

## Updated Requirements

Based on user feedback, the implementation now includes:

- **API Key Field**: Use `BlueCodeApiKey` (capitalized)
- **Model Discovery**: Base models on actual API endpoint availability
- **Default Model**: Set to `"us.anthropic.claude-3-7-sonnet-20250219-v1:0"`
- **Provider Name**: "Blue Code"

## Architecture Analysis

The implementation follows the established [`BaseOpenAiCompatibleProvider`](src/api/providers/base-openai-compatible-provider.ts:22) pattern used by other providers like [`GroqHandler`](src/api/providers/groq.ts:7).

## Implementation Strategy

### Phase 1: Model Discovery and Definition

First, investigate the actual models available at the Blue Code API endpoint to ensure accurate model definitions.

### Phase 2: Type System Integration

Update the type system to include Blue Code provider types and configuration schema.

### Phase 3: Provider Implementation

Create the [`BlueCodeHandler`] class following the established pattern.

### Phase 4: Registration and Integration

Register the provider in all necessary locations for full system integration.

## Detailed Component Specifications

### 1. Model Investigation

**Endpoint**: `https://coder.bluesminds.com/v1/models`
**Purpose**: Discover available models and their specifications
**Output**: Accurate model definitions for Blue Code provider

### 2. Model Definitions (`packages/types/src/providers/blue-code.ts`)

```typescript
import type { ModelInfo } from "../model.js"

// Models will be defined based on actual API endpoint response
export type BlueCodeModelId = "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
// Additional models based on API discovery

export const blueCodeDefaultModelId: BlueCodeModelId = "us.anthropic.claude-3-7-sonnet-20250219-v1:0"

export const blueCodeModels = {
	"us.anthropic.claude-3-7-sonnet-20250219-v1:0": {
		maxTokens: 8192,
		contextWindow: 200000,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0.003, // Placeholder - will be updated based on API
		outputPrice: 0.015, // Placeholder - will be updated based on API
		description: "Claude 3.7 Sonnet model via Blue Code API",
	},
	// Additional models based on API discovery
} as const satisfies Record<string, ModelInfo>
```

### 3. Provider Settings Schema Update

Update the ProviderSettings interface to include:

```typescript
// In packages/types/src/api.ts
export interface ProviderSettings {
	// ... existing fields
	BlueCodeApiKey?: string
}
```

### 4. Provider Implementation (`src/api/providers/blue-code.ts`)

```typescript
import { type BlueCodeModelId, blueCodeDefaultModelId, blueCodeModels } from "@blues-code/types"

import type { ApiHandlerOptions } from "../../shared/api"

import { BaseOpenAiCompatibleProvider } from "./base-openai-compatible-provider"

export class BlueCodeHandler extends BaseOpenAiCompatibleProvider<BlueCodeModelId> {
	constructor(options: ApiHandlerOptions) {
		super({
			...options,
			providerName: "Blue Code",
			baseURL: "https://coder.bluesminds.com/v1",
			apiKey: options.BlueCodeApiKey,
			defaultProviderModelId: blueCodeDefaultModelId,
			providerModels: blueCodeModels,
			defaultTemperature: 0.7,
		})
	}
}
```

### 5. Registration Points

#### A. Provider Export ([`src/api/providers/index.ts`](src/api/providers/index.ts:1))

```typescript
export { BlueCodeHandler } from "./blue-code"
```

#### B. Type Export ([`packages/types/src/providers/index.ts`](packages/types/src/providers/index.ts:1))

```typescript
export * from "./blue-code.js"
```

#### C. GetModelsOptions Update ([`src/shared/api.ts`](src/shared/api.ts:223))

```typescript
export type GetModelsOptions = { provider: "blue-code"; BlueCodeApiKey?: string }
// ... other providers
```

## Architecture Diagram

```mermaid
graph TB
    A[Blue Code API Request] --> B[BlueCodeHandler]
    B --> C[BaseOpenAiCompatibleProvider]
    C --> D[OpenAI Client]
    D --> E[https://coder.bluesminds.com/v1]

    F[Model Discovery] --> G[/v1/models endpoint]
    G --> H[blueCodeModels definition]
    H --> B

    I[Provider Settings] --> J[BlueCodeApiKey]
    J --> B

    K[Default Model] --> L[us.anthropic.claude-3-7-sonnet-20250219-v1:0]
    L --> B

    M[Configuration Manager] --> N[ProviderSettingsManager]
    N --> I
```

## Updated File Structure

```
packages/types/src/providers/
├── blue-code.ts                 # Model definitions based on API discovery
└── index.ts                     # Export Blue Code types

src/api/providers/
├── blue-code.ts                 # BlueCodeHandler implementation
├── index.ts                     # Export BlueCodeHandler
└── __tests__/
    └── blue-code.spec.ts        # Unit tests

src/shared/
└── api.ts                       # GetModelsOptions update
```

## Implementation Phases

### Phase 1: Discovery (Steps 1-2)

1. **API Investigation**: Query `https://coder.bluesminds.com/v1/models` to discover available models
2. **Model Definition**: Define accurate model types based on API response

### Phase 2: Type System (Steps 3-5)

3. **Model File Creation**: Create `blue-code.ts` with discovered models
4. **Type Export**: Update type system exports
5. **Schema Update**: Add `BlueCodeApiKey` to ProviderSettings

### Phase 3: Provider (Steps 6-7)

6. **Handler Implementation**: Create BlueCodeHandler class
7. **Default Configuration**: Set default model to specified Claude variant

### Phase 4: Integration (Steps 8-10)

8. **Provider Export**: Add to provider exports
9. **Registration**: Register in provider mappings
10. **Options Update**: Add to GetModelsOptions type

### Phase 5: Testing & Documentation (Steps 11-12)

11. **Test Implementation**: Create comprehensive test suite
12. **Documentation**: Update provider documentation

## Key Differences from Original Design

1. **API Key Field**: Changed from `blueCodeApiKey` to `BlueCodeApiKey`
2. **Model Discovery**: Added initial step to investigate actual API models
3. **Default Model**: Updated to use Claude 3.7 Sonnet variant
4. **Model Strategy**: Base definitions on real API endpoint instead of assumptions

## Success Criteria

- [ ] API model discovery completed successfully
- [ ] Blue Code provider appears in provider selection UI
- [ ] `BlueCodeApiKey` configuration works through settings
- [ ] Default model is `"us.anthropic.claude-3-7-sonnet-20250219-v1:0"`
- [ ] Model selection shows actual Blue Code API models
- [ ] Message streaming functions correctly
- [ ] Base URL remains hardcoded and not user-modifiable
- [ ] All existing functionality remains unaffected
- [ ] Unit tests achieve >90% coverage
- [ ] Integration tests pass

## Next Steps

The updated todo list provides a clear implementation path starting with API discovery. This ensures the provider implementation is based on actual available models rather than assumptions, leading to a more robust and accurate integration.

Ready to proceed with implementation following this updated design.

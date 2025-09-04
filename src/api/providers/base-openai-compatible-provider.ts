import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI from "openai"
import axios from "axios"

import type { ModelInfo } from "@blues-code/types"

import type { ApiHandlerOptions } from "../../shared/api"
import { ApiStream } from "../transform/stream"
import { convertToOpenAiMessages } from "../transform/openai-format"

import type { SingleCompletionHandler, ApiHandlerCreateMessageMetadata } from "../index"
import { DEFAULT_HEADERS } from "./constants"
import { BaseProvider } from "./base-provider"

type BaseOpenAiCompatibleProviderOptions<ModelName extends string> = ApiHandlerOptions & {
	providerName: string
	baseURL: string
	defaultProviderModelId: ModelName
	providerModels: Record<ModelName, ModelInfo>
	defaultTemperature?: number
}

export abstract class BaseOpenAiCompatibleProvider<ModelName extends string>
	extends BaseProvider
	implements SingleCompletionHandler
{
	protected readonly providerName: string
	protected readonly baseURL: string
	protected readonly defaultTemperature: number
	protected readonly defaultProviderModelId: ModelName
	protected readonly providerModels: Record<ModelName, ModelInfo>

	protected readonly options: ApiHandlerOptions

	protected client: OpenAI

	constructor({
		providerName,
		baseURL,
		defaultProviderModelId,
		providerModels,
		defaultTemperature,
		...options
	}: BaseOpenAiCompatibleProviderOptions<ModelName>) {
		super()

		this.providerName = providerName
		this.baseURL = baseURL
		this.defaultProviderModelId = defaultProviderModelId
		this.providerModels = providerModels
		this.defaultTemperature = defaultTemperature ?? 0

		this.options = options

		if (!this.options.apiKey) {
			throw new Error("API key is required")
		}

		this.client = new OpenAI({
			baseURL,
			apiKey: this.options.apiKey,
			defaultHeaders: DEFAULT_HEADERS,
		})
	}

	override async *createMessage(
		systemPrompt: string,
		messages: Anthropic.Messages.MessageParam[],
		metadata?: ApiHandlerCreateMessageMetadata,
	): ApiStream {
		const {
			id: model,
			info: { maxTokens: max_tokens },
		} = this.getModel()

		const temperature = this.options.modelTemperature ?? this.defaultTemperature

		const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
			model,
			max_tokens,
			temperature,
			messages: [{ role: "system", content: systemPrompt }, ...convertToOpenAiMessages(messages)],
			stream: true,
			stream_options: { include_usage: true },
		}

		const stream = await this.client.chat.completions.create(params)

		for await (const chunk of stream) {
			const delta = chunk.choices[0]?.delta

			if (delta?.content) {
				yield {
					type: "text",
					text: delta.content,
				}
			}

			if (chunk.usage) {
				yield {
					type: "usage",
					inputTokens: chunk.usage.prompt_tokens || 0,
					outputTokens: chunk.usage.completion_tokens || 0,
				}
			}
		}
	}

	async completePrompt(prompt: string): Promise<string> {
		const { id: modelId } = this.getModel()

		try {
			const response = await this.client.chat.completions.create({
				model: modelId,
				messages: [{ role: "user", content: prompt }],
			})

			return response.choices[0]?.message.content || ""
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`${this.providerName} completion error: ${error.message}`)
			}

			throw error
		}
	}

	override getModel() {
		const id =
			this.options.apiModelId && this.options.apiModelId in this.providerModels
				? (this.options.apiModelId as ModelName)
				: this.defaultProviderModelId

		return { id, info: this.providerModels[id] }
	}

	/**
	 * Fetches available models from the provider's API endpoint
	 * @returns Array of model IDs available from the provider
	 */
	async fetchAvailableModels(): Promise<string[]> {
		try {
			if (!this.options.apiKey) {
				console.warn(`[${this.providerName}] No API key provided for model fetching`)
				return []
			}

			const headers: Record<string, string> = {
				...DEFAULT_HEADERS,
				Authorization: `Bearer ${this.options.apiKey}`,
			}

			const response = await axios.get(`${this.baseURL}/models`, { headers })
			const modelsArray = response.data?.data?.map((model: any) => model.id) || []

			console.log(`[${this.providerName}] Fetched ${modelsArray.length} models from API`)
			return [...new Set<string>(modelsArray)]
		} catch (error) {
			console.error(`[${this.providerName}] Failed to fetch models from API:`, error)
			return []
		}
	}

	/**
	 * Updates the provider's model list with models fetched from the API
	 * This allows dynamic model discovery instead of hardcoded model lists
	 */
	async refreshModels(): Promise<void> {
		const availableModels = await this.fetchAvailableModels()

		if (availableModels.length > 0) {
			// Create basic ModelInfo for each discovered model
			availableModels.forEach((modelId) => {
				if (!(modelId in this.providerModels)) {
					// Add discovered model with default settings
					;(this.providerModels as any)[modelId] = {
						maxTokens: 4096, // Default max tokens
						contextWindow: 8192, // Default context window
						supportsImages: false, // Conservative default
						inputPrice: 0, // Unknown pricing
						outputPrice: 0,
						description: `${modelId} (discovered from API)`,
					} as ModelInfo
				}
			})

			console.log(`[${this.providerName}] Updated model list with ${availableModels.length} models`)
		}
	}
}

import type { ProviderSettings } from "@blues-code/types"
import { buildApiHandler, SingleCompletionHandler, ApiHandler } from "../api" //bluescode_change

/**
 * Enhances a prompt using the configured API without creating a full Cline instance or task history.
 * This is a lightweight alternative that only uses the API's completion functionality.
 */
export async function singleCompletionHandler(apiConfiguration: ProviderSettings, promptText: string): Promise<string> {
	if (!promptText) {
		throw new Error("No prompt text provided")
	}
	if (!apiConfiguration || !apiConfiguration.apiProvider) {
		throw new Error("No valid API configuration provided")
	}

	const handler = buildApiHandler(apiConfiguration)

	// Check if handler supports single completions
	if (!("completePrompt" in handler)) {
		// bluescode_change start - stream responses for handlers without completePrompt
		// throw new Error("The selected API provider does not support prompt enhancement")
		return await streamResponseFromHandler(handler, promptText)
		// bluescode_change end
	}

	return (handler as SingleCompletionHandler).completePrompt(promptText)
}

// bluescode_change start - Stream responses using createMessage
async function streamResponseFromHandler(handler: ApiHandler, promptText: string): Promise<string> {
	const stream = handler.createMessage("", [{ role: "user", content: [{ type: "text", text: promptText }] }])

	let response: string = ""
	for await (const chunk of stream) {
		if (chunk.type === "text") {
			response += chunk.text
		}
	}
	return response
}
// bluescode_change end - streamResponseFromHandler

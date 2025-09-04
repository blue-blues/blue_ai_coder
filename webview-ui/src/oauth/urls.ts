import { Package } from "@blues/package"

export function getCallbackUrl(provider: string, uriScheme?: string) {
	return encodeURIComponent(`${uriScheme || "vscode"}://${Package.publisher}.${Package.name}/${provider}`)
}

export function getGlamaAuthUrl(uriScheme?: string) {
	const callbackUrl = getCallbackUrl("glama", uriScheme)
	return `https://glama.ai/oauth/authorize?callback_url=${callbackUrl}`
}

export function getOpenRouterAuthUrl(uriScheme?: string) {
	const callbackUrl = getCallbackUrl("openrouter", uriScheme)
	return `https://openrouter.ai/auth?callback_url=${callbackUrl}`
}

export function getRequestyAuthUrl(uriScheme?: string) {
	const callbackUrl = getCallbackUrl("requesty", uriScheme)
	return `https://requesty.ai/oauth/authorize?callback_url=${callbackUrl}`
}

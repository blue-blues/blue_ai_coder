export function getBluesCodeBackendSignInUrl(uriScheme: string = "vscode", uiKind: string = "Desktop") {
	const baseUrl = "https://bluescode.ai"
	const source = uiKind === "Web" ? "web" : uriScheme
	return `${baseUrl}/sign-in-to-editor?source=${source}`
}

export function getBluesCodeBackendSignUpUrl(uriScheme: string = "vscode", uiKind: string = "Desktop") {
	const baseUrl = "https://bluescode.ai"
	const source = uiKind === "Web" ? "web" : uriScheme
	return `${baseUrl}/users/sign_up?source=${source}`
}

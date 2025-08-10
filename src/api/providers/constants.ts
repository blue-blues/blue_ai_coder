import { Package } from "../../shared/package"

export const DEFAULT_HEADERS = {
	"HTTP-Referer": "https://bluescode.ai",
	"X-Title": "Blues Code",
	"X-BluesCode-Version": Package.version,
	"User-Agent": `Blues-Code/${Package.version}`,
}

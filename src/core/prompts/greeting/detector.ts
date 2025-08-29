import type { GreetingPattern, GreetingResponse } from "./types"

export class GreetingDetector {
	private static readonly GREETING_PATTERNS: GreetingPattern[] = [
		{
			pattern: /^(hi|hello|hey|hiya|howdy)\s*[!.]*\s*$/i,
			confidence: 0.95,
			examples: ["hi", "hello", "hey", "Hi!", "Hello.", "Hey there!"],
		},
		{
			pattern: /^(good\s+(morning|afternoon|evening|day))\s*[!.]*\s*$/i,
			confidence: 0.9,
			examples: ["good morning", "good afternoon", "Good evening!"],
		},
		{
			pattern: /^(hi|hello|hey)\s+(there|blue\s*code?|assistant)\s*[!.]*\s*$/i,
			confidence: 0.95,
			examples: ["hi there", "hello blue code", "hey assistant"],
		},
		{
			pattern: /^(greetings|salutations)\s*[!.]*\s*$/i,
			confidence: 0.85,
			examples: ["greetings", "salutations"],
		},
		{
			pattern: /^(what's\s+up|sup|yo)\s*[!.]*\s*$/i,
			confidence: 0.8,
			examples: ["whats up", "what's up", "sup", "yo"],
		},
		{
			pattern: /^(hi|hello|hey)\s*,?\s*(can\s+you\s+help|help\s+me|i\s+need\s+help)\s*[!.?]*\s*$/i,
			confidence: 0.9,
			examples: ["hi, can you help", "hello help me", "hey I need help"],
		},
		{
			pattern: /^(start|begin|let's\s+start|let's\s+begin)\s*[!.]*\s*$/i,
			confidence: 0.7,
			examples: ["start", "begin", "let's start", "lets begin"],
		},
	]

	private static readonly MIN_CONFIDENCE_THRESHOLD = 0.7

	/**
	 * Detects if the input text appears to be a greeting
	 * @param input The user input text to analyze
	 * @returns GreetingResponse indicating if it's a greeting and confidence level
	 */
	public static detect(input: string): GreetingResponse {
		if (!input || typeof input !== "string") {
			return { isGreeting: false, confidence: 0 }
		}

		const trimmedInput = input.trim()

		// Empty input is not a greeting
		if (!trimmedInput) {
			return { isGreeting: false, confidence: 0 }
		}

		// Check against all greeting patterns
		let bestMatch: { pattern: GreetingPattern; confidence: number } | null = null

		for (const greetingPattern of this.GREETING_PATTERNS) {
			if (greetingPattern.pattern.test(trimmedInput)) {
				if (!bestMatch || greetingPattern.confidence > bestMatch.confidence) {
					bestMatch = {
						pattern: greetingPattern,
						confidence: greetingPattern.confidence,
					}
				}
			}
		}

		if (bestMatch && bestMatch.confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
			return {
				isGreeting: true,
				confidence: bestMatch.confidence,
				shouldBypassAI: true,
			}
		}

		return { isGreeting: false, confidence: 0 }
	}

	/**
	 * Gets all greeting patterns for testing or debugging
	 */
	public static getPatterns(): GreetingPattern[] {
		return [...this.GREETING_PATTERNS]
	}

	/**
	 * Adds a custom greeting pattern
	 * @param pattern The greeting pattern to add
	 */
	public static addPattern(pattern: GreetingPattern): void {
		this.GREETING_PATTERNS.push(pattern)
	}

	/**
	 * Sets the minimum confidence threshold for greeting detection
	 * @param threshold The minimum confidence (0-1) required to classify as greeting
	 */
	public static setMinConfidenceThreshold(threshold: number): void {
		if (threshold >= 0 && threshold <= 1) {
			// @ts-ignore - We need to modify the readonly property for testing
			this.MIN_CONFIDENCE_THRESHOLD = threshold
		}
	}
}

import { GreetingDetector } from "../detector"

describe("GreetingDetector", () => {
	describe("detect", () => {
		it("should detect simple greetings", () => {
			const testCases = ["hi", "hello", "hey", "Hi!", "Hello.", "Hey there!"]

			testCases.forEach((input) => {
				const result = GreetingDetector.detect(input)
				expect(result.isGreeting).toBe(true)
				expect(result.confidence).toBeGreaterThanOrEqual(0.7)
				expect(result.shouldBypassAI).toBe(true)
			})
		})

		it("should detect time-based greetings", () => {
			const testCases = ["good morning", "good afternoon", "Good evening!", "good day"]

			testCases.forEach((input) => {
				const result = GreetingDetector.detect(input)
				expect(result.isGreeting).toBe(true)
				expect(result.confidence).toBe(0.9)
			})
		})

		it("should detect addressed greetings", () => {
			const testCases = ["hi there", "hello blue code", "hey assistant", "Hi Blue Code!", "Hello there."]

			testCases.forEach((input) => {
				const result = GreetingDetector.detect(input)
				expect(result.isGreeting).toBe(true)
				expect(result.confidence).toBe(0.95)
			})
		})

		it("should detect help-seeking greetings", () => {
			const testCases = ["hi, can you help", "hello help me", "hey I need help", "Hi, can you help me?"]

			testCases.forEach((input) => {
				const result = GreetingDetector.detect(input)
				expect(result.isGreeting).toBe(true)
				expect(result.confidence).toBe(0.9)
			})
		})

		it("should detect casual greetings", () => {
			const testCases = ["what's up", "whats up", "sup", "yo", "What's up!"]

			testCases.forEach((input) => {
				const result = GreetingDetector.detect(input)
				expect(result.isGreeting).toBe(true)
				expect(result.confidence).toBe(0.8)
			})
		})

		it("should detect formal greetings", () => {
			const testCases = ["greetings", "salutations", "Greetings!", "Salutations."]

			testCases.forEach((input) => {
				const result = GreetingDetector.detect(input)
				expect(result.isGreeting).toBe(true)
				expect(result.confidence).toBe(0.85)
			})
		})

		it("should detect action greetings", () => {
			const testCases = ["start", "begin", "let's start", "let's begin", "Start!", "Begin."]

			testCases.forEach((input) => {
				const result = GreetingDetector.detect(input)
				expect(result.isGreeting).toBe(true)
				expect(result.confidence).toBe(0.7)
			})
		})

		it("should not detect non-greetings", () => {
			const testCases = [
				"create a new file",
				"help me debug this code",
				"what is the weather like",
				"explain this function",
				"write a test for this",
				"hi there, can you create a new React component",
				"hello, I need you to fix this bug in my code",
				"this is not a greeting at all",
			]

			testCases.forEach((input) => {
				const result = GreetingDetector.detect(input)
				expect(result.isGreeting).toBe(false)
				expect(result.confidence).toBe(0)
			})
		})

		it("should handle edge cases", () => {
			// Empty input
			expect(GreetingDetector.detect("")).toEqual({
				isGreeting: false,
				confidence: 0,
			})

			// Null/undefined input
			expect(GreetingDetector.detect(null as any)).toEqual({
				isGreeting: false,
				confidence: 0,
			})

			// Whitespace only
			expect(GreetingDetector.detect("   ")).toEqual({
				isGreeting: false,
				confidence: 0,
			})

			// Numbers
			expect(GreetingDetector.detect("123")).toEqual({
				isGreeting: false,
				confidence: 0,
			})
		})

		it("should be case insensitive", () => {
			const testCases = [
				["HI", "hi"],
				["HELLO", "hello"],
				["Hey There", "hey there"],
				["GOOD MORNING", "good morning"],
			]

			testCases.forEach(([upper, lower]) => {
				const upperResult = GreetingDetector.detect(upper)
				const lowerResult = GreetingDetector.detect(lower)

				expect(upperResult.isGreeting).toBe(lowerResult.isGreeting)
				expect(upperResult.confidence).toBe(lowerResult.confidence)
			})
		})

		it("should handle punctuation variations", () => {
			const testCases = ["hi", "hi.", "hi!", "hi!!", "hi..."]

			testCases.forEach((input) => {
				const result = GreetingDetector.detect(input)
				expect(result.isGreeting).toBe(true)
			})
		})
	})

	describe("getPatterns", () => {
		it("should return all greeting patterns", () => {
			const patterns = GreetingDetector.getPatterns()
			expect(patterns).toHaveLength(7)
			expect(patterns[0]).toHaveProperty("pattern")
			expect(patterns[0]).toHaveProperty("confidence")
			expect(patterns[0]).toHaveProperty("examples")
		})
	})

	describe("addPattern", () => {
		it("should add custom greeting pattern", () => {
			const initialCount = GreetingDetector.getPatterns().length

			GreetingDetector.addPattern({
				pattern: /^(howdy|g'day)\s*[!.]*\s*$/i,
				confidence: 0.8,
				examples: ["howdy", "g'day"],
			})

			expect(GreetingDetector.getPatterns()).toHaveLength(initialCount + 1)

			// Test the new pattern works
			const result = GreetingDetector.detect("howdy")
			expect(result.isGreeting).toBe(true)
			expect(result.confidence).toBe(0.8)
		})
	})
})

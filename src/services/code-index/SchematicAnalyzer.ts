import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs/promises"
import { createHash } from "crypto"
import { CodeBlock, ICodeParser } from "./interfaces"
import { scannerExtensions, shouldUseFallbackChunking } from "./shared/supported-extensions"
import { TelemetryService } from "@roo-code/telemetry"
import { TelemetryEventName } from "@roo-code/types"
import { sanitizeErrorMessage } from "./shared/validation-helpers"

/**
 * File type categories for intelligent prioritization
 */
export enum FileCategory {
	ENTRY_POINT = "entry_point",
	CONFIGURATION = "configuration",
	CORE_LOGIC = "core_logic",
	UTILITY = "utility",
	TEST = "test",
	DOCUMENTATION = "documentation",
	ASSET = "asset",
	GENERATED = "generated",
	UNKNOWN = "unknown",
}

/**
 * File importance levels for processing prioritization
 */
export enum ImportanceLevel {
	CRITICAL = 5, // Entry points, main configs
	HIGH = 4, // Core business logic, important configs
	MEDIUM = 3, // Utilities, helpers, secondary logic
	LOW = 2, // Tests, documentation
	MINIMAL = 1, // Generated files, assets
}

/**
 * Comprehensive file analysis result
 */
export interface FileAnalysis {
	filePath: string
	category: FileCategory
	importance: ImportanceLevel
	language: string
	fileSize: number
	lineCount: number
	complexity: number
	dependencies: string[]
	exports: string[]
	functions: string[]
	classes: string[]
	interfaces: string[]
	types: string[]
	isEntryPoint: boolean
	isConfiguration: boolean
	isGenerated: boolean
	lastModified: Date
	fileHash: string
}

/**
 * Dependency relationship between files
 */
export interface DependencyRelation {
	from: string
	to: string
	type: "import" | "require" | "include" | "reference"
	isExternal: boolean
}

/**
 * Code structure analysis for a file
 */
export interface CodeStructure {
	filePath: string
	functions: FunctionInfo[]
	classes: ClassInfo[]
	interfaces: InterfaceInfo[]
	types: TypeInfo[]
	imports: ImportInfo[]
	exports: ExportInfo[]
}

export interface FunctionInfo {
	name: string
	startLine: number
	endLine: number
	parameters: string[]
	returnType?: string
	isAsync: boolean
	isExported: boolean
	complexity: number
}

export interface ClassInfo {
	name: string
	startLine: number
	endLine: number
	methods: string[]
	properties: string[]
	extends?: string
	implements: string[]
	isExported: boolean
}

export interface InterfaceInfo {
	name: string
	startLine: number
	endLine: number
	properties: string[]
	methods: string[]
	extends: string[]
	isExported: boolean
}

export interface TypeInfo {
	name: string
	startLine: number
	endLine: number
	type: "type" | "enum" | "const"
	isExported: boolean
}

export interface ImportInfo {
	module: string
	imports: string[]
	isDefault: boolean
	isNamespace: boolean
	line: number
}

export interface ExportInfo {
	name: string
	type: "function" | "class" | "interface" | "type" | "const" | "default"
	line: number
}

/**
 * Workspace analysis summary
 */
export interface WorkspaceAnalysis {
	totalFiles: number
	filesByCategory: Record<FileCategory, number>
	filesByImportance: Record<ImportanceLevel, number>
	languageDistribution: Record<string, number>
	dependencyGraph: DependencyRelation[]
	entryPoints: string[]
	configurationFiles: string[]
	averageComplexity: number
	totalLinesOfCode: number
	analysisTimestamp: Date
}

/**
 * SchematicAnalyzer provides comprehensive analysis of code files and workspace structure
 * for intelligent indexing prioritization and optimization
 */
export class SchematicAnalyzer {
	private fileAnalysisCache = new Map<string, FileAnalysis>()
	private dependencyCache = new Map<string, DependencyRelation[]>()
	private workspaceAnalysisCache: WorkspaceAnalysis | null = null
	private lastAnalysisTime = 0

	constructor(
		private readonly codeParser: ICodeParser,
		private readonly workspacePath: string,
	) {}

	/**
	 * Analyzes a single file comprehensively
	 */
	async analyzeFile(filePath: string, content?: string): Promise<FileAnalysis> {
		try {
			// Check cache first
			const cachedAnalysis = this.fileAnalysisCache.get(filePath)
			if (cachedAnalysis) {
				const stats = await fs.stat(filePath)
				if (stats.mtime <= cachedAnalysis.lastModified) {
					return cachedAnalysis
				}
			}

			// Read file content if not provided
			if (!content) {
				const buffer = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath))
				content = Buffer.from(buffer).toString("utf-8")
			}

			const stats = await fs.stat(filePath)
			const fileHash = createHash("sha256").update(content).digest("hex")
			const extension = path.extname(filePath).toLowerCase()
			const fileName = path.basename(filePath)
			const relativePath = path.relative(this.workspacePath, filePath)

			// Basic file metrics
			const lineCount = content.split("\n").length
			const fileSize = stats.size

			// Determine file category and importance
			const category = this.categorizeFile(filePath, content)
			const importance = this.calculateImportance(category, filePath, content)

			// Language detection
			const language = this.detectLanguage(extension, content)

			// Parse code structure
			const codeStructure = await this.analyzeCodeStructure(filePath, content)

			// Calculate complexity
			const complexity = this.calculateComplexity(content, codeStructure)

			// Extract dependencies and exports
			const dependencies = this.extractDependencies(content, language)
			const exports = this.extractExports(content, language)

			const analysis: FileAnalysis = {
				filePath,
				category,
				importance,
				language,
				fileSize,
				lineCount,
				complexity,
				dependencies,
				exports,
				functions: codeStructure.functions.map((f) => f.name),
				classes: codeStructure.classes.map((c) => c.name),
				interfaces: codeStructure.interfaces.map((i) => i.name),
				types: codeStructure.types.map((t) => t.name),
				isEntryPoint: this.isEntryPoint(filePath, content),
				isConfiguration: this.isConfigurationFile(filePath, content),
				isGenerated: this.isGeneratedFile(filePath, content),
				lastModified: stats.mtime,
				fileHash,
			}

			// Cache the analysis
			this.fileAnalysisCache.set(filePath, analysis)

			return analysis
		} catch (error) {
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
				stack: error instanceof Error ? sanitizeErrorMessage(error.stack || "") : undefined,
				location: "SchematicAnalyzer.analyzeFile",
				filePath,
			})

			// Return minimal analysis on error
			return this.createMinimalAnalysis(filePath)
		}
	}

	/**
	 * Analyzes code structure using the existing code parser
	 */
	private async analyzeCodeStructure(filePath: string, content: string): Promise<CodeStructure> {
		try {
			const blocks = await this.codeParser.parseFile(filePath, { content })

			const structure: CodeStructure = {
				filePath,
				functions: [],
				classes: [],
				interfaces: [],
				types: [],
				imports: [],
				exports: [],
			}

			// Extract structure information from parsed blocks
			for (const block of blocks) {
				switch (block.type) {
					case "function":
						structure.functions.push(this.extractFunctionInfo(block, content))
						break
					case "class":
						structure.classes.push(this.extractClassInfo(block, content))
						break
					case "interface":
						structure.interfaces.push(this.extractInterfaceInfo(block, content))
						break
					case "type":
						structure.types.push(this.extractTypeInfo(block, content))
						break
				}
			}

			// Extract imports and exports using regex patterns
			structure.imports = this.extractImports(content)
			structure.exports = this.extractExportsDetailed(content)

			return structure
		} catch (error) {
			// Return empty structure on parsing error
			return {
				filePath,
				functions: [],
				classes: [],
				interfaces: [],
				types: [],
				imports: [],
				exports: [],
			}
		}
	}

	/**
	 * Categorizes a file based on its path and content
	 */
	private categorizeFile(filePath: string, content: string): FileCategory {
		const fileName = path.basename(filePath).toLowerCase()
		const relativePath = path.relative(this.workspacePath, filePath).toLowerCase()
		const extension = path.extname(filePath).toLowerCase()

		// Entry points
		if (this.isEntryPoint(filePath, content)) {
			return FileCategory.ENTRY_POINT
		}

		// Configuration files
		if (this.isConfigurationFile(filePath, content)) {
			return FileCategory.CONFIGURATION
		}

		// Test files
		if (
			relativePath.includes("test") ||
			relativePath.includes("spec") ||
			fileName.includes("test") ||
			fileName.includes("spec") ||
			relativePath.includes("__tests__")
		) {
			return FileCategory.TEST
		}

		// Documentation
		if (
			[".md", ".txt", ".rst", ".adoc"].includes(extension) ||
			relativePath.includes("doc") ||
			relativePath.includes("readme")
		) {
			return FileCategory.DOCUMENTATION
		}

		// Generated files
		if (this.isGeneratedFile(filePath, content)) {
			return FileCategory.GENERATED
		}

		// Assets
		if (
			[".json", ".yaml", ".yml", ".xml", ".csv"].includes(extension) &&
			!this.isConfigurationFile(filePath, content)
		) {
			return FileCategory.ASSET
		}

		// Utility files
		if (
			relativePath.includes("util") ||
			relativePath.includes("helper") ||
			relativePath.includes("lib") ||
			fileName.includes("util") ||
			fileName.includes("helper")
		) {
			return FileCategory.UTILITY
		}

		// Core logic (default for code files)
		if (scannerExtensions.includes(extension)) {
			return FileCategory.CORE_LOGIC
		}

		return FileCategory.UNKNOWN
	}

	/**
	 * Calculates importance level based on category and other factors
	 */
	private calculateImportance(category: FileCategory, filePath: string, content: string): ImportanceLevel {
		switch (category) {
			case FileCategory.ENTRY_POINT:
				return ImportanceLevel.CRITICAL
			case FileCategory.CONFIGURATION:
				// Main config files are critical, others are high
				const fileName = path.basename(filePath).toLowerCase()
				if (["package.json", "tsconfig.json", "webpack.config.js", "vite.config.js"].includes(fileName)) {
					return ImportanceLevel.CRITICAL
				}
				return ImportanceLevel.HIGH
			case FileCategory.CORE_LOGIC:
				// Analyze content complexity and dependencies
				const complexity = this.calculateComplexity(content, null)
				const dependencies = this.extractDependencies(
					content,
					this.detectLanguage(path.extname(filePath), content),
				)

				if (complexity > 50 || dependencies.length > 10) {
					return ImportanceLevel.HIGH
				}
				return ImportanceLevel.MEDIUM
			case FileCategory.UTILITY:
				return ImportanceLevel.MEDIUM
			case FileCategory.TEST:
				return ImportanceLevel.LOW
			case FileCategory.DOCUMENTATION:
				return ImportanceLevel.LOW
			case FileCategory.ASSET:
				return ImportanceLevel.LOW
			case FileCategory.GENERATED:
				return ImportanceLevel.MINIMAL
			default:
				return ImportanceLevel.LOW
		}
	}

	/**
	 * Detects programming language from extension and content
	 */
	private detectLanguage(extension: string, content: string): string {
		const languageMap: Record<string, string> = {
			".ts": "typescript",
			".tsx": "typescript",
			".js": "javascript",
			".jsx": "javascript",
			".py": "python",
			".java": "java",
			".cpp": "cpp",
			".c": "c",
			".h": "c",
			".cs": "csharp",
			".go": "go",
			".rs": "rust",
			".php": "php",
			".rb": "ruby",
			".swift": "swift",
			".kt": "kotlin",
			".scala": "scala",
			".clj": "clojure",
			".hs": "haskell",
			".ml": "ocaml",
			".fs": "fsharp",
			".vb": "vb",
			".sql": "sql",
			".html": "html",
			".css": "css",
			".scss": "scss",
			".less": "less",
			".vue": "vue",
			".svelte": "svelte",
			".md": "markdown",
			".json": "json",
			".xml": "xml",
			".yaml": "yaml",
			".yml": "yaml",
			".toml": "toml",
			".ini": "ini",
			".cfg": "config",
			".conf": "config",
		}

		return languageMap[extension] || "unknown"
	}

	/**
	 * Calculates code complexity based on various metrics
	 */
	private calculateComplexity(content: string, structure: CodeStructure | null): number {
		let complexity = 0

		// Basic complexity indicators
		const lines = content.split("\n")
		complexity += lines.length * 0.1 // Base complexity from line count

		// Control flow complexity
		const controlFlowPatterns = [
			/\bif\b/g,
			/\belse\b/g,
			/\bfor\b/g,
			/\bwhile\b/g,
			/\bswitch\b/g,
			/\bcatch\b/g,
			/\btry\b/g,
			/\bthrow\b/g,
			/\breturn\b/g,
		]

		for (const pattern of controlFlowPatterns) {
			const matches = content.match(pattern)
			if (matches) {
				complexity += matches.length * 2
			}
		}

		// Function and class complexity
		if (structure) {
			complexity += structure.functions.length * 3
			complexity += structure.classes.length * 5
			complexity += structure.interfaces.length * 2
		}

		return Math.round(complexity)
	}

	/**
	 * Extracts dependencies from file content
	 */
	private extractDependencies(content: string, language: string): string[] {
		const dependencies: string[] = []

		switch (language) {
			case "typescript":
			case "javascript":
				// ES6 imports and CommonJS requires
				const importMatches = content.match(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g)
				const requireMatches = content.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g)

				if (importMatches) {
					importMatches.forEach((match) => {
						const moduleMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/)
						if (moduleMatch) dependencies.push(moduleMatch[1])
					})
				}

				if (requireMatches) {
					requireMatches.forEach((match) => {
						const moduleMatch = match.match(/['"`]([^'"`]+)['"`]/)
						if (moduleMatch) dependencies.push(moduleMatch[1])
					})
				}
				break

			case "python":
				const pythonImports = content.match(/(?:from\s+(\S+)\s+import|import\s+(\S+))/g)
				if (pythonImports) {
					pythonImports.forEach((match) => {
						const fromMatch = match.match(/from\s+(\S+)\s+import/)
						const importMatch = match.match(/import\s+(\S+)/)
						if (fromMatch) dependencies.push(fromMatch[1])
						if (importMatch) dependencies.push(importMatch[1])
					})
				}
				break

			case "java":
				const javaImports = content.match(/import\s+([^;]+);/g)
				if (javaImports) {
					javaImports.forEach((match) => {
						const importMatch = match.match(/import\s+([^;]+);/)
						if (importMatch) dependencies.push(importMatch[1])
					})
				}
				break
		}

		return [...new Set(dependencies)] // Remove duplicates
	}

	/**
	 * Extracts exports from file content
	 */
	private extractExports(content: string, language: string): string[] {
		const exports: string[] = []

		switch (language) {
			case "typescript":
			case "javascript":
				// Named exports
				const namedExports = content.match(/export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g)
				if (namedExports) {
					namedExports.forEach((match) => {
						const nameMatch = match.match(
							/export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/,
						)
						if (nameMatch) exports.push(nameMatch[1])
					})
				}

				// Export statements
				const exportStatements = content.match(/export\s*\{\s*([^}]+)\s*\}/g)
				if (exportStatements) {
					exportStatements.forEach((match) => {
						const namesMatch = match.match(/export\s*\{\s*([^}]+)\s*\}/)
						if (namesMatch) {
							const names = namesMatch[1].split(",").map((n) => n.trim().split(" as ")[0])
							exports.push(...names)
						}
					})
				}

				// Default export
				if (content.includes("export default")) {
					exports.push("default")
				}
				break
		}

		return [...new Set(exports)] // Remove duplicates
	}

	/**
	 * Checks if a file is an entry point
	 */
	private isEntryPoint(filePath: string, content: string): boolean {
		const fileName = path.basename(filePath).toLowerCase()
		const entryPointNames = [
			"main.ts",
			"main.js",
			"index.ts",
			"index.js",
			"app.ts",
			"app.js",
			"server.ts",
			"server.js",
			"extension.ts",
			"extension.js",
		]

		if (entryPointNames.includes(fileName)) {
			return true
		}

		// Check for main function or application bootstrap patterns
		const entryPatterns = [
			/function\s+main\s*\(/,
			/const\s+main\s*=/,
			/app\.listen\s*\(/,
			/createApp\s*\(/,
			/bootstrap\s*\(/,
			/vscode\.activate/,
		]

		return entryPatterns.some((pattern) => pattern.test(content))
	}

	/**
	 * Checks if a file is a configuration file
	 */
	private isConfigurationFile(filePath: string, content: string): boolean {
		const fileName = path.basename(filePath).toLowerCase()
		const configFiles = [
			"package.json",
			"tsconfig.json",
			"webpack.config.js",
			"vite.config.js",
			"rollup.config.js",
			"babel.config.js",
			".eslintrc.js",
			".eslintrc.json",
			"jest.config.js",
			"vitest.config.js",
			"tailwind.config.js",
			"next.config.js",
			"nuxt.config.js",
			"vue.config.js",
			"angular.json",
			"karma.conf.js",
			"protractor.conf.js",
			"cypress.config.js",
			"playwright.config.js",
		]

		if (configFiles.includes(fileName)) {
			return true
		}

		// Check for config patterns in filename
		if (
			fileName.includes("config") ||
			fileName.includes("settings") ||
			fileName.includes(".env") ||
			fileName.startsWith(".")
		) {
			return true
		}

		return false
	}

	/**
	 * Checks if a file is generated
	 */
	private isGeneratedFile(filePath: string, content: string): boolean {
		const fileName = path.basename(filePath).toLowerCase()

		// Common generated file patterns
		if (
			fileName.includes(".generated.") ||
			fileName.includes(".gen.") ||
			fileName.includes("_generated") ||
			fileName.includes("-generated") ||
			fileName.endsWith(".d.ts") ||
			fileName.includes(".min.")
		) {
			return true
		}

		// Check for generated file markers in content
		const generatedMarkers = [
			"// This file is auto-generated",
			"/* This file is auto-generated",
			"# This file is auto-generated",
			"// Generated by",
			"/* Generated by",
			"# Generated by",
			"@generated",
			"// DO NOT EDIT",
			"/* DO NOT EDIT",
			"# DO NOT EDIT",
		]

		const firstLines = content.split("\n").slice(0, 10).join("\n")
		return generatedMarkers.some((marker) => firstLines.includes(marker))
	}

	/**
	 * Creates minimal analysis for error cases
	 */
	private createMinimalAnalysis(filePath: string): FileAnalysis {
		const extension = path.extname(filePath).toLowerCase()
		const language = this.detectLanguage(extension, "")

		return {
			filePath,
			category: FileCategory.UNKNOWN,
			importance: ImportanceLevel.LOW,
			language,
			fileSize: 0,
			lineCount: 0,
			complexity: 0,
			dependencies: [],
			exports: [],
			functions: [],
			classes: [],
			interfaces: [],
			types: [],
			isEntryPoint: false,
			isConfiguration: false,
			isGenerated: false,
			lastModified: new Date(),
			fileHash: "",
		}
	}

	/**
	 * Extract function information from code block
	 */
	private extractFunctionInfo(block: CodeBlock, content: string): FunctionInfo {
		const lines = content.split("\n")
		const functionContent = lines.slice(block.start_line - 1, block.end_line).join("\n")

		// Basic function analysis
		const name = block.identifier || "anonymous"
		const isAsync = functionContent.includes("async ")
		const isExported = functionContent.includes("export ")

		// Extract parameters (simplified)
		const paramMatch = functionContent.match(/\(([^)]*)\)/)
		const parameters = paramMatch
			? paramMatch[1]
					.split(",")
					.map((p) => p.trim())
					.filter((p) => p)
			: []

		// Calculate function complexity
		const complexity = this.calculateComplexity(functionContent, null)

		return {
			name,
			startLine: block.start_line,
			endLine: block.end_line,
			parameters,
			isAsync,
			isExported,
			complexity,
		}
	}

	/**
	 * Extract class information from code block
	 */
	private extractClassInfo(block: CodeBlock, content: string): ClassInfo {
		const lines = content.split("\n")
		const classContent = lines.slice(block.start_line - 1, block.end_line).join("\n")

		const name = block.identifier || "anonymous"
		const isExported = classContent.includes("export ")

		// Extract methods and properties (simplified)
		const methods = (classContent.match(/\w+\s*\([^)]*\)\s*\{/g) || [])
			.map((m) => m.match(/(\w+)\s*\(/)?.[1] || "")
			.filter((m) => m)

		const properties = (classContent.match(/(?:public|private|protected)?\s*\w+\s*[:=]/g) || [])
			.map((p) => p.match(/(\w+)\s*[:=]/)?.[1] || "")
			.filter((p) => p)

		return {
			name,
			startLine: block.start_line,
			endLine: block.end_line,
			methods,
			properties,
			extends: undefined,
			implements: [],
			isExported,
		}
	}

	/**
	 * Extract interface information from code block
	 */
	private extractInterfaceInfo(block: CodeBlock, content: string): InterfaceInfo {
		const lines = content.split("\n")
		const interfaceContent = lines.slice(block.start_line - 1, block.end_line).join("\n")

		const name = block.identifier || "anonymous"
		const isExported = interfaceContent.includes("export ")

		// Extract properties and methods (simplified)
		const properties = (interfaceContent.match(/\w+\s*[:?]/g) || [])
			.map((p) => p.match(/(\w+)\s*[:?]/)?.[1] || "")
			.filter((p) => p)

		const methods = (interfaceContent.match(/\w+\s*\([^)]*\)\s*:/g) || [])
			.map((m) => m.match(/(\w+)\s*\(/)?.[1] || "")
			.filter((m) => m)

		return {
			name,
			startLine: block.start_line,
			endLine: block.end_line,
			properties,
			methods,
			extends: [],
			isExported,
		}
	}

	/**
	 * Extract type information from code block
	 */
	private extractTypeInfo(block: CodeBlock, content: string): TypeInfo {
		const lines = content.split("\n")
		const typeContent = lines.slice(block.start_line - 1, block.end_line).join("\n")

		const name = block.identifier || "anonymous"
		const isExported = typeContent.includes("export ")

		let type: "type" | "enum" | "const" = "type"
		if (typeContent.includes("enum ")) type = "enum"
		if (typeContent.includes("const ")) type = "const"

		return {
			name,
			startLine: block.start_line,
			endLine: block.end_line,
			type,
			isExported,
		}
	}

	/**
	 * Extract detailed import information
	 */
	private extractImports(content: string): ImportInfo[] {
		const imports: ImportInfo[] = []
		const lines = content.split("\n")

		lines.forEach((line, index) => {
			// ES6 imports
			const importMatch = line.match(/import\s+(.+?)\s+from\s+['"`]([^'"`]+)['"`]/)
			if (importMatch) {
				const importClause = importMatch[1].trim()
				const module = importMatch[2]

				let isDefault = false
				let isNamespace = false
				let importNames: string[] = []

				if (importClause.startsWith("{") && importClause.endsWith("}")) {
					// Named imports
					importNames = importClause
						.slice(1, -1)
						.split(",")
						.map((n) => n.trim())
				} else if (importClause.includes("* as ")) {
					// Namespace import
					isNamespace = true
					const namespaceMatch = importClause.match(/\*\s+as\s+(\w+)/)
					if (namespaceMatch) importNames = [namespaceMatch[1]]
				} else {
					// Default import
					isDefault = true
					importNames = [importClause]
				}

				imports.push({
					module,
					imports: importNames,
					isDefault,
					isNamespace,
					line: index + 1,
				})
			}
		})

		return imports
	}

	/**
	 * Extract detailed export information
	 */
	private extractExportsDetailed(content: string): ExportInfo[] {
		const exports: ExportInfo[] = []
		const lines = content.split("\n")

		lines.forEach((line, index) => {
			// Export declarations
			const exportMatch = line.match(/export\s+(const|let|var|function|class|interface|type)\s+(\w+)/)
			if (exportMatch) {
				const type = exportMatch[1] as ExportInfo["type"]
				const name = exportMatch[2]
				exports.push({ name, type, line: index + 1 })
			}

			// Default export
			if (line.includes("export default")) {
				exports.push({ name: "default", type: "default", line: index + 1 })
			}
		})

		return exports
	}

	/**
	 * Analyzes entire workspace and builds dependency graph
	 */
	async analyzeWorkspace(filePaths: string[]): Promise<WorkspaceAnalysis> {
		const now = Date.now()

		// Return cached analysis if recent
		if (this.workspaceAnalysisCache && now - this.lastAnalysisTime < 300000) {
			// 5 minutes
			return this.workspaceAnalysisCache
		}

		const fileAnalyses: FileAnalysis[] = []
		const dependencyGraph: DependencyRelation[] = []

		// Analyze all files
		for (const filePath of filePaths) {
			try {
				const analysis = await this.analyzeFile(filePath)
				fileAnalyses.push(analysis)

				// Build dependency relationships
				for (const dep of analysis.dependencies) {
					dependencyGraph.push({
						from: filePath,
						to: dep,
						type: "import",
						isExternal: !dep.startsWith(".") && !dep.startsWith("/"),
					})
				}
			} catch (error) {
				console.warn(`Failed to analyze file ${filePath}:`, error)
			}
		}

		// Calculate statistics
		const filesByCategory: Record<FileCategory, number> = {
			[FileCategory.ENTRY_POINT]: 0,
			[FileCategory.CONFIGURATION]: 0,
			[FileCategory.CORE_LOGIC]: 0,
			[FileCategory.UTILITY]: 0,
			[FileCategory.TEST]: 0,
			[FileCategory.DOCUMENTATION]: 0,
			[FileCategory.ASSET]: 0,
			[FileCategory.GENERATED]: 0,
			[FileCategory.UNKNOWN]: 0,
		}

		const filesByImportance: Record<ImportanceLevel, number> = {
			[ImportanceLevel.CRITICAL]: 0,
			[ImportanceLevel.HIGH]: 0,
			[ImportanceLevel.MEDIUM]: 0,
			[ImportanceLevel.LOW]: 0,
			[ImportanceLevel.MINIMAL]: 0,
		}

		const languageDistribution: Record<string, number> = {}
		let totalComplexity = 0
		let totalLinesOfCode = 0

		for (const analysis of fileAnalyses) {
			filesByCategory[analysis.category]++
			filesByImportance[analysis.importance]++

			languageDistribution[analysis.language] = (languageDistribution[analysis.language] || 0) + 1
			totalComplexity += analysis.complexity
			totalLinesOfCode += analysis.lineCount
		}

		const entryPoints = fileAnalyses.filter((f) => f.isEntryPoint).map((f) => f.filePath)

		const configurationFiles = fileAnalyses.filter((f) => f.isConfiguration).map((f) => f.filePath)

		const averageComplexity = fileAnalyses.length > 0 ? totalComplexity / fileAnalyses.length : 0

		const analysis: WorkspaceAnalysis = {
			totalFiles: fileAnalyses.length,
			filesByCategory,
			filesByImportance,
			languageDistribution,
			dependencyGraph,
			entryPoints,
			configurationFiles,
			averageComplexity,
			totalLinesOfCode,
			analysisTimestamp: new Date(),
		}

		// Cache the analysis
		this.workspaceAnalysisCache = analysis
		this.lastAnalysisTime = now

		return analysis
	}

	/**
	 * Gets files sorted by processing priority
	 */
	getFilesByPriority(filePaths: string[]): Promise<string[]> {
		return new Promise(async (resolve) => {
			const fileAnalyses: Array<{ path: string; importance: ImportanceLevel; category: FileCategory }> = []

			for (const filePath of filePaths) {
				try {
					const analysis = await this.analyzeFile(filePath)
					fileAnalyses.push({
						path: filePath,
						importance: analysis.importance,
						category: analysis.category,
					})
				} catch (error) {
					// Add with low priority if analysis fails
					fileAnalyses.push({
						path: filePath,
						importance: ImportanceLevel.LOW,
						category: FileCategory.UNKNOWN,
					})
				}
			}

			// Sort by importance (highest first), then by category priority
			const categoryPriority = {
				[FileCategory.ENTRY_POINT]: 1,
				[FileCategory.CONFIGURATION]: 2,
				[FileCategory.CORE_LOGIC]: 3,
				[FileCategory.UTILITY]: 4,
				[FileCategory.TEST]: 5,
				[FileCategory.DOCUMENTATION]: 6,
				[FileCategory.ASSET]: 7,
				[FileCategory.GENERATED]: 8,
				[FileCategory.UNKNOWN]: 9,
			}

			fileAnalyses.sort((a, b) => {
				// First sort by importance (higher importance first)
				if (a.importance !== b.importance) {
					return b.importance - a.importance
				}
				// Then by category priority
				return categoryPriority[a.category] - categoryPriority[b.category]
			})

			resolve(fileAnalyses.map((f) => f.path))
		})
	}

	/**
	 * Gets intelligent batching suggestions based on file relationships
	 */
	async getIntelligentBatches(filePaths: string[], batchSize: number = 50): Promise<string[][]> {
		const batches: string[][] = []
		const processed = new Set<string>()

		// Get file analyses
		const analyses = new Map<string, FileAnalysis>()
		for (const filePath of filePaths) {
			try {
				const analysis = await this.analyzeFile(filePath)
				analyses.set(filePath, analysis)
			} catch (error) {
				// Skip files that can't be analyzed
				continue
			}
		}

		// Group related files together
		for (const filePath of filePaths) {
			if (processed.has(filePath)) continue

			const batch: string[] = []
			const analysis = analyses.get(filePath)

			if (!analysis) continue

			batch.push(filePath)
			processed.add(filePath)

			// Find related files (same directory, dependencies, similar names)
			const directory = path.dirname(filePath)
			const baseName = path.basename(filePath, path.extname(filePath))

			for (const otherPath of filePaths) {
				if (processed.has(otherPath) || batch.length >= batchSize) break

				const otherAnalysis = analyses.get(otherPath)
				if (!otherAnalysis) continue

				// Same directory
				if (path.dirname(otherPath) === directory) {
					batch.push(otherPath)
					processed.add(otherPath)
					continue
				}

				// Dependency relationship
				if (
					analysis.dependencies.some((dep) => otherPath.includes(dep)) ||
					otherAnalysis.dependencies.some((dep) => filePath.includes(dep))
				) {
					batch.push(otherPath)
					processed.add(otherPath)
					continue
				}

				// Similar names (likely related)
				const otherBaseName = path.basename(otherPath, path.extname(otherPath))
				if (baseName.includes(otherBaseName) || otherBaseName.includes(baseName)) {
					batch.push(otherPath)
					processed.add(otherPath)
					continue
				}
			}

			if (batch.length > 0) {
				batches.push(batch)
			}
		}

		return batches
	}

	/**
	 * Estimates processing time for a file based on its characteristics
	 */
	async estimateProcessingTime(filePath: string): Promise<number> {
		try {
			const analysis = await this.analyzeFile(filePath)

			// Base time calculation (in milliseconds)
			let estimatedTime = 100 // Base processing time

			// Add time based on file size
			estimatedTime += analysis.fileSize * 0.001 // 1ms per KB

			// Add time based on complexity
			estimatedTime += analysis.complexity * 10 // 10ms per complexity point

			// Add time based on line count
			estimatedTime += analysis.lineCount * 2 // 2ms per line

			// Adjust based on file category
			switch (analysis.category) {
				case FileCategory.ENTRY_POINT:
					estimatedTime *= 1.5 // Entry points are more complex
					break
				case FileCategory.CORE_LOGIC:
					estimatedTime *= 1.2
					break
				case FileCategory.GENERATED:
					estimatedTime *= 0.5 // Generated files are simpler
					break
			}

			return Math.max(50, Math.round(estimatedTime)) // Minimum 50ms
		} catch (error) {
			return 200 // Default estimate for failed analysis
		}
	}

	/**
	 * Clears analysis caches
	 */
	clearCache(): void {
		this.fileAnalysisCache.clear()
		this.dependencyCache.clear()
		this.workspaceAnalysisCache = null
		this.lastAnalysisTime = 0
	}

	/**
	 * Gets cached file analysis if available
	 */
	getCachedAnalysis(filePath: string): FileAnalysis | undefined {
		return this.fileAnalysisCache.get(filePath)
	}

	/**
	 * Gets workspace analysis summary
	 */
	getWorkspaceAnalysis(): WorkspaceAnalysis | null {
		return this.workspaceAnalysisCache
	}

	/**
	 * Checks if a file should be prioritized for indexing
	 */
	async shouldPrioritizeFile(filePath: string): Promise<boolean> {
		try {
			const analysis = await this.analyzeFile(filePath)
			return analysis.importance >= ImportanceLevel.HIGH || analysis.isEntryPoint || analysis.isConfiguration
		} catch (error) {
			return false
		}
	}

	/**
	 * Gets recommended processing order for optimal indexing
	 */
	async getOptimalProcessingOrder(filePaths: string[]): Promise<{
		critical: string[]
		high: string[]
		medium: string[]
		low: string[]
		minimal: string[]
	}> {
		const result = {
			critical: [] as string[],
			high: [] as string[],
			medium: [] as string[],
			low: [] as string[],
			minimal: [] as string[],
		}

		for (const filePath of filePaths) {
			try {
				const analysis = await this.analyzeFile(filePath)

				switch (analysis.importance) {
					case ImportanceLevel.CRITICAL:
						result.critical.push(filePath)
						break
					case ImportanceLevel.HIGH:
						result.high.push(filePath)
						break
					case ImportanceLevel.MEDIUM:
						result.medium.push(filePath)
						break
					case ImportanceLevel.LOW:
						result.low.push(filePath)
						break
					case ImportanceLevel.MINIMAL:
						result.minimal.push(filePath)
						break
				}
			} catch (error) {
				result.low.push(filePath) // Default to low priority
			}
		}

		return result
	}
}

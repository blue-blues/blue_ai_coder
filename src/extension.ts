import * as vscode from "vscode"
import * as dotenvx from "@dotenvx/dotenvx"
import * as path from "path"

// Load environment variables from .env file
try {
	// Specify path to .env file in the project root directory
	const envPath = path.join(__dirname, "..", ".env")
	dotenvx.config({ path: envPath })
} catch (e) {
	// Silently handle environment loading errors
	console.warn("Failed to load environment variables:", e)
}

import { CloudService } from "@roo-code/cloud"
import { TelemetryService, PostHogTelemetryClient } from "@roo-code/telemetry"

import "./utils/path" // Necessary to have access to String.prototype.toPosix.
import { createOutputChannelLogger, createDualLogger } from "./utils/outputChannelLogger"

import { Package } from "./shared/package"
import { formatLanguage } from "./shared/language"
import { ContextProxy } from "./core/config/ContextProxy"
import { ClineProvider } from "./core/webview/ClineProvider"
import { DIFF_VIEW_URI_SCHEME } from "./integrations/editor/DiffViewProvider"
import { TerminalRegistry } from "./integrations/terminal/TerminalRegistry"
import { McpServerManager } from "./services/mcp/McpServerManager"
import { CodeIndexManager } from "./services/code-index/manager"
import { SchematicAnalyzer } from "./services/code-index/SchematicAnalyzer"
import { BackgroundIndexingService } from "./services/code-index/BackgroundIndexingService"
import { PerformanceMonitor } from "./services/code-index/PerformanceMonitor"
import { registerCommitMessageProvider } from "./services/commit-message"
import { MdmService } from "./services/mdm/MdmService"
import { migrateSettings } from "./utils/migrateSettings"
import { checkAndRunAutoLaunchingTask as checkAndRunAutoLaunchingTask } from "./utils/autoLaunchingTask"
import { autoImportSettings } from "./utils/autoImportSettings"
import { API } from "./extension/api"

import {
	handleUri,
	registerCommands,
	registerCodeActions,
	registerTerminalActions,
	CodeActionProvider,
} from "./activate"
import { initializeI18n } from "./i18n"
import { registerGhostProvider } from "./services/ghost" // bluescode_change
import { TerminalWelcomeService } from "./services/terminal-welcome/TerminalWelcomeService" // bluescode_change
import { runEnhancedIndexingIntegrationTests } from "./test-enhanced-indexing-integration"
import { StartupIndexingCoordinator } from "./services/startup-indexing/StartupIndexingCoordinator"
import { StartupIndexingCompatibility } from "./services/startup-indexing/StartupIndexingCompatibility"

/**
 * Built using https://github.com/microsoft/vscode-webview-ui-toolkit
 *
 * Inspired by:
 *  - https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/default/weather-webview
 *  - https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/frameworks/hello-world-react-cra
 */

let outputChannel: vscode.OutputChannel
let extensionContext: vscode.ExtensionContext

// This method is called when your extension is activated.
// Your extension is activated the very first time the command is executed.
export async function activate(context: vscode.ExtensionContext) {
	extensionContext = context
	outputChannel = vscode.window.createOutputChannel("Blues-Code")
	context.subscriptions.push(outputChannel)
	outputChannel.appendLine(`${Package.name} extension activated - ${JSON.stringify(Package)}`)

	// Migrate old settings to new
	await migrateSettings(context, outputChannel)

	// Initialize telemetry service.
	const telemetryService = TelemetryService.createInstance()

	try {
		telemetryService.register(new PostHogTelemetryClient())
	} catch (error) {
		console.warn("Failed to register PostHogTelemetryClient:", error)
	}

	// Create logger for cloud services
	const cloudLogger = createDualLogger(createOutputChannelLogger(outputChannel))

	// Initialize Roo Code Cloud service.
	const cloudService = await CloudService.createInstance(context, cloudLogger)
	const postStateListener = () => {
		ClineProvider.getVisibleInstance()?.postStateToWebview()
	}
	cloudService.on("auth-state-changed", postStateListener)
	cloudService.on("user-info", postStateListener)
	cloudService.on("settings-updated", postStateListener)
	// Add to subscriptions for proper cleanup on deactivate
	context.subscriptions.push(cloudService)

	// Initialize MDM service
	const mdmService = await MdmService.createInstance(cloudLogger)

	// Initialize i18n for internationalization support
	initializeI18n(context.globalState.get("language") ?? "en-US") // bluescode_change

	// Initialize terminal shell execution handlers.
	TerminalRegistry.initialize()

	// Get default commands from configuration.
	const defaultCommands = vscode.workspace.getConfiguration(Package.name).get<string[]>("allowedCommands") || []

	// Initialize global state if not already set.
	if (!context.globalState.get("allowedCommands")) {
		context.globalState.update("allowedCommands", defaultCommands)
	}

	// bluescode_change start
	if (!context.globalState.get("firstInstallCompleted")) {
		context.globalState.update("telemetrySetting", "enabled")
	}
	// bluescode_change end

	const contextProxy = await ContextProxy.getInstance(context)

	// Initialize startup indexing coordinator for enhanced startup experience
	let startupIndexingCoordinator: StartupIndexingCoordinator | null = null
	const codeIndexManagers: CodeIndexManager[] = []
	const schematicAnalyzers: SchematicAnalyzer[] = []
	const backgroundIndexingServices: BackgroundIndexingService[] = []
	const performanceMonitors: PerformanceMonitor[] = []

	if (vscode.workspace.workspaceFolders) {
		// Initialize compatibility layer
		const compatibilityLayer = new StartupIndexingCompatibility(outputChannel)

		// Check if startup indexing should be enabled based on compatibility
		const shouldEnable = compatibilityLayer.shouldEnableStartupIndexing()

		if (shouldEnable) {
			// Initialize startup indexing coordinator
			startupIndexingCoordinator = new StartupIndexingCoordinator(context, outputChannel)
			context.subscriptions.push(startupIndexingCoordinator)

			// Migrate legacy settings if needed
			await compatibilityLayer.migrateLegacySettings()
		} else {
			outputChannel.appendLine("[StartupIndexing] Startup indexing disabled by compatibility settings")
		}

		// Initialize code index managers and enhanced indexing services for all workspace folders
		for (const folder of vscode.workspace.workspaceFolders) {
			const manager = CodeIndexManager.getInstance(context, folder.uri.fsPath)
			if (manager) {
				codeIndexManagers.push(manager)
				try {
					await manager.initialize(contextProxy)

					// Initialize enhanced indexing services for this workspace
					const schematicAnalyzer = new SchematicAnalyzer(manager.codeParser, folder.uri.fsPath)
					const performanceMonitor = new PerformanceMonitor()
					const backgroundIndexingService = new BackgroundIndexingService(
						folder.uri.fsPath,
						manager.codeParser,
						schematicAnalyzer,
						performanceMonitor,
						manager.cacheManager,
						manager.orchestrator,
						manager.configManager,
					)

					schematicAnalyzers.push(schematicAnalyzer)
					backgroundIndexingServices.push(backgroundIndexingService)
					performanceMonitors.push(performanceMonitor)

					// Add to subscriptions for proper cleanup
					context.subscriptions.push(backgroundIndexingService)
					context.subscriptions.push(performanceMonitor)

					outputChannel.appendLine(
						`[EnhancedIndexing] Initialized enhanced indexing services for ${folder.uri.fsPath}`,
					)
				} catch (error) {
					outputChannel.appendLine(
						`[CodeIndexManager] Error during background CodeIndexManager configuration/indexing for ${folder.uri.fsPath}: ${error.message || error}`,
					)
				}
				context.subscriptions.push(manager)
			}
		}

		// Coordinate startup indexing to ensure maximum context before user interaction
		if (startupIndexingCoordinator) {
			try {
				outputChannel.appendLine("[StartupIndexing] Starting coordinated startup indexing...")

				// Validate backward compatibility before proceeding
				const compatibilityResult = await compatibilityLayer.validateBackwardCompatibility(codeIndexManagers)
				if (!compatibilityResult.isCompatible) {
					outputChannel.appendLine(
						`[StartupIndexing] Compatibility issues detected: ${compatibilityResult.issues.join(", ")}`,
					)
					if (compatibilityLayer.shouldFallbackToLegacyOnError()) {
						outputChannel.appendLine("[StartupIndexing] Falling back to legacy indexing behavior")
						// Continue without startup indexing
					}
				} else {
					// This will block user interaction until critical and high-priority files are indexed
					await startupIndexingCoordinator.coordinateStartupIndexing(
						codeIndexManagers,
						schematicAnalyzers,
						backgroundIndexingServices,
					)

					outputChannel.appendLine("[StartupIndexing] Startup indexing coordination completed successfully")
				}
			} catch (error) {
				outputChannel.appendLine(`[StartupIndexing] Startup indexing coordination failed: ${error.message}`)

				// Check if we should fallback to legacy behavior
				if (compatibilityLayer.shouldFallbackToLegacyOnError()) {
					outputChannel.appendLine("[StartupIndexing] Falling back to legacy indexing behavior")
				}

				// Continue with extension activation even if startup indexing fails
			}
		}
	}

	const provider = new ClineProvider(context, outputChannel, "sidebar", contextProxy, mdmService)
	TelemetryService.instance.setProvider(provider)

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ClineProvider.sideBarId, provider, {
			webviewOptions: { retainContextWhenHidden: true },
		}),
	)

	// bluescode_change start
	if (!context.globalState.get("firstInstallCompleted")) {
		outputChannel.appendLine("First installation detected, opening Blues Code sidebar!")
		try {
			await vscode.commands.executeCommand("blues-code.SidebarProvider.focus")

			outputChannel.appendLine("Opening Blues Code walkthrough")

			// this can crash, see:
			// https://discord.com/channels/1349288496988160052/1395865796026040470
			await vscode.commands.executeCommand(
				"workbench.action.openWalkthrough",
				"bluescode.blues-code#bluesCodeWalkthrough",
				false,
			)
		} catch (error) {
			outputChannel.appendLine(`Error during first-time setup: ${error.message}`)
		} finally {
			context.globalState.update("firstInstallCompleted", true)
		}
	}
	// bluescode_change end

	// Auto-import configuration if specified in settings
	try {
		await autoImportSettings(outputChannel, {
			providerSettingsManager: provider.providerSettingsManager,
			contextProxy: provider.contextProxy,
			customModesManager: provider.customModesManager,
		})
	} catch (error) {
		outputChannel.appendLine(
			`[AutoImport] Error during auto-import: ${error instanceof Error ? error.message : String(error)}`,
		)
	}

	registerCommands({ context, outputChannel, provider })

	// Register enhanced indexing integration test command
	context.subscriptions.push(
		vscode.commands.registerCommand("blues-code.testEnhancedIndexingIntegration", async () => {
			try {
				outputChannel.appendLine("[EnhancedIndexing] Starting integration tests...")
				await runEnhancedIndexingIntegrationTests(context)
				outputChannel.appendLine("[EnhancedIndexing] Integration tests completed successfully!")
				vscode.window.showInformationMessage("Enhanced indexing integration tests passed!")
			} catch (error) {
				const errorMessage = `Enhanced indexing integration tests failed: ${error.message || error}`
				outputChannel.appendLine(`[EnhancedIndexing] ${errorMessage}`)
				vscode.window.showErrorMessage(errorMessage)
			}
		}),
	)

	/**
	 * We use the text document content provider API to show the left side for diff
	 * view by creating a virtual document for the original content. This makes it
	 * readonly so users know to edit the right side if they want to keep their changes.
	 *
	 * This API allows you to create readonly documents in VSCode from arbitrary
	 * sources, and works by claiming an uri-scheme for which your provider then
	 * returns text contents. The scheme must be provided when registering a
	 * provider and cannot change afterwards.
	 *
	 * Note how the provider doesn't create uris for virtual documents - its role
	 * is to provide contents given such an uri. In return, content providers are
	 * wired into the open document logic so that providers are always considered.
	 *
	 * https://code.visualstudio.com/api/extension-guides/virtual-documents
	 */
	const diffContentProvider = new (class implements vscode.TextDocumentContentProvider {
		provideTextDocumentContent(uri: vscode.Uri): string {
			return Buffer.from(uri.query, "base64").toString("utf-8")
		}
	})()

	context.subscriptions.push(
		vscode.workspace.registerTextDocumentContentProvider(DIFF_VIEW_URI_SCHEME, diffContentProvider),
	)

	context.subscriptions.push(vscode.window.registerUriHandler({ handleUri }))

	// Register code actions provider.
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider({ pattern: "**/*" }, new CodeActionProvider(), {
			providedCodeActionKinds: CodeActionProvider.providedCodeActionKinds,
		}),
	)

	registerGhostProvider(context, provider) // bluescode_change
	registerCommitMessageProvider(context, outputChannel) // bluescode_change
	registerCodeActions(context)
	registerTerminalActions(context)

	// Allows other extensions to activate once Blues Code is ready.
	vscode.commands.executeCommand(`${Package.name}.activationCompleted`)

	// Implements the `RooCodeAPI` interface.
	const socketPath = process.env.BLUES_IPC_SOCKET_PATH ?? process.env.ROO_CODE_IPC_SOCKET_PATH // bluescode_change
	const enableLogging = typeof socketPath === "string"

	// Watch the core files and automatically reload the extension host.
	if (process.env.NODE_ENV === "development") {
		const pattern = "**/*.ts"

		const watchPaths = [
			{ path: context.extensionPath, name: "extension" },
			{ path: path.join(context.extensionPath, "../packages/types"), name: "types" },
			{ path: path.join(context.extensionPath, "../packages/telemetry"), name: "telemetry" },
			{ path: path.join(context.extensionPath, "../packages/cloud"), name: "cloud" },
		]

		console.log(
			`♻️♻️♻️ Core auto-reloading is ENABLED. Watching for changes in: ${watchPaths.map(({ name }) => name).join(", ")}`,
		)

		watchPaths.forEach(({ path: watchPath, name }) => {
			const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(watchPath, pattern))

			watcher.onDidChange((uri) => {
				console.log(`♻️ ${name} file changed: ${uri.fsPath}. Reloading host…`)
				vscode.commands.executeCommand("workbench.action.reloadWindow")
			})

			context.subscriptions.push(watcher)
		})
	}

	await checkAndRunAutoLaunchingTask(context) // bluescode_change

	return new API(outputChannel, provider, socketPath, enableLogging)
}

// This method is called when your extension is deactivated.
export async function deactivate() {
	outputChannel.appendLine(`${Package.name} extension deactivated`)
	await McpServerManager.cleanup(extensionContext)
	TelemetryService.instance.shutdown()
	TerminalRegistry.cleanup()
}

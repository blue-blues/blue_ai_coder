import { BluesCodeEventName } from "./events.js"
import { type ClineMessage, type BlockingAsk, type TokenUsage } from "./message.js"
import { type ToolUsage, type ToolName } from "./tool.js"

/**
 * TaskProviderLike
 */

export interface TaskProviderState {
	mode?: string
}

export interface TaskProviderLike {
	readonly cwd: string

	getCurrentCline(): TaskLike | undefined
	getCurrentTaskStack(): string[]

	initClineWithTask(text?: string, images?: string[], parentTask?: TaskLike): Promise<TaskLike>
	cancelTask(): Promise<void>
	clearTask(): Promise<void>
	postStateToWebview(): Promise<void>

	getState(): Promise<TaskProviderState>

	postMessageToWebview(message: unknown): Promise<void>

	on<K extends keyof TaskProviderEvents>(
		event: K,
		listener: (...args: TaskProviderEvents[K]) => void | Promise<void>,
	): this

	off<K extends keyof TaskProviderEvents>(
		event: K,
		listener: (...args: TaskProviderEvents[K]) => void | Promise<void>,
	): this

	context: {
		extension?: {
			packageJSON?: {
				version?: string
			}
		}
	}
}

export type TaskProviderEvents = {
	[BluesCodeEventName.TaskCreated]: [task: TaskLike]

	// Proxied from the Task EventEmitter.
	[BluesCodeEventName.TaskStarted]: [taskId: string]
	[BluesCodeEventName.TaskCompleted]: [taskId: string, tokenUsage: TokenUsage, toolUsage: ToolUsage]
	[BluesCodeEventName.TaskAborted]: [taskId: string]
	[BluesCodeEventName.TaskFocused]: [taskId: string]
	[BluesCodeEventName.TaskUnfocused]: [taskId: string]
	[BluesCodeEventName.TaskActive]: [taskId: string]
	[BluesCodeEventName.TaskIdle]: [taskId: string]
}

/**
 * TaskLike
 */

export interface TaskLike {
	readonly taskId: string
	readonly rootTask?: TaskLike
	readonly blockingAsk?: BlockingAsk

	on<K extends keyof TaskEvents>(event: K, listener: (...args: TaskEvents[K]) => void | Promise<void>): this
	off<K extends keyof TaskEvents>(event: K, listener: (...args: TaskEvents[K]) => void | Promise<void>): this

	setMessageResponse(text: string, images?: string[]): void
}

export type TaskEvents = {
	// Task Lifecycle
	[BluesCodeEventName.TaskStarted]: []
	[BluesCodeEventName.TaskCompleted]: [taskId: string, tokenUsage: TokenUsage, toolUsage: ToolUsage]
	[BluesCodeEventName.TaskAborted]: []
	[BluesCodeEventName.TaskFocused]: []
	[BluesCodeEventName.TaskUnfocused]: []
	[BluesCodeEventName.TaskActive]: [taskId: string]
	[BluesCodeEventName.TaskIdle]: [taskId: string]

	// Subtask Lifecycle
	[BluesCodeEventName.TaskPaused]: []
	[BluesCodeEventName.TaskUnpaused]: []
	[BluesCodeEventName.TaskSpawned]: [taskId: string]

	// Task Execution
	[BluesCodeEventName.Message]: [{ action: "created" | "updated"; message: ClineMessage }]
	[BluesCodeEventName.TaskModeSwitched]: [taskId: string, mode: string]
	[BluesCodeEventName.TaskAskResponded]: []

	// Task Analytics
	[BluesCodeEventName.TaskToolFailed]: [taskId: string, tool: ToolName, error: string]
	[BluesCodeEventName.TaskTokenUsageUpdated]: [taskId: string, tokenUsage: TokenUsage]
}

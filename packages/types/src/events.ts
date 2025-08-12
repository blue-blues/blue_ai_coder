import { z } from "zod"

import { clineMessageSchema, tokenUsageSchema } from "./message.js"
import { toolNamesSchema, toolUsageSchema } from "./tool.js"

/**
 * BluesCodeEventName
 */

export enum BluesCodeEventName {
	// Task Provider Lifecycle
	TaskCreated = "taskCreated",

	// Task Lifecycle
	TaskStarted = "taskStarted",
	TaskCompleted = "taskCompleted",
	TaskAborted = "taskAborted",
	TaskFocused = "taskFocused",
	TaskUnfocused = "taskUnfocused",
	TaskActive = "taskActive",
	TaskIdle = "taskIdle",

	// Subtask Lifecycle
	TaskPaused = "taskPaused",
	TaskUnpaused = "taskUnpaused",
	TaskSpawned = "taskSpawned",

	// Task Execution
	Message = "message",
	TaskModeSwitched = "taskModeSwitched",
	TaskAskResponded = "taskAskResponded",

	// Task Analytics
	TaskTokenUsageUpdated = "taskTokenUsageUpdated",
	TaskToolFailed = "taskToolFailed",

	// Evals
	EvalPass = "evalPass",
	EvalFail = "evalFail",
}

/**
 * BluesCodeEvents
 */

export const bluesCodeEventsSchema = z.object({
	[BluesCodeEventName.TaskCreated]: z.tuple([z.string()]),

	[BluesCodeEventName.TaskStarted]: z.tuple([z.string()]),
	[BluesCodeEventName.TaskCompleted]: z.tuple([
		z.string(),
		tokenUsageSchema,
		toolUsageSchema,
		z.object({
			isSubtask: z.boolean(),
		}),
	]),
	[BluesCodeEventName.TaskAborted]: z.tuple([z.string()]),
	[BluesCodeEventName.TaskFocused]: z.tuple([z.string()]),
	[BluesCodeEventName.TaskUnfocused]: z.tuple([z.string()]),
	[BluesCodeEventName.TaskActive]: z.tuple([z.string()]),
	[BluesCodeEventName.TaskIdle]: z.tuple([z.string()]),

	[BluesCodeEventName.TaskPaused]: z.tuple([z.string()]),
	[BluesCodeEventName.TaskUnpaused]: z.tuple([z.string()]),
	[BluesCodeEventName.TaskSpawned]: z.tuple([z.string(), z.string()]),

	[BluesCodeEventName.Message]: z.tuple([
		z.object({
			taskId: z.string(),
			action: z.union([z.literal("created"), z.literal("updated")]),
			message: clineMessageSchema,
		}),
	]),
	[BluesCodeEventName.TaskModeSwitched]: z.tuple([z.string(), z.string()]),
	[BluesCodeEventName.TaskAskResponded]: z.tuple([z.string()]),

	[BluesCodeEventName.TaskToolFailed]: z.tuple([z.string(), toolNamesSchema, z.string()]),
	[BluesCodeEventName.TaskTokenUsageUpdated]: z.tuple([z.string(), tokenUsageSchema]),
})

export type BluesCodeEvents = z.infer<typeof bluesCodeEventsSchema>

/**
 * TaskEvent
 */

export const taskEventSchema = z.discriminatedUnion("eventName", [
	// Task Provider Lifecycle
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskCreated),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskCreated],
		taskId: z.number().optional(),
	}),

	// Task Lifecycle
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskStarted),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskStarted],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskCompleted),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskCompleted],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskAborted),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskAborted],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskFocused),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskFocused],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskUnfocused),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskUnfocused],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskActive),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskActive],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskIdle),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskIdle],
		taskId: z.number().optional(),
	}),

	// Subtask Lifecycle
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskPaused),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskPaused],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskUnpaused),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskUnpaused],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskSpawned),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskSpawned],
		taskId: z.number().optional(),
	}),

	// Task Execution
	z.object({
		eventName: z.literal(BluesCodeEventName.Message),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.Message],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskModeSwitched),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskModeSwitched],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskAskResponded),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskAskResponded],
		taskId: z.number().optional(),
	}),

	// Task Analytics
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskToolFailed),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskToolFailed],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(BluesCodeEventName.TaskTokenUsageUpdated),
		payload: bluesCodeEventsSchema.shape[BluesCodeEventName.TaskTokenUsageUpdated],
		taskId: z.number().optional(),
	}),

	// Evals
	z.object({
		eventName: z.literal(BluesCodeEventName.EvalPass),
		payload: z.undefined(),
		taskId: z.number(),
	}),
	z.object({
		eventName: z.literal(BluesCodeEventName.EvalFail),
		payload: z.undefined(),
		taskId: z.number(),
	}),
])

export type TaskEvent = z.infer<typeof taskEventSchema>

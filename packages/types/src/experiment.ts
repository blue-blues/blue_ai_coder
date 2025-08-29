import { z } from "zod"

import type { Keys, Equals, AssertEqual } from "./type-fu.js"

/**
 * ExperimentId
 */

const bluesCodeExperimentIds = ["morphFastApply", "inlineAssist", "enableReflection", "showReflectionInsights"] as const
export const experimentIds = [
	"powerSteering",
	"multiFileApplyDiff",
	"preventFocusDisruption",
	"assistantMessageParser",
] as const

export const experimentIdsSchema = z.enum([...experimentIds, ...bluesCodeExperimentIds])

export type ExperimentId = z.infer<typeof experimentIdsSchema>

/**
 * Experiments
 */

export const experimentsSchema = z.object({
	morphFastApply: z.boolean().optional(), // bluescode_change
	powerSteering: z.boolean().optional(),
	multiFileApplyDiff: z.boolean().optional(),
	inlineAssist: z.boolean().optional(), // bluescode_change
	preventFocusDisruption: z.boolean().optional(),
	assistantMessageParser: z.boolean().optional(),
	enableReflection: z.boolean().optional(), // bluescode_change
	showReflectionInsights: z.boolean().optional(), // bluescode_change
})

export type Experiments = z.infer<typeof experimentsSchema>

type _AssertExperiments = AssertEqual<Equals<ExperimentId, Keys<Experiments>>>

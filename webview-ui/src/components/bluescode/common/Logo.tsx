import React from "react"
import AnimatedLogo, { LogoAnimationState } from "../../common/AnimatedLogo"
import { useLogoAnimation, useAnimationPreferences } from "../../common/useLogoAnimation"

interface LogoProps {
	width?: number
	height?: number
	animationState?: LogoAnimationState
	enableBlinking?: boolean
	enableHoverGlow?: boolean
	className?: string
}

export default function Logo({
	width = 100,
	height = 100,
	animationState,
	enableBlinking = true,
	enableHoverGlow = true,
	className = "mb-4 mt-4",
}: LogoProps) {
	const { prefersReducedMotion } = useAnimationPreferences()
	const logoAnimation = useLogoAnimation({
		enableBlinking: enableBlinking && !prefersReducedMotion,
		defaultState: "subtle",
	})

	const finalAnimationState = animationState || logoAnimation.animationState

	return (
		<AnimatedLogo
			width={width}
			height={height}
			animationState={finalAnimationState}
			enableHoverGlow={enableHoverGlow && !prefersReducedMotion}
			className={className}
		/>
	)
}

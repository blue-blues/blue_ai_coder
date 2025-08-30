import React, { useEffect, useState } from "react"
import AnimatedLogo, { LogoAnimationState } from "./AnimatedLogo"
import { useAnimationPreferences } from "./useLogoAnimation"

interface LoadingLogoProps {
	isLoading?: boolean
	isProcessing?: boolean
	isActive?: boolean
	width?: number
	height?: number
	className?: string
	loadingText?: string
	processingText?: string
}

export default function LoadingLogo({
	isLoading = false,
	isProcessing = false,
	isActive = false,
	width = 50,
	height = 50,
	className = "",
	loadingText = "Loading...",
	processingText = "Processing...",
}: LoadingLogoProps) {
	const { prefersReducedMotion } = useAnimationPreferences()
	const [animationState, setAnimationState] = useState<LogoAnimationState>("none")

	useEffect(() => {
		if (prefersReducedMotion) {
			setAnimationState("none")
			return
		}

		if (isLoading) {
			setAnimationState("loading")
		} else if (isProcessing) {
			setAnimationState("processing")
		} else if (isActive) {
			setAnimationState("active")
		} else {
			setAnimationState("subtle")
		}
	}, [isLoading, isProcessing, isActive, prefersReducedMotion])

	const getStatusText = () => {
		if (isLoading) return loadingText
		if (isProcessing) return processingText
		return null
	}

	const statusText = getStatusText()

	return (
		<div className={`flex flex-col items-center justify-center ${className}`}>
			<AnimatedLogo
				width={width}
				height={height}
				animationState={animationState}
				enableHoverGlow={!prefersReducedMotion && !isLoading && !isProcessing}
			/>
			{statusText && (
				<div className="text-sm text-vscode-descriptionForeground mt-2 text-center">{statusText}</div>
			)}
		</div>
	)
}

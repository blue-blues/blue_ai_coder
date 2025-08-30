import { useState, useEffect } from "react"
import { LogoAnimationState } from "./AnimatedLogo"

export interface LogoAnimationConfig {
	enableBlinking?: boolean
	defaultState?: LogoAnimationState
	loadingState?: LogoAnimationState
	activeState?: LogoAnimationState
	processingState?: LogoAnimationState
}

export interface LogoAnimationHookReturn {
	animationState: LogoAnimationState
	setAnimationState: (state: LogoAnimationState) => void
	startLoading: () => void
	stopLoading: () => void
	startProcessing: () => void
	stopProcessing: () => void
	setActive: (active: boolean) => void
}

export function useLogoAnimation(config: LogoAnimationConfig = {}): LogoAnimationHookReturn {
	const {
		enableBlinking = true,
		defaultState = "none",
		loadingState = "loading",
		activeState = "active",
		processingState = "processing",
	} = config

	const [animationState, setAnimationState] = useState<LogoAnimationState>(enableBlinking ? defaultState : "none")
	const [isLoading, setIsLoading] = useState(false)
	const [isProcessing, setIsProcessing] = useState(false)
	const [isActive, setIsActiveState] = useState(false)

	// Update animation state based on current application state
	useEffect(() => {
		if (!enableBlinking) {
			setAnimationState("none")
			return
		}

		if (isLoading) {
			setAnimationState(loadingState)
		} else if (isProcessing) {
			setAnimationState(processingState)
		} else if (isActive) {
			setAnimationState(activeState)
		} else {
			setAnimationState(defaultState)
		}
	}, [isLoading, isProcessing, isActive, enableBlinking, defaultState, loadingState, activeState, processingState])

	const startLoading = () => setIsLoading(true)
	const stopLoading = () => setIsLoading(false)
	const startProcessing = () => setIsProcessing(true)
	const stopProcessing = () => setIsProcessing(false)
	const setActive = (active: boolean) => setIsActiveState(active)

	return {
		animationState,
		setAnimationState,
		startLoading,
		stopLoading,
		startProcessing,
		stopProcessing,
		setActive,
	}
}

// Hook for detecting user preferences
export function useAnimationPreferences() {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
		setPrefersReducedMotion(mediaQuery.matches)

		const handler = (e: MediaQueryListEvent) => {
			setPrefersReducedMotion(e.matches)
		}

		mediaQuery.addEventListener("change", handler)
		return () => mediaQuery.removeEventListener("change", handler)
	}, [])

	return { prefersReducedMotion }
}

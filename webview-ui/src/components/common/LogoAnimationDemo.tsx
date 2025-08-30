import React, { useState, useEffect } from "react"
import AnimatedLogo, { LogoAnimationState } from "./AnimatedLogo"
import LoadingLogo from "./LoadingLogo"
import { useAnimationPreferences } from "./useLogoAnimation"

const LogoAnimationDemo = () => {
	const [currentState, setCurrentState] = useState<LogoAnimationState>("none")
	const [isLoading, setIsLoading] = useState(false)
	const [isProcessing, setIsProcessing] = useState(false)
	const [isActive, setIsActive] = useState(false)
	const { prefersReducedMotion } = useAnimationPreferences()

	const animationStates: LogoAnimationState[] = ["none", "subtle", "active", "loading", "breathing", "processing"]

	// Auto-cycle through animation states for demo
	useEffect(() => {
		if (prefersReducedMotion) return

		const interval = setInterval(() => {
			setCurrentState((prev) => {
				const currentIndex = animationStates.indexOf(prev)
				const nextIndex = (currentIndex + 1) % animationStates.length
				return animationStates[nextIndex]
			})
		}, 3000)

		return () => clearInterval(interval)
	}, [prefersReducedMotion])

	return (
		<div className="p-8 space-y-8">
			<div className="text-center">
				<h2 className="text-xl font-bold mb-4">BluesCode Logo Animation Demo</h2>
				{prefersReducedMotion && (
					<p className="text-sm text-vscode-descriptionForeground mb-4">
						Animations are disabled due to reduced motion preference
					</p>
				)}
			</div>

			{/* Manual Animation State Controls */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">Animation States</h3>
				<div className="flex flex-wrap gap-2">
					{animationStates.map((state) => (
						<button
							key={state}
							onClick={() => setCurrentState(state)}
							className={`px-3 py-1 text-sm rounded border ${
								currentState === state
									? "bg-vscode-button-background text-vscode-button-foreground"
									: "bg-vscode-input-background text-vscode-input-foreground border-vscode-input-border"
							}`}>
							{state}
						</button>
					))}
				</div>
				<div className="flex justify-center">
					<AnimatedLogo width={80} height={80} animationState={currentState} enableHoverGlow={true} />
				</div>
				<p className="text-center text-sm text-vscode-descriptionForeground">
					Current state: <strong>{currentState}</strong>
				</p>
			</div>

			{/* Loading Logo Component Demo */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">Loading States</h3>
				<div className="flex flex-wrap gap-4">
					<button
						onClick={() => setIsLoading(!isLoading)}
						className={`px-3 py-2 text-sm rounded ${
							isLoading
								? "bg-vscode-button-background text-vscode-button-foreground"
								: "bg-vscode-input-background text-vscode-input-foreground"
						}`}>
						{isLoading ? "Stop Loading" : "Start Loading"}
					</button>
					<button
						onClick={() => setIsProcessing(!isProcessing)}
						className={`px-3 py-2 text-sm rounded ${
							isProcessing
								? "bg-vscode-button-background text-vscode-button-foreground"
								: "bg-vscode-input-background text-vscode-input-foreground"
						}`}>
						{isProcessing ? "Stop Processing" : "Start Processing"}
					</button>
					<button
						onClick={() => setIsActive(!isActive)}
						className={`px-3 py-2 text-sm rounded ${
							isActive
								? "bg-vscode-button-background text-vscode-button-foreground"
								: "bg-vscode-input-background text-vscode-input-foreground"
						}`}>
						{isActive ? "Deactivate" : "Activate"}
					</button>
				</div>
				<div className="flex justify-center">
					<LoadingLogo
						isLoading={isLoading}
						isProcessing={isProcessing}
						isActive={isActive}
						width={80}
						height={80}
						loadingText="Loading BluesCode..."
						processingText="Processing request..."
					/>
				</div>
			</div>

			{/* Size Variations */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">Size Variations</h3>
				<div className="flex items-center justify-center gap-8">
					<div className="text-center">
						<AnimatedLogo width={32} height={32} animationState="subtle" />
						<p className="text-xs text-vscode-descriptionForeground mt-2">32x32</p>
					</div>
					<div className="text-center">
						<AnimatedLogo width={50} height={50} animationState="active" />
						<p className="text-xs text-vscode-descriptionForeground mt-2">50x50</p>
					</div>
					<div className="text-center">
						<AnimatedLogo width={80} height={80} animationState="breathing" />
						<p className="text-xs text-vscode-descriptionForeground mt-2">80x80</p>
					</div>
					<div className="text-center">
						<AnimatedLogo width={120} height={120} animationState="processing" />
						<p className="text-xs text-vscode-descriptionForeground mt-2">120x120</p>
					</div>
				</div>
			</div>

			{/* Usage Examples */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">Usage Examples</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="p-4 border border-vscode-panel-border rounded">
						<h4 className="font-medium mb-2">Welcome Screen</h4>
						<div className="flex justify-center">
							<AnimatedLogo width={60} height={60} animationState="breathing" />
						</div>
						<p className="text-xs text-vscode-descriptionForeground mt-2">
							Subtle breathing animation for welcome screens
						</p>
					</div>
					<div className="p-4 border border-vscode-panel-border rounded">
						<h4 className="font-medium mb-2">Active State</h4>
						<div className="flex justify-center">
							<AnimatedLogo width={60} height={60} animationState="active" enableHoverGlow />
						</div>
						<p className="text-xs text-vscode-descriptionForeground mt-2">
							Glowing effect for active/connected states
						</p>
					</div>
					<div className="p-4 border border-vscode-panel-border rounded">
						<h4 className="font-medium mb-2">Loading State</h4>
						<div className="flex justify-center">
							<LoadingLogo isLoading={true} width={60} height={60} />
						</div>
						<p className="text-xs text-vscode-descriptionForeground mt-2">
							Pulsing animation during loading operations
						</p>
					</div>
					<div className="p-4 border border-vscode-panel-border rounded">
						<h4 className="font-medium mb-2">Processing State</h4>
						<div className="flex justify-center">
							<LoadingLogo isProcessing={true} width={60} height={60} />
						</div>
						<p className="text-xs text-vscode-descriptionForeground mt-2">
							Shimmer effect during AI processing
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}

export default LogoAnimationDemo

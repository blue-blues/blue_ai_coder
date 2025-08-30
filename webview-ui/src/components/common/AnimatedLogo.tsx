import React from "react"

export type LogoAnimationState = "none" | "subtle" | "active" | "loading" | "breathing" | "processing"

export interface AnimatedLogoProps {
	width?: number
	height?: number
	animationState?: LogoAnimationState
	className?: string
	onAnimationComplete?: () => void
	enableHoverGlow?: boolean
}

export default function AnimatedLogo({
	width = 100,
	height = 100,
	animationState = "none",
	className = "",
	onAnimationComplete,
	enableHoverGlow = false,
}: AnimatedLogoProps) {
	const getAnimationClass = () => {
		switch (animationState) {
			case "subtle":
				return "logo-blink-subtle"
			case "active":
				return "logo-blink-active"
			case "loading":
				return "logo-blink-loading"
			case "breathing":
				return "logo-blink-breathing"
			case "processing":
				return "logo-blink-processing"
			default:
				return ""
		}
	}

	const animationClass = getAnimationClass()
	const hoverClass = enableHoverGlow ? "logo-hover-glow" : ""
	const combinedClassName = `${animationClass} ${hoverClass} ${className}`.trim()

	return (
		<svg
			id="BluesCode_Animated_Logo"
			xmlns="http://www.w3.org/2000/svg"
			version="1.1"
			viewBox="0 0 50 50"
			className={combinedClassName}
			width={width}
			height={height}
			onAnimationIteration={onAnimationComplete}
			style={{
				transition: "all 0.3s ease",
				transformOrigin: "center center",
			}}>
			{/* Outer border */}
			<path
				fill="var(--vscode-descriptionForeground)"
				d="M0,0v50h50V0H0ZM46.2962963,46.2962963H3.7037037V3.7037037h42.5925926v42.5925926Z"
			/>

			{/* BluesCode "BC" lettermark */}
			<path
				fill="#4169E1"
				d="M30.5555522,35.9548042h4.6296296v3.7037037h-5.8201058l-2.5132275-2.5132275v-5.8201058h3.7037037v4.6296296Z"
			/>
			<path
				fill="#4169E1"
				d="M38.8888855,35.9548042h-3.7037037v-4.6296296h-4.6296296v-3.7037037h5.8201058l2.5132275,2.5132275v5.8201058Z"
			/>
			<path fill="#4169E1" d="M23.1481481,30.5557103h-3.7037037v-3.7037037h3.7037037v3.7037037Z" />
			<path
				fill="#4169E1"
				d="M11.1111111,26.8520066h3.7037037v8.3333333h8.3333333v3.7037037h-9.5238095l-2.5132275-2.5132275v-9.5238095Z"
			/>
			<path
				fill="#4169E1"
				d="M38.8888855,19.4444444v3.7037037h-12.037037v-3.7037037h4.1390959v-4.6296296h-4.1390959v-3.7037037h5.3295721l2.5132275,2.5132275v5.8201058h4.1942374Z"
			/>
			<path
				fill="#4169E1"
				d="M14.8148148,15.2777778h4.6296296l3.7037037,3.7037037v4.1666667h-3.7037037v-4.1666667h-4.6296296v4.1666667h-3.7037037v-12.037037h3.7037037v4.1666667Z"
			/>
			<path fill="#4169E1" d="M23.1481481,15.2777778h-3.7037037v-4.1666667h3.7037037v4.1666667Z" />

			{/* Background highlight */}
			<path fill="#1E90FF" d="M7.4074074,7.4074074h35.1851852v35.1851852H7.4074074V7.4074074Z" />

			{/* Inner background */}
			<path fill="#4169E1" d="M11.1111111,11.1111111h27.7777778v27.7777778H11.1111111V11.1111111Z" />
		</svg>
	)
}

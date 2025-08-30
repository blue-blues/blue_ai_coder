import { useState } from "react"
import AnimatedLogo from "../common/AnimatedLogo"
import { useAnimationPreferences } from "../common/useLogoAnimation"

const RooHero = () => {
	const [imagesBaseUri] = useState(() => {
		const w = window as any
		return w.IMAGES_BASE_URI || ""
	})

	const { prefersReducedMotion } = useAnimationPreferences()

	return (
		<div className="flex flex-col items-center justify-center pb-4 forced-color-adjust-none">
			{/* Use AnimatedLogo with subtle breathing animation for welcome screen */}
			<AnimatedLogo
				width={32}
				height={32}
				animationState={prefersReducedMotion ? "none" : "breathing"}
				enableHoverGlow={!prefersReducedMotion}
				className="mx-auto"
			/>

			{/* Fallback to original masked logo if needed */}
			<div
				style={{
					backgroundColor: "var(--vscode-foreground)",
					WebkitMaskImage: `url('${imagesBaseUri}/bluescode-logo.svg')`,
					WebkitMaskRepeat: "no-repeat",
					WebkitMaskSize: "contain",
					maskImage: `url('${imagesBaseUri}/bluescode-logo.svg')`,
					maskRepeat: "no-repeat",
					maskSize: "contain",
					display: "none", // Hidden by default, can be shown if AnimatedLogo fails
				}}
				className="mx-auto">
				<img src={imagesBaseUri + "/bluescode-logo.svg"} alt="BluesCode logo" className="h-8 opacity-0" />
			</div>
		</div>
	)
}

export default RooHero

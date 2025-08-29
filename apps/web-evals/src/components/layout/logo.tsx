"use client"

import { SVGProps, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useHover } from "react-use"

import { cn } from "@/lib/utils"

type LogoProps = Omit<SVGProps<SVGSVGElement>, "xmlns" | "viewBox" | "onClick">

export const Logo = ({ width = 50, height = 50, fill = "#fff", className, ...props }: LogoProps) => {
	const router = useRouter()

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={width}
			height={height}
			viewBox="0 0 512 512"
			onClick={() => router.push("/")}
			className={cn("logo cursor-pointer", className)}
			{...props}>
			{/* Outer glow background */}
			<circle cx="256" cy="256" r="250" fill="url(#outerGlow)" />

			{/* Background circle with subtle glow */}
			<circle cx="256" cy="256" r="240" fill="url(#gradient1-hq)" opacity="0.2" filter="url(#glow-hq)" />

			{/* Secondary ring */}
			<circle cx="256" cy="256" r="200" fill="url(#gradient1-hq)" opacity="0.15" />

			{/* Middle ring */}
			<circle cx="256" cy="256" r="180" fill="url(#gradient2-hq)" opacity="0.3" />

			{/* Inner ring with enhanced styling */}
			<circle cx="256" cy="256" r="120" fill="url(#coreGradient-hq)" filter="url(#dropshadow-hq)" />

			{/* Central core with highlight */}
			<circle cx="256" cy="256" r="70" fill="url(#gradient3-hq)" filter="url(#innerShadow)" />

			{/* Inner core */}
			<circle cx="256" cy="256" r="45" fill="url(#coreGradient-hq)" opacity="0.8" />

			{/* Highlight dot for depth */}
			<circle cx="236" cy="236" r="16" fill="#ffffff" opacity="0.7" />
			<circle cx="240" cy="240" r="8" fill="#ffffff" opacity="0.9" />

			{/* Subtle inner glow rings */}
			<circle cx="256" cy="256" r="50" fill="none" stroke="url(#gradient3-hq)" strokeWidth="2" opacity="0.4" />
			<circle cx="256" cy="256" r="35" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.3" />

			{/* Additional depth elements */}
			<circle cx="256" cy="256" r="90" fill="none" stroke="url(#gradient2-hq)" strokeWidth="1" opacity="0.2" />
			<circle cx="256" cy="256" r="150" fill="none" stroke="url(#gradient1-hq)" strokeWidth="1" opacity="0.1" />

			{/* Gradients and filters definitions */}
			<defs>
				{/* Main gradient for outer ring */}
				<linearGradient id="gradient1-hq" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
					<stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
				</linearGradient>

				{/* Middle ring gradient */}
				<linearGradient id="gradient2-hq" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#7c3aed" stopOpacity="0.6" />
					<stop offset="100%" stopColor="#a78bfa" stopOpacity="0.6" />
				</linearGradient>

				{/* Core gradient */}
				<linearGradient id="gradient3-hq" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#a78bfa" />
					<stop offset="100%" stopColor="#c7d2fe" />
				</linearGradient>

				{/* Enhanced core gradient for depth */}
				<radialGradient id="coreGradient-hq" cx="50%" cy="40%" r="60%">
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
					<stop offset="20%" stopColor="#f8fafc" stopOpacity="0.95" />
					<stop offset="40%" stopColor="#c7d2fe" stopOpacity="0.9" />
					<stop offset="70%" stopColor="#a78bfa" />
					<stop offset="100%" stopColor="#7c3aed" />
				</radialGradient>

				{/* Outer glow gradient */}
				<radialGradient id="outerGlow" cx="50%" cy="50%" r="70%">
					<stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
					<stop offset="70%" stopColor="#6366f1" stopOpacity="0.1" />
					<stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
				</radialGradient>

				{/* Glow effect */}
				<filter id="glow-hq" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="8" result="coloredBlur" />
					<feMerge>
						<feMergeNode in="coloredBlur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>

				{/* Drop shadow */}
				<filter id="dropshadow-hq" x="-50%" y="-50%" width="200%" height="200%">
					<feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#6366f1" floodOpacity="0.4" />
				</filter>

				{/* Inner shadow */}
				<filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
					<feOffset dx="0" dy="2" />
					<feGaussianBlur stdDeviation="4" result="offset-blur" />
					<feFlood floodColor="#000000" floodOpacity="0.1" />
					<feComposite in2="offset-blur" operator="in" />
					<feMerge>
						<feMergeNode />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>
		</svg>
	)
}

export const HoppingLogo = (props: LogoProps) => {
	const ref = useRef<SVGSVGElement>(null)
	const logo = <Logo ref={ref} {...props} />
	const [hoverable, hovered] = useHover(logo)

	useEffect(() => {
		const element = ref.current
		const isHopping = element !== null && element.classList.contains("animate-hop")

		if (hovered && element && !isHopping) {
			element.classList.add("animate-hop")
		} else if (element && isHopping) {
			const onAnimationEnd = () => {
				element.classList.remove("animate-hop")
				element.removeEventListener("animationiteration", onAnimationEnd)
			}

			element.addEventListener("animationiteration", onAnimationEnd)
		}
	}, [hovered])

	return hoverable
}

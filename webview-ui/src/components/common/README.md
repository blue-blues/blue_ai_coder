# BluesCode Logo Animation System

This directory contains a comprehensive logo animation system for BluesCode, providing CSS-based blinking and pulsing effects that replace the previous animated GIF placeholders.

## Overview

The animation system consists of:

- **CSS Animations** - Smooth, performant keyframe animations
- **React Components** - Reusable logo components with animation support
- **State Management** - Hooks for managing animation states
- **Accessibility** - Full support for `prefers-reduced-motion`
- **Theme Support** - Works with light, dark, and high-contrast themes

## Components

### AnimatedLogo

The core animated logo component with various blinking states.

```tsx
import { AnimatedLogo } from "@/components/common"
;<AnimatedLogo width={80} height={80} animationState="active" enableHoverGlow={true} />
```

**Props:**

- `width?: number` - Logo width (default: 100)
- `height?: number` - Logo height (default: 100)
- `animationState?: LogoAnimationState` - Animation to display
- `enableHoverGlow?: boolean` - Enable hover glow effect
- `className?: string` - Additional CSS classes

### LoadingLogo

A specialized component for loading and processing states.

```tsx
import { LoadingLogo } from "@/components/common"
;<LoadingLogo isLoading={true} loadingText="Loading BluesCode..." width={60} height={60} />
```

**Props:**

- `isLoading?: boolean` - Show loading animation
- `isProcessing?: boolean` - Show processing animation
- `isActive?: boolean` - Show active state animation
- `loadingText?: string` - Text to display when loading
- `processingText?: string` - Text to display when processing

### Enhanced Logo Components

The existing `Logo` components in `bluescode/` and `kilocode/` directories have been enhanced with animation support while maintaining backward compatibility.

## Animation States

| State        | Description           | Use Case                        |
| ------------ | --------------------- | ------------------------------- |
| `none`       | No animation          | Static display, reduced motion  |
| `subtle`     | Gentle fade in/out    | Default state, welcome screens  |
| `active`     | Glowing pulse effect  | Connected/active states         |
| `loading`    | Scale pulsing         | Loading operations              |
| `breathing`  | Slow breathing effect | Welcome/idle states             |
| `processing` | Shimmer effect        | AI processing, heavy operations |

## Hooks

### useLogoAnimation

Manages logo animation states based on application state.

```tsx
import { useLogoAnimation } from "@/components/common"

const logoAnimation = useLogoAnimation({
	enableBlinking: true,
	defaultState: "subtle",
	loadingState: "loading",
})

// Control animation programmatically
logoAnimation.startLoading()
logoAnimation.stopLoading()
logoAnimation.setActive(true)
```

### useAnimationPreferences

Detects user animation preferences for accessibility.

```tsx
import { useAnimationPreferences } from "@/components/common"

const { prefersReducedMotion } = useAnimationPreferences()
```

## CSS Classes

The animation system provides CSS classes that can be applied to any element:

- `.logo-blink-subtle` - Subtle fade animation
- `.logo-blink-active` - Active glow animation
- `.logo-blink-loading` - Loading pulse animation
- `.logo-blink-breathing` - Breathing animation
- `.logo-blink-processing` - Processing shimmer
- `.logo-hover-glow:hover` - Hover glow effect

## Accessibility

The animation system is fully accessible:

- **Respects `prefers-reduced-motion`** - Automatically disables animations
- **Alternative indicators** - Provides static visual cues when animations are disabled
- **High contrast support** - Works with high-contrast themes
- **Smooth transitions** - Uses CSS transitions for smooth state changes

## Theme Support

Animations adapt to VSCode themes:

- **Dark Theme** - Enhanced glow effects with blue tones
- **Light Theme** - Subtle effects with appropriate contrast
- **High Contrast** - Animations disabled, borders used instead

## Performance

- **CSS-based animations** - Hardware accelerated, smooth 60fps
- **Minimal DOM impact** - Uses `transform` and `opacity` properties
- **Memory efficient** - No JavaScript animation loops
- **Conditional loading** - Animations only load when needed

## Migration from GIF Files

The previous animated GIF placeholders have been replaced:

- `logo-outline-black.gif` → `<AnimatedLogo animationState="subtle" />`
- `logo-outline-yellow.gif` → `<AnimatedLogo animationState="active" />`

## Usage Examples

### Welcome Screen

```tsx
<AnimatedLogo width={80} height={80} animationState="breathing" className="mx-auto" />
```

### Loading State

```tsx
<LoadingLogo isLoading={isApiLoading} loadingText="Connecting to BluesCode..." width={50} height={50} />
```

### Status Indicator

```tsx
<AnimatedLogo width={32} height={32} animationState={isConnected ? "active" : "subtle"} enableHoverGlow={true} />
```

### Processing State

```tsx
<LoadingLogo isProcessing={isAiProcessing} processingText="AI is thinking..." width={60} height={60} />
```

## Demo Component

A comprehensive demo component is available at `LogoAnimationDemo.tsx` that showcases all animation states and provides interactive controls for testing.

## Files Structure

```
webview-ui/src/components/common/
├── animations.css              # CSS keyframe animations
├── AnimatedLogo.tsx           # Core animated logo component
├── LoadingLogo.tsx            # Loading state component
├── useLogoAnimation.ts        # Animation state management hooks
├── LogoAnimationDemo.tsx      # Demo/testing component
├── index.ts                   # Exports and CSS import
└── README.md                  # This documentation
```

## Integration

The animation CSS is automatically imported in `App.tsx`, making all animations available throughout the application. Components can be imported from the common index:

```tsx
import { AnimatedLogo, LoadingLogo, useLogoAnimation, useAnimationPreferences } from "@/components/common"
```

## Future Enhancements

Potential future improvements:

- Sound effects for state changes (with user preference)
- Custom animation timing controls
- Additional animation patterns
- Integration with VSCode extension lifecycle events
- Performance monitoring and optimization

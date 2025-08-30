"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface AnimatedButtonProps extends React.ComponentProps<typeof Button> {
  animation?: "pulse" | "bounce" | "glow" | "slide"
}

const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, animation = "glow", children, ...props }, ref) => {
    const animationClasses = {
      pulse: "animate-pulse hover:animate-none",
      bounce: "hover:animate-bounce",
      glow: "transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]",
      slide: "transition-all duration-300 hover:translate-x-1",
    }

    return (
      <Button ref={ref} className={cn(animationClasses[animation], className)} {...props}>
        {children}
      </Button>
    )
  },
)

AnimatedButton.displayName = "AnimatedButton"

export { AnimatedButton }

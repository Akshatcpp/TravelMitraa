"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface PageTransitionProps {
  children: React.ReactNode
  isLoading?: boolean
}

export function PageTransition({ children, isLoading = false }: PageTransitionProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Loading your adventure...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      {children}
    </div>
  )
}

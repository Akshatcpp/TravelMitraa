"use client"

import { useEffect, useState } from "react"

export function FloatingElements() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Floating geometric shapes */}
      <div
        className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/20 rounded-full animate-bounce"
        style={{ animationDelay: "0s", animationDuration: "3s" }}
      />
      <div
        className="absolute top-1/3 right-1/3 w-3 h-3 bg-secondary/20 rounded-full animate-bounce"
        style={{ animationDelay: "1s", animationDuration: "4s" }}
      />
      <div
        className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce"
        style={{ animationDelay: "2s", animationDuration: "5s" }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-2.5 h-2.5 bg-secondary/15 rounded-full animate-bounce"
        style={{ animationDelay: "0.5s", animationDuration: "3.5s" }}
      />

      {/* Gradient orbs */}
      <div className="absolute top-1/6 right-1/6 w-32 h-32 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-full blur-xl animate-pulse" />
      <div
        className="absolute bottom-1/6 left-1/6 w-24 h-24 bg-gradient-to-r from-secondary/5 to-primary/5 rounded-full blur-xl animate-pulse"
        style={{ animationDelay: "2s" }}
      />
    </div>
  )
}

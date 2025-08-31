"use client"

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface PortalProps {
  children: React.ReactNode
}

export const Portal = ({ children }: PortalProps) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Don't render anything on the server
  if (typeof window === "undefined" || !mounted) {
    return null
  }

  // On the client, create a portal to the document body
  return createPortal(children, document.body)
}
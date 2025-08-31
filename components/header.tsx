"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Shield, User } from "lucide-react"

interface HeaderProps {
  user?: { name: string; phone: string }
  showSOS?: boolean
}

export function Header({ user, showSOS = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <span className="text-white font-bold text-sm">BL</span>
          </div>
          <span className="font-bold text-xl gradient-text">Travel Mitra</span>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {showSOS && (
            <Button variant="destructive" size="sm" className="bg-red-500 hover:bg-red-600 text-white">
              <Shield className="h-4 w-4 mr-1" />
              SOS
            </Button>
          )}

          {user && (
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </header>
  )
}

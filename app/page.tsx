"use client"

import { useState } from "react"
import { LoginScreen } from "@/components/login-screen"
import { Dashboard } from "@/components/dashboard"
import { ItineraryModal } from "@/components/itinerary-modal"
import { GamifiedItinerary } from "@/components/gamified-itinerary"
import { PageTransition } from "@/components/page-transition"
import { FloatingElements } from "@/components/ui/floating-elements"

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<"login" | "dashboard" | "itinerary" | "gamified">("login")
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null)
  const [showItineraryModal, setShowItineraryModal] = useState(false)
  const [itineraryData, setItineraryData] = useState<any>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleLogin = async (userData: { name: string; phone: string }) => {
    setIsTransitioning(true)
    // Simulate transition delay
    await new Promise((resolve) => setTimeout(resolve, 800))
    setUser(userData)
    setCurrentScreen("dashboard")
    setIsTransitioning(false)
  }

  const handlePlanTrip = (type: "ai" | "manual") => {
    if (type === "manual") {
      setShowItineraryModal(true)
    } else {
      // AI planner logic would go here
      console.log("AI Planner selected")
    }
  }

  const handleItineraryComplete = async (data: any) => {
    setIsTransitioning(true)
    setItineraryData(data)
    setShowItineraryModal(false)
    // Simulate generation delay
    await new Promise((resolve) => setTimeout(resolve, 1200))
    setCurrentScreen("gamified")
    setIsTransitioning(false)
  }

  return (
    <main className="min-h-screen bg-background relative">
      <FloatingElements />

      <PageTransition isLoading={isTransitioning}>
        {currentScreen === "login" && <LoginScreen onLogin={handleLogin} />}

        {currentScreen === "dashboard" && user && <Dashboard user={user} onPlanTrip={handlePlanTrip} />}

        {currentScreen === "gamified" && itineraryData && (
          <GamifiedItinerary data={itineraryData} onBack={() => setCurrentScreen("dashboard")} />
        )}
      </PageTransition>

      {showItineraryModal && (
        <ItineraryModal onClose={() => setShowItineraryModal(false)} onComplete={handleItineraryComplete} />
      )}
    </main>
  )
}

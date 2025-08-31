"use client"

import { useState } from "react"
import { LoginScreen } from "@/components/login-screen"
import { Dashboard } from "@/components/dashboard"
import { ItineraryModal } from "@/components/itinerary-modal"
import { GamifiedItinerary } from "@/components/gamified-itinerary"
import { PageTransition } from "@/components/page-transition"
import { FloatingElements } from "@/components/ui/floating-elements"

function StaticMap({ polyline }: { polyline: string }) {
  const encodedPolyline = encodeURIComponent(polyline)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Mappls Static Map</h1>
      <img
        src={`/api/map-image?polyline=${encodedPolyline}`}
        alt="Map with polyline"
        width={400}
        height={400}
        className="border rounded shadow"
      />
    </div>
  )
}

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<
    "login" | "dashboard" | "itinerary" | "gamified" | "map"
  >("login")
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null)
  const [showItineraryModal, setShowItineraryModal] = useState(false)
  const [itineraryData, setItineraryData] = useState<any>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleLogin = async (userData: { name: string; phone: string }) => {
    setIsTransitioning(true)
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
    await new Promise((resolve) => setTimeout(resolve, 1200))
    setCurrentScreen("gamified")
    setIsTransitioning(false)
  }

  return (
    <main className="min-h-screen bg-background relative">
      <FloatingElements />
      <PageTransition isLoading={isTransitioning}>
        {currentScreen === "login" && <LoginScreen onLogin={handleLogin} />}

        {currentScreen === "dashboard" && user && (
          <Dashboard
            user={user}
            onPlanTrip={handlePlanTrip}
            // Example: add a button in Dashboard to view map
            extraActions={
              <button
                onClick={() => setCurrentScreen("map")}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
              >
                View Static Map
              </button>
            }
          />
        )}

        {currentScreen === "gamified" && itineraryData && (
          <GamifiedItinerary
            data={itineraryData}
            onBack={() => setCurrentScreen("dashboard")}
          />
        )}

        {currentScreen === "map" && (
          <StaticMap polyline="[[77.227437,28.611004],[77.224885,28.610022]]" />
        )}
      </PageTransition>

      {showItineraryModal && (
        <ItineraryModal
          onClose={() => setShowItineraryModal(false)}
          onComplete={handleItineraryComplete}
        />
      )}
    </main>
  )
}

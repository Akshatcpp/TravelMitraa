"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AnimatedButton } from "@/components/ui/animated-button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  X,
  MapPin,
  Calendar,
  Users,
  ArrowRight,
  ArrowLeft,
  Castle,
  Mountain,
  Camera,
  Music,
  Hotel,
  Sparkles,
} from "lucide-react"

interface ItineraryModalProps {
  onClose: () => void
  onComplete: (data: any) => void
}

interface FormData {
  destination: string
  startDate: string
  endDate: string
  travelers: number
  travelStyle: string[]
  needHotel: boolean | null
}

export function ItineraryModal({ onClose, onComplete }: ItineraryModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    destination: "",
    startDate: "",
    endDate: "",
    travelers: 1,
    travelStyle: [],
    needHotel: null,
  })

  const destinations = [
    "Mumbai, Maharashtra",
    "Delhi, Delhi",
    "Bangalore, Karnataka",
    "Hyderabad, Telangana",
    "Ahmedabad, Gujarat",
    "Chennai, Tamil Nadu",
    "Kolkata, West Bengal",
    "Pune, Maharashtra",
    "Jaipur, Rajasthan",
    "Lucknow, Uttar Pradesh",
    "Kanpur, Uttar Pradesh",
    "Nagpur, Maharashtra",
    "Indore, Madhya Pradesh",
    "Thane, Maharashtra",
    "Bhopal, Madhya Pradesh",
    "Visakhapatnam, Andhra Pradesh",
    "Pimpri-Chinchwad, Maharashtra",
    "Patna, Bihar",
    "Vadodara, Gujarat",
    "Ghaziabad, Uttar Pradesh",
  ]

  const travelStyles = [
    {
      id: "cultural",
      title: "Cultural Heritage",
      description: "Explore historical sites and traditions",
      icon: Castle,
      color: "from-amber-500 to-orange-500",
    },
    {
      id: "nature",
      title: "Nature Lover",
      description: "Mountains, forests, and natural beauty",
      icon: Mountain,
      color: "from-green-500 to-emerald-500",
    },
    {
      id: "sightseeing",
      title: "Sightseeing",
      description: "Popular attractions and landmarks",
      icon: Camera,
      color: "from-blue-500 to-cyan-500",
    },
    {
      id: "party",
      title: "Party Seeker",
      description: "Nightlife, events, and entertainment",
      icon: Music,
      color: "from-purple-500 to-pink-500",
    },
  ]

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleTravelStyleToggle = (styleId: string) => {
    setFormData((prev) => ({
      ...prev,
      travelStyle: prev.travelStyle.includes(styleId)
        ? prev.travelStyle.filter((id) => id !== styleId)
        : [...prev.travelStyle, styleId],
    }))
  }

  const handleComplete = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsLoading(false)

    // Pass the form data to parent
    onComplete({
      ...formData,
      destination: formData.destination || "Indore, Madhya Pradesh", // Default for demo
    })
  }

  const canProceedStep1 = formData.destination && formData.startDate && formData.endDate && formData.travelers > 0
  const canProceedStep2 = formData.travelStyle.length > 0
  const canProceedStep3 = formData.needHotel !== null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-background border-0 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-muted/30">
          <div>
            <h2 className="text-2xl font-bold">Plan Your Adventure</h2>
            <p className="text-sm text-muted-foreground">Step {currentStep} of 4</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        <CardContent className="p-6 overflow-y-auto">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-500">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">Where would you like to go?</h3>
                <p className="text-muted-foreground">Tell us about your travel plans</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="destination" className="text-sm font-medium">
                    Destination
                  </Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="destination"
                      list="destinations"
                      placeholder="Search destinations..."
                      value={formData.destination}
                      onChange={(e) => setFormData((prev) => ({ ...prev, destination: e.target.value }))}
                      className="pl-10"
                    />
                    <datalist id="destinations">
                      {destinations.map((dest) => (
                        <option key={dest} value={dest} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate" className="text-sm font-medium">
                      Start Date
                    </Label>
                    <div className="relative mt-1">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                        className="pl-10"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="endDate" className="text-sm font-medium">
                      End Date
                    </Label>
                    <div className="relative mt-1">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                        className="pl-10"
                        min={formData.startDate || new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="travelers" className="text-sm font-medium">
                    Number of Travelers
                  </Label>
                  <div className="relative mt-1">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="travelers"
                      type="number"
                      min="1"
                      max="20"
                      value={formData.travelers}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, travelers: Number.parseInt(e.target.value) || 1 }))
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Travel Style */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-500">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">What's your travel style?</h3>
                <p className="text-muted-foreground">Select all that apply to personalize your experience</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {travelStyles.map((style) => (
                  <Card
                    key={style.id}
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                      formData.travelStyle.includes(style.id) ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
                    }`}
                    onClick={() => handleTravelStyleToggle(style.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${style.color} text-white`}>
                          <style.icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{style.title}</h4>
                          <p className="text-sm text-muted-foreground">{style.description}</p>
                        </div>
                        {formData.travelStyle.includes(style.id) && (
                          <Badge variant="default" className="bg-primary">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Hotel Preference */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-500">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Hotel className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Need hotel suggestions?</h3>
                <p className="text-muted-foreground">
                  We can recommend accommodations that match your style and budget
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                <Card
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                    formData.needHotel === true ? "ring-2 ring-primary shadow-lg bg-primary/5" : "hover:shadow-md"
                  }`}
                  onClick={() => setFormData((prev) => ({ ...prev, needHotel: true }))}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl mb-2">🏨</div>
                    <h4 className="font-semibold mb-1">Yes, Please!</h4>
                    <p className="text-sm text-muted-foreground">Show me hotel options</p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                    formData.needHotel === false ? "ring-2 ring-primary shadow-lg bg-primary/5" : "hover:shadow-md"
                  }`}
                  onClick={() => setFormData((prev) => ({ ...prev, needHotel: false }))}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl mb-2">🎒</div>
                    <h4 className="font-semibold mb-1">No, Thanks</h4>
                    <p className="text-sm text-muted-foreground">I have my own plans</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 4: Summary & Generate */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-500">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Ready to Generate Your Adventure!</h3>
                <p className="text-muted-foreground">Review your preferences and let's create something amazing</p>
              </div>

              {/* Summary */}
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Destination:</span>
                    <span className="text-sm">{formData.destination || "Not specified"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Duration:</span>
                    <span className="text-sm">
                      {formData.startDate && formData.endDate
                        ? `${formData.startDate} to ${formData.endDate}`
                        : "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Travelers:</span>
                    <span className="text-sm">
                      {formData.travelers} person{formData.travelers > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium">Travel Style:</span>
                    <div className="flex flex-wrap gap-1 max-w-48">
                      {formData.travelStyle.map((styleId) => {
                        const style = travelStyles.find((s) => s.id === styleId)
                        return style ? (
                          <Badge key={styleId} variant="secondary" className="text-xs">
                            {style.title}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Hotel Suggestions:</span>
                    <span className="text-sm">{formData.needHotel ? "Yes" : "No"}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Generate Button */}
              <AnimatedButton
                onClick={handleComplete}
                disabled={isLoading}
                className="w-full h-14 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-bold text-lg"
                animation="glow"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-3">
                    <LoadingSpinner size="sm" />
                    <span>Generating Your Adventure...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5" />
                    <span>Generate My Adventure!</span>
                  </div>
                )}
              </AnimatedButton>
            </div>
          )}
        </CardContent>

        {/* Footer Navigation */}
        {currentStep < 4 && (
          <div className="flex items-center justify-between p-6 border-t bg-muted/30">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>

            <AnimatedButton
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !canProceedStep1) ||
                (currentStep === 2 && !canProceedStep2) ||
                (currentStep === 3 && !canProceedStep3)
              }
              className="flex items-center space-x-2"
              animation="glow"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </AnimatedButton>
          </div>
        )}
      </Card>
    </div>
  )
}

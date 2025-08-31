"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Check,
  MapPin,
  Clock,
  Star,
  Coins,
  Trophy,
  Camera,
  Users,
  Utensils,
  Mountain,
  Castle,
  Diamond,
  ShoppingCart,
  Shield,
  ChevronDown,
  ChevronUp,
  Navigation,
  Phone,
  AlertTriangle,
  X,
  Images,
  Bell,
  Loader2,
  AlertCircle,
  BookText, // --- 1. IMPORTED NEW ICON FOR JOURNAL ---
} from "lucide-react"

// --- 2. ADDED JournalModal TO IMPORTS (ASSUMING IT EXISTS) ---
import { ImageGalleryModal, ReviewsModal, JournalModal } from "./ImageModalGallery"

const Header = ({ showSOS }: { showSOS?: boolean }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center space-x-2">
          <Mountain className="h-6 w-6" />
          <span className="font-bold">Bhu-Local</span>
        </div>
        <div className="flex items-center space-x-4">
          {showSOS && (
            <Button variant="destructive" size="sm" className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>SOS</span>
            </Button>
          )}
          <Bell className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </header>
  )
}

interface GamifiedItineraryProps {
  data: any
  onBack: () => void
}

interface Checkpoint {
  id: string
  title: string
  description: string
  location: string
  duration: string
  points: number
  status: "completed" | "active" | "upcoming"
  icon: any
  type: "attraction" | "food" | "culture" | "nature"
}

export function GamifiedItinerary({ data, onBack }: GamifiedItineraryProps) {
  const [currentCheckpoint, setCurrentCheckpoint] = useState(1)
  const [totalPoints, setTotalPoints] = useState(150)
  const [badges, setBadges] = useState(["explorer", "foodie"])
  const [expandedCheckpoint, setExpandedCheckpoint] = useState<string | null>("3")

  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [isReviewsOpen, setIsReviewsOpen] = useState(false)
  const [isJournalOpen, setIsJournalOpen] = useState(false) // --- 3. ADDED STATE FOR JOURNAL MODAL ---
  const [selectedCheckpointTitle, setSelectedCheckpointTitle] = useState("")

  const checkpoints: Checkpoint[] = [
    // Your checkpoints data remains the same...
    {
      id: "1",
      title: "Rajwada Palace",
      description: "Explore the historic royal palace of Holkar dynasty",
      location: "Rajwada, Indore",
      duration: "2 hours",
      points: 50,
      status: "completed",
      icon: Castle,
      type: "culture",
    },
    {
      id: "2",
      title: "Sarafa Bazaar",
      description: "Experience the famous night food market",
      location: "Sarafa Bazaar, Indore",
      duration: "1.5 hours",
      points: 30,
      status: "completed",
      icon: Utensils,
      type: "food",
    },
    {
      id: "3",
      title: "Lal Bagh Palace",
      description: "Visit the magnificent Holkar palace with European architecture",
      location: "Lal Bagh, Indore",
      duration: "2.5 hours",
      points: 60,
      status: "active",
      icon: Castle,
      type: "culture",
    },
    {
      id: "4",
      title: "Chappan Dukan",
      description: "Taste local street food at the famous 56 shops",
      location: "New Palasia, Indore",
      duration: "1 hour",
      points: 25,
      status: "upcoming",
      icon: Utensils,
      type: "food",
    },
    {
      id: "5",
      title: "Ralamandal Wildlife Sanctuary",
      description: "Nature walk and wildlife spotting",
      location: "Ralamandal, Indore",
      duration: "3 hours",
      points: 70,
      status: "upcoming",
      icon: Mountain,
      type: "nature",
    },
    {
      id: "6",
      title: "Khajrana Ganesh Temple",
      description: "Visit the famous Ganesh temple",
      location: "Khajrana, Indore",
      duration: "1 hour",
      points: 40,
      status: "upcoming",
      icon: Castle,
      type: "culture",
    },
    {
      id: "7",
      title: "Central Museum",
      description: "Discover local history and artifacts",
      location: "A.B. Road, Indore",
      duration: "2 hours",
      points: 45,
      status: "upcoming",
      icon: Castle,
      type: "culture",
    },
  ]

  const completedCheckpoints = checkpoints.filter((c) => c.status === "completed").length
  const progressPercentage = (completedCheckpoints / checkpoints.length) * 100

  const badgeIcons = {
    explorer: Trophy,
    foodie: Utensils,
    culture: Castle,
    nature: Mountain,
    photographer: Camera,
  }

  const handleCheckpointClick = (checkpoint: Checkpoint) => {
    if (checkpoint.status === "active") {
      setCurrentCheckpoint(Number.parseInt(checkpoint.id))
      setExpandedCheckpoint(expandedCheckpoint === checkpoint.id ? null : checkpoint.id)
    }
  }

  const handleShowPhotos = () => {
    setIsGalleryOpen(true)
  }

  const handleShowReviews = (checkpoint: Checkpoint) => {
    setSelectedCheckpointTitle(checkpoint.title)
    setIsReviewsOpen(true)
  }

  // --- 4. ADDED HANDLER FOR JOURNAL MODAL ---
  const handleOpenJournal = () => {
    setIsJournalOpen(true);
  };

  const handleTakePhotoClick = () => {
    console.log("Take Photo clicked for the current checkpoint")
  }

  const getInteractionCards = (checkpoint: Checkpoint) => {
    const baseCards = [
      {
        id: "gems",
        title: "Discover Nearby Gems",
        description: "Hidden spots and local favorites around this location",
        icon: Diamond,
        color: "from-purple-500 to-pink-500",
        items: [
          "Secret viewpoint with city panorama",
          "Local artisan workshop nearby",
          "Historic stepwell (5 min walk)",
        ],
      },
      {
        id: "food",
        title: "Find Local Street Food",
        description: "Authentic flavors and must-try local delicacies",
        icon: ShoppingCart,
        color: "from-orange-500 to-red-500",
        items: ["Famous poha jalebi stall", "Traditional dal bafla restaurant", "Local chai vendor (highly rated)"],
      },
      {
        id: "safety",
        title: "Local Safety Tips",
        description: "Stay safe and informed during your visit",
        icon: Shield,
        color: "from-green-500 to-emerald-500",
        items: [
          "Tourist police contact: +91-731-xxx-xxxx",
          "Avoid isolated areas after 9 PM",
          "Keep valuables in hotel safe",
        ],
      },
    ]

    if (checkpoint.type === "food") {
      baseCards[1].items = [
        "Best street food timing: 7-10 PM",
        "Try the famous bhutte ka kees",
        "Hygiene-rated food stalls nearby",
      ]
    } else if (checkpoint.type === "culture") {
      baseCards[0].items = [
        "Photography spots with best lighting",
        "Local guide available (₹200/hour)",
        "Historical significance placard",
      ]
    }
    return baseCards
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showSOS={true} />
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" onClick={onBack} className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div className="flex items-center space-x-4">
              {/* --- 5. ADDED THE JOURNAL BUTTON HERE --- */}
             <Button variant="ghost" size="sm" onClick={handleOpenJournal}>
  <BookText className="h-4 w-4 mr-2" />
  Journal
</Button>

              <div className="flex items-center space-x-1 bg-primary/10 px-3 py-1 rounded-full">
                <Coins className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">{totalPoints}</span>
              </div>
              <div className="flex items-center space-x-1">
                {badges.map((badge) => {
                  const BadgeIcon = badgeIcons[badge as keyof typeof badgeIcons]
                  return (
                    <div key={badge} className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                      <BadgeIcon className="h-4 w-4 text-secondary" />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Indore Explorer</span>
              <span className="text-muted-foreground">
                {completedCheckpoints}/{checkpoints.length} Checkpoints
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      </div>

      <div className="container px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl" />
              <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-primary/30 rounded-full" />
              <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-secondary/30 rounded-full" />
              <div className="absolute bottom-1/3 left-1/4 w-5 h-5 bg-primary/20 rounded-full" />
            </div>
            <div className="relative space-y-8 py-8">
              {checkpoints.map((checkpoint, index) => (
                <div key={checkpoint.id} className="relative">
                  {index < checkpoints.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-16 bg-gradient-to-b from-border to-transparent" />
                  )}
                  <div className="flex items-start space-x-4">
                    <div
                      className={`relative flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-300 ${
                        checkpoint.status === "completed"
                          ? "checkpoint-completed border-secondary bg-secondary text-white"
                          : checkpoint.status === "active"
                          ? "checkpoint-active border-primary bg-primary text-white"
                          : "checkpoint-upcoming border-muted-foreground/30 bg-muted text-muted-foreground"
                      }`}
                      onClick={() => handleCheckpointClick(checkpoint)}
                    >
                      {checkpoint.status === "completed" ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <checkpoint.icon className="h-6 w-6" />
                      )}
                      {checkpoint.status === "active" && (
                        <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-75" />
                      )}
                    </div>

                    <Card
                      className={`flex-1 transition-all duration-300 hover:shadow-md ${
                        checkpoint.status === "active" ? "ring-2 ring-primary/20 shadow-lg" : ""
                      } ${checkpoint.status === "upcoming" ? "opacity-60" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{checkpoint.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{checkpoint.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{checkpoint.location}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{checkpoint.duration}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end space-y-1">
                            <Badge
                              variant={checkpoint.status === "completed" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              +{checkpoint.points} pts
                            </Badge>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => handleShowReviews(checkpoint)}
                            >
                              <Star className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                            </Button>

                            {checkpoint.status === "active" && (
                              <Badge variant="outline" className="text-xs border-primary text-primary">
                                Current
                              </Badge>
                            )}
                          </div>
                        </div>
                        {checkpoint.status === "active" && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm text-muted-foreground">Ready to explore?</div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCheckpointClick(checkpoint)}
                                className="text-xs"
                              >
                                {expandedCheckpoint === checkpoint.id ? (
                                  <>
                                    <ChevronUp className="h-3 w-3 mr-1" />
                                    Less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                    More
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" onClick={handleTakePhotoClick}>
                                <Camera className="h-3 w-3 mr-1" />
                                Take Photo
                              </Button>
                              <Button size="sm" variant="secondary" onClick={handleShowPhotos}>
                                <Images className="h-3 w-3 mr-1" />
                                Show Photos
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs bg-transparent">
                                <Navigation className="h-3 w-3 mr-1" />
                                Get Directions
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleShowReviews(checkpoint)} className="text-xs bg-transparent">
                                <Users className="h-3 w-3 mr-1" />
                                Reviews
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  {checkpoint.status === "active" && expandedCheckpoint === checkpoint.id && (
                    <div className="ml-16 mt-4 space-y-4 animate-in fade-in-0 slide-in-from-top-4 duration-500">
                      <div className="grid gap-4">
                        {getInteractionCards(checkpoint).map((card) => (
                          <Card
                            key={card.id}
                            className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-l-4 border-l-transparent hover:border-l-primary"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                <div
                                  className={`p-2 rounded-lg bg-gradient-to-br ${card.color} text-white flex-shrink-0`}
                                >
                                  <card.icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                                    {card.title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground mb-3">{card.description}</p>
                                  <div className="space-y-2">
                                    {card.items.map((item, itemIndex) => (
                                      <div key={itemIndex} className="flex items-start space-x-2 text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                        <span className="text-muted-foreground">{item}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-3 pt-3 border-t border-muted/50">
                                    {card.id === "gems" && (
                                      <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="text-xs bg-transparent">
                                          <MapPin className="h-3 w-3 mr-1" />
                                          View on Map
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-xs bg-transparent">
                                          <Camera className="h-3 w-3 mr-1" />
                                          Photo Spots
                                        </Button>
                                      </div>
                                    )}
                                    {card.id === "food" && (
                                      <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="text-xs bg-transparent">
                                          <Navigation className="h-3 w-3 mr-1" />
                                          Directions
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-xs bg-transparent">
                                          <Star className="h-3 w-3 mr-1" />
                                          Reviews
                                        </Button>
                                      </div>
                                    )}
                                    {card.id === "safety" && (
                                      <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="text-xs bg-transparent">
                                          <Phone className="h-3 w-3 mr-1" />
                                          Emergency
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-xs bg-transparent">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          Report Issue
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {completedCheckpoints === checkpoints.length && (
              <Card className="mt-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
                    <Trophy className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Adventure Complete!</h3>
                  <p className="text-muted-foreground mb-4">
                    Congratulations! You've explored all the amazing places in Indore.
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="font-semibold">+{totalPoints} Total Points</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-secondary" />
                      <span className="font-semibold">Explorer Badge Earned!</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <ImageGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />

      <ReviewsModal
        isOpen={isReviewsOpen}
        onClose={() => setIsReviewsOpen(false)}
      />

      {/* --- 6. ADDED THE JOURNAL MODAL COMPONENT --- */}
      <JournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
      />
    </div>
  )
}
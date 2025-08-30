"use client"

import { useState, useEffect } from "react"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Brain, Calendar, MapPin, Sparkles, Users, TrendingUp } from "lucide-react"

interface DashboardProps {
  user: { name: string; phone: string }
  onPlanTrip: (type: "ai" | "manual") => void
}

export function Dashboard({ user, onPlanTrip }: DashboardProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const plannerCards = [
    {
      id: "ai",
      title: "AI Planner",
      subtitle: "Plan Your Trip with AI",
      description: "Let our intelligent assistant create the perfect itinerary based on your preferences",
      icon: Brain,
      gradient: "from-primary to-primary/80",
      hoverGradient: "from-primary/90 to-primary/70",
      features: ["Smart recommendations", "Real-time updates", "Local insights"],
    },
    {
      id: "manual",
      title: "Manual Planner",
      subtitle: "Plan Your Trip Manually",
      description: "Take full control and customize every detail of your journey",
      icon: Calendar,
      gradient: "from-secondary to-secondary/80",
      hoverGradient: "from-secondary/90 to-secondary/70",
      features: ["Full customization", "Step-by-step planning", "Community tips"],
    },
  ]

  const stats = [
    { label: "Destinations", value: "500+", icon: MapPin },
    { label: "Happy Travelers", value: "10K+", icon: Users },
    { label: "Success Rate", value: "98%", icon: TrendingUp },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="container px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div
            className={`transition-all duration-1000 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Hello{" "}
              <span className="gradient-text animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-300">
                {user.name}
              </span>
              , where to next?
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-500">
              Discover incredible destinations, connect with local communities, and create unforgettable memories across
              India.
            </p>
          </div>

          {/* Stats */}
          <div
            className={`grid grid-cols-3 gap-4 max-w-md mx-auto mt-8 transition-all duration-1000 delay-300 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center animate-in fade-in-0 slide-in-from-bottom-4 duration-700"
                style={{ animationDelay: `${700 + index * 100}ms` }}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mx-auto mb-2 transition-all duration-300 hover:bg-primary/20 hover:scale-110">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Planning Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {plannerCards.map((card, index) => (
            <Card
              key={card.id}
              className={`group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: `${600 + index * 200}ms`,
              }}
              onClick={() => onPlanTrip(card.id as "ai" | "manual")}
            >
              {/* Background Gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradient} group-hover:bg-gradient-to-br group-hover:${card.hoverGradient} transition-all duration-500`}
              />

              {/* Animated Background Elements */}
              <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/10 blur-xl group-hover:w-24 group-hover:h-24 transition-all duration-500" />
              <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full bg-white/5 blur-lg group-hover:w-20 group-hover:h-20 transition-all duration-500" />

              {/* Content */}
              <CardContent className="relative z-10 p-8 text-white">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110">
                        <card.icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold">{card.title}</h3>
                    </div>
                    <h4 className="text-lg font-semibold mb-3 opacity-90">{card.subtitle}</h4>
                    <p className="text-sm opacity-80 leading-relaxed">{card.description}</p>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2 mb-6">
                  {card.features.map((feature, featureIndex) => (
                    <div
                      key={featureIndex}
                      className="flex items-center space-x-2 text-sm opacity-90 animate-in fade-in-0 slide-in-from-left-4 duration-500"
                      style={{ animationDelay: `${1000 + featureIndex * 100}ms` }}
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <AnimatedButton
                  animation="glow"
                  className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 hover:border-white/50 backdrop-blur-sm"
                  size="lg"
                >
                  <span className="font-semibold">Get Started</span>
                  <div className="ml-2 transform group-hover:translate-x-1 transition-transform duration-300">→</div>
                </AnimatedButton>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity Section */}
        <div
          className={`max-w-4xl mx-auto transition-all duration-1000 delay-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <Card className="bg-muted/50 border-0 hover:shadow-md transition-all duration-300">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-4">Ready for Your Next Adventure?</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join thousands of travelers who have discovered hidden gems and authentic experiences across India with
                Bhu-Local.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {[
                  { label: "Verified Local Guides", color: "bg-primary" },
                  { label: "24/7 Safety Support", color: "bg-secondary" },
                  { label: "Community Driven", color: "bg-primary" },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className="flex items-center space-x-2 text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${1200 + index * 100}ms` }}
                  >
                    <div className={`w-2 h-2 rounded-full ${item.color} animate-pulse`} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}

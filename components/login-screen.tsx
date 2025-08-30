"use client"

import { useState, useEffect } from "react"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ArrowRight, Smartphone } from "lucide-react"

interface LoginScreenProps {
  onLogin: (userData: { name: string; phone: string }) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const handleSendOTP = async () => {
    if (phone.length < 10) return

    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)
    setStep("otp")
    setResendTimer(30)
  }

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleVerifyOTP = async () => {
    const otpString = otp.join("")
    if (otpString.length !== 6) return

    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)

    // Mock successful login
    onLogin({ name: "Traveler", phone })
  }

  const handleResendOTP = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
    setResendTimer(30)
    setOtp(["", "", "", "", "", ""])
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image with Blur */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{
          backgroundImage: "url('/indian-heritage-site-taj-mahal-golden-hour-beautif.png')",
          transform: mounted ? "scale(1)" : "scale(1.1)",
        }}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      </div>

      {/* Login Card */}
      <Card
        className={`relative z-10 w-full max-w-md frosted-glass border-white/20 shadow-2xl transition-all duration-1000 ${
          mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
        }`}
      >
        <CardContent className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary mb-4 shadow-lg transition-all duration-1000 delay-300 ${
                mounted ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 rotate-12"
              }`}
            >
              <span className="text-white font-bold text-2xl">BL</span>
            </div>
            <h1
              className={`text-2xl font-bold gradient-text mb-2 transition-all duration-1000 delay-500 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              Bhu-Local
            </h1>
            <p
              className={`text-sm text-muted-foreground transition-all duration-1000 delay-700 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              Discover India Like Never Before
            </p>
          </div>

          {step === "phone" && (
            <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Welcome Back!</h2>
                <p className="text-sm text-muted-foreground">Enter your mobile number to continue</p>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                  <Input
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="pl-10 h-12 bg-white/80 border-white/30 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                    maxLength={10}
                  />
                </div>

                <AnimatedButton
                  onClick={handleSendOTP}
                  disabled={phone.length < 10 || isLoading}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  animation="glow"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Sending OTP...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Send OTP</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  )}
                </AnimatedButton>
              </div>

              <div className="text-center text-xs text-muted-foreground animate-in fade-in-0 duration-1000 delay-1000">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </div>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-500">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Verify Your Number</h2>
                <p className="text-sm text-muted-foreground">We've sent a 6-digit code to +91 {phone}</p>
              </div>

              <div className="space-y-4">
                {/* OTP Input Boxes */}
                <div className="flex justify-center space-x-2">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOTPChange(index, e.target.value)}
                      className="w-12 h-12 text-center text-lg font-semibold bg-white/80 border-white/30 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 focus:scale-110"
                      style={{ animationDelay: `${index * 100}ms` }}
                    />
                  ))}
                </div>

                <AnimatedButton
                  onClick={handleVerifyOTP}
                  disabled={otp.join("").length !== 6 || isLoading}
                  className="w-full h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
                  animation="glow"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    "Verify & Continue"
                  )}
                </AnimatedButton>

                {/* Resend OTP */}
                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Resend OTP in <span className="font-mono text-primary">{resendTimer}</span>s
                    </p>
                  ) : (
                    <AnimatedButton
                      variant="ghost"
                      onClick={handleResendOTP}
                      disabled={isLoading}
                      className="text-sm text-primary hover:text-primary/80"
                      animation="slide"
                    >
                      Resend OTP
                    </AnimatedButton>
                  )}
                </div>

                {/* Back to phone */}
                <AnimatedButton
                  variant="ghost"
                  onClick={() => setStep("phone")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                  animation="slide"
                >
                  Change Phone Number
                </AnimatedButton>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

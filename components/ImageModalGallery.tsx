"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Loader2, AlertCircle, Send } from "lucide-react"
import { Portal } from "./portal" // <-- 1. Import the Portal
import { Textarea } from "@/components/ui/textarea"


interface ImageGalleryModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ApiImage {
  id: string
  url: string
  alt?: string
}

interface ApiReview {
  id: string;
  text: string;
  createdAt: string; // Should be an ISO date string
}

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}
interface ApiJournal {
  id: string;
  text: string;
  createdAt: string; // ISO date string
}

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImageGalleryModal({ isOpen, onClose }: ImageGalleryModalProps) {
  const [images, setImages] = useState<ApiImage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const fetchImages = async () => {
        setIsLoading(true)
        setError(null)
        setImages([])
        try {
          const response = await fetch(`/api/images`)
          if (!response.ok) {
            throw new Error("Failed to fetch images. Please try again later.")
          }
          const data = await response.json()
          setImages(data)
        } catch (err: any) {
          setError(err.message)
        } finally {
          setIsLoading(false)
        }
      }
      fetchImages()
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  return (
    // --- 2. Wrap everything in the Portal component ---
    <Portal>
      <div 
        className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-300"
        onClick={onClose}
      >
        <div 
          className="flex min-h-full items-center justify-center p-4"
        >
          <Card 
            className="relative w-full max-w-4xl transform text-left align-middle shadow-xl transition-all animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()} 
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-2 right-2 z-10 text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
            <CardContent className="p-6 max-h-[85vh] overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-xl font-semibold">Photo Gallery</h3>
                <p className="text-sm text-muted-foreground">Images from fellow travelers.</p>
              </div>
              
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-muted-foreground">Loading Images...</p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center h-64 text-destructive">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p>{error}</p>
                </div>
              )}

              {!isLoading && !error && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.length > 0 ? (
                    images.map((img) => (
                      <div key={img.id} className="overflow-hidden rounded-lg group aspect-square">
                        <img 
                          src={img.url} 
                          alt={img.alt || "User uploaded image"} 
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <p className="text-muted-foreground">No images have been shared yet.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Portal>
  )
}


export function ReviewsModal({ isOpen, onClose }: ReviewsModalProps) {
  // --- 2. State management for reviews, loading, and error ---
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Effect to handle body scroll when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen]);

  // --- 3. Effect to fetch reviews when the modal is opened ---
  useEffect(() => {
    if (isOpen) {
      const fetchReviews = async () => {
        setIsLoading(true)
        setError(null)
        setReviews([])
        try {
          const response = await fetch(`/api/reviews`) // Changed API endpoint
          if (!response.ok) {
            throw new Error("Failed to fetch reviews. Please try again later.")
          }
          const data = await response.json()
          setReviews(data)
        } catch (err: any) {
          setError(err.message)
        } finally {
          setIsLoading(false)
        }
      }
      fetchReviews()
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  return (
    // The overall modal structure remains the same
    <Portal>
      <div 
        className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-300"
        onClick={onClose}
      >
        <div 
          className="flex min-h-full items-center justify-center p-4"
        >
          <Card 
            className="relative w-full max-w-2xl transform text-left align-middle shadow-xl transition-all animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()} 
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-2 right-2 z-10 text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
            <CardContent className="p-6 max-h-[85vh] overflow-y-auto">
              {/* --- 4. Updated header for the reviews modal --- */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold">Traveler Reviews</h3>
                <p className="text-sm text-muted-foreground">What fellow travelers are saying.</p>
              </div>
              
              {/* Loading State */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-muted-foreground">Loading Reviews...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="flex flex-col items-center justify-center h-64 text-destructive">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p>{error}</p>
                </div>
              )}

              {/* --- 5. Display logic for reviews or empty state --- */}
              {!isLoading && !error && (
                <div className="space-y-4">
                  {reviews.length > 0 ? (
                    reviews.map((review) => (
                      <div key={review.id} className="p-4 border rounded-lg bg-muted/50">
                        <p className="text-sm text-foreground mb-2 italic">"{review.text}"</p>
                        <p className="text-xs text-muted-foreground text-right">
                          {new Date(review.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No reviews have been shared yet.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Portal>
  )
}


export function JournalModal({ isOpen, onClose }: JournalModalProps) {
  // State for the list of journals, loading, and fetching errors
  const [journals, setJournals] = useState<ApiJournal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // State specifically for the new journal form
  const [newJournalText, setNewJournalText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Effect to handle body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen]);

  // --- 3. FUNCTION TO FETCH ALL JOURNALS ---
  // We use useCallback so this function can be reused without re-creating it
  const fetchJournals = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/journal`)
      if (!response.ok) {
        throw new Error("Failed to fetch journal entries.")
      }
      const data = await response.json()
      setJournals(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Effect to fetch journals when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchJournals()
    }
  }, [isOpen, fetchJournals])

  // --- 4. FUNCTION TO HANDLE SUBMITTING A NEW JOURNAL ---
  const handleSubmitJournal = async () => {
    if (newJournalText.trim().length === 0) {
      setSubmitError("Journal entry cannot be empty.")
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(`/api/journal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: newJournalText }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit your entry. Please try again.")
      }
      
      // Clear the textarea and refresh the list to show the new entry
      setNewJournalText("")
      fetchJournals()

    } catch (err: any) {
      setSubmitError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <Portal>
      <div 
        className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-300"
        onClick={onClose}
      >
        <div className="flex min-h-full items-center justify-center p-4">
          <Card 
            className="relative w-full max-w-2xl transform text-left align-middle shadow-xl transition-all animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()} 
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-2 right-2 z-10 text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
            <CardContent className="p-6 max-h-[85vh] overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-xl font-semibold">My Travel Journal</h3>
                <p className="text-sm text-muted-foreground">Add a new entry and see what others have shared.</p>
              </div>

              {/* --- 5. TOP SECTION: NEW JOURNAL INPUT --- */}
              <div className="space-y-3 mb-6">
                <Textarea
                  placeholder="What's on your mind today?"
                  value={newJournalText}
                  onChange={(e) => setNewJournalText(e.target.value)}
                  disabled={isSubmitting}
                  className="min-h-[100px]"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-destructive">{submitError}</p>
                  <Button onClick={handleSubmitJournal} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Add Entry
                  </Button>
                </div>
              </div>

              <hr className="my-6" />

              {/* --- 6. BOTTOM SECTION: LIST OF ALL JOURNALS --- */}
              <div className="space-y-4">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-muted-foreground">Loading Entries...</p>
                  </div>
                )}

                {error && (
                  <div className="flex flex-col items-center justify-center py-10 text-destructive">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>{error}</p>
                  </div>
                )}
                
                {!isLoading && !error && journals.length > 0 && (
                  journals.map((journal) => (
                    <div key={journal.id} className="p-4 border rounded-lg bg-muted/50 animate-in fade-in-0">
                      <p className="text-sm text-foreground mb-2 whitespace-pre-wrap">{journal.text}</p>
                      <p className="text-xs text-muted-foreground text-right">
                        {new Date(journal.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    </div>
                  ))
                )}
                
                {!isLoading && !error && journals.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No journal entries yet. Be the first!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Portal>
  )
}


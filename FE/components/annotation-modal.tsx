"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Annotation {
  id: string
  x: number
  y: number
  label: string
}

interface ImageAnnotations {
  imageId: string
  annotations: Annotation[]
}

interface AnnotationModalProps {
  images: Array<{ id: string; preview: string; file: File }>
  onClose: () => void
  onSave: (annotations: ImageAnnotations[]) => void
}

export function AnnotationModal({ images, onClose, onSave }: AnnotationModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [allAnnotations, setAllAnnotations] = useState<Record<string, Annotation[]>>({})
  const [inputPosition, setInputPosition] = useState<{ x: number; y: number } | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentImage = images[currentIndex]

  useEffect(() => {
    const initialized: Record<string, Annotation[]> = {}
    images.forEach((img) => {
      initialized[img.id] = []
    })
    setAllAnnotations(initialized)
  }, [images])

  useEffect(() => {
    if (inputRef.current && inputPosition) {
      inputRef.current.focus()
    }
  }, [inputPosition])

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setInputPosition({ x, y })
    setInputValue("")
  }

  const handleAddAnnotation = () => {
    if (!inputPosition || !inputValue.trim()) return

    const newAnnotation: Annotation = {
      id: Math.random().toString(36).substr(2, 9),
      x: inputPosition.x,
      y: inputPosition.y,
      label: inputValue.trim(),
    }

    setAllAnnotations((prev) => ({
      ...prev,
      [currentImage.id]: [...(prev[currentImage.id] || []), newAnnotation],
    }))

    setInputPosition(null)
    setInputValue("")
  }

  const handleRemoveAnnotation = (annotationId: string) => {
    setAllAnnotations((prev) => ({
      ...prev,
      [currentImage.id]: prev[currentImage.id].filter((a) => a.id !== annotationId),
    }))
    setSelectedAnnotationId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddAnnotation()
    } else if (e.key === "Escape") {
      setInputPosition(null)
      setInputValue("")
    }
  }

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setInputPosition(null)
      setSelectedAnnotationId(null)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setInputPosition(null)
      setSelectedAnnotationId(null)
    }
  }

  const handleSave = () => {
    const annotationsArray = images.map((img) => ({
      imageId: img.id,
      annotations: allAnnotations[img.id] || [],
    }))
    console.log("[v0] Saving annotations:", annotationsArray)
    onSave(annotationsArray)
  }

  const currentAnnotations = allAnnotations[currentImage.id] || []
  const totalAnnotations = Object.values(allAnnotations).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-card">
          <div>
            <h2 className="text-2xl font-bold">Annotate Images</h2>
            <p className="text-sm text-muted-foreground">
              Click on the image to add labels. Image {currentIndex + 1} of {images.length}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent/10 rounded transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 gap-6">
            {/* Image Area */}
            <div className="col-span-3">
              <div className="relative inline-block w-full">
                <div
                  ref={imageContainerRef}
                  onClick={handleImageClick}
                  className="relative bg-black rounded-lg overflow-hidden border-2 border-border cursor-crosshair w-full"
                  style={{ aspectRatio: "16/9" }}
                >
                  <img
                    key={currentImage.id}
                    src={currentImage.preview || "/placeholder.svg"}
                    alt={`Image ${currentIndex + 1}`}
                    className="w-full h-full object-contain"
                  />

                  {currentAnnotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                      style={{
                        left: `${annotation.x}px`,
                        top: `${annotation.y}px`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedAnnotationId(annotation.id)
                      }}
                    >
                      <div className="w-full h-full rounded-full border-2 border-cyan-400 bg-cyan-400/20 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      </div>
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-cyan-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition z-10">
                        {annotation.label}
                      </div>
                    </div>
                  ))}

                  {inputPosition && (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                      style={{
                        left: `${inputPosition.x}px`,
                        top: `${inputPosition.y}px`,
                      }}
                    >
                      <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Enter label..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => {
                          if (inputValue.trim()) {
                            handleAddAnnotation()
                          } else {
                            setInputPosition(null)
                          }
                        }}
                        className="w-48 bg-background border-2 border-cyan-400 shadow-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 gap-4">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="gap-2 flex-1 bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground px-4 py-2 rounded bg-accent/10">
                  {currentIndex + 1} / {images.length}
                </div>
                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={currentIndex === images.length - 1}
                  className="gap-2 flex-1 bg-transparent"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="col-span-1">
              <Card className="p-4 bg-card/50 border-border/50">
                <h3 className="font-semibold text-sm mb-4">Annotations ({currentAnnotations.length})</h3>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {currentAnnotations.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Click on the image to add annotations
                    </p>
                  ) : (
                    currentAnnotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        className={`p-2 rounded border text-xs cursor-pointer transition ${
                          selectedAnnotationId === annotation.id
                            ? "border-cyan-400 bg-cyan-400/10"
                            : "border-border hover:border-cyan-400/50"
                        }`}
                        onClick={() => setSelectedAnnotationId(annotation.id)}
                      >
                        <div className="font-semibold text-cyan-400 truncate">{annotation.label}</div>
                        <div className="text-muted-foreground text-xs">
                          ({Math.round(annotation.x)}, {Math.round(annotation.y)})
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveAnnotation(annotation.id)
                          }}
                          className="mt-1 w-full px-2 py-1 text-xs rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                  <div className="mb-2">Progress</div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{
                        width: `${images.length > 0 ? (currentIndex / images.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-center">
                    <span className="font-semibold">{totalAnnotations}</span> total annotations
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-card/50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="text-xs text-muted-foreground">
            Total: <span className="font-semibold">{totalAnnotations}</span> annotations across{" "}
            <span className="font-semibold">{images.length}</span> images
          </div>
          <Button onClick={handleSave} className="gap-2">
            Save All Annotations
          </Button>
        </div>
      </Card>
    </div>
  )
}


import type React from "react"

import { useState, useRef, useEffect } from "react"
import { X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Annotation {
  id: string
  xCenter: number
  yCenter: number
  width: number
  height: number
  label: string
}

interface ImageAnnotations {
  imageId: string
  annotations: Annotation[]
}

interface SelfAnnotationModalProps {
  images: Array<{ id: string; preview: string }>
  initialAnnotations?: Record<string, Annotation[]>
  onClose: () => void
  onSave: (annotations: ImageAnnotations[]) => void
}

export function SelfAnnotationModal({ 
  images,
  initialAnnotations,
  onClose,
  onSave, 
}: SelfAnnotationModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [allAnnotations, setAllAnnotations] = useState<Record<string, Annotation[]>>({})
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [showLabelInput, setShowLabelInput] = useState(false)
  const [labelValue, setLabelValue] = useState("")
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })

  const currentImage = images[currentIndex]

  // Initialize annotations
  useEffect(() => {
    const initialized: Record<string, Annotation[]> = {}
  
    images.forEach((img) => {
      const existing = initialAnnotations?.[String(img.id)] ?? []
      // 깊은 복사까지는 과하지 않아도 되고, 배열 복사만 해도 충분
      initialized[String(img.id)] = existing.map((ann) => ({
        // 백엔드에서 받은 id를 그냥 string으로 쓰거나
        id: String(ann.id ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
        xCenter: ann.xCenter,
        yCenter: ann.yCenter,
        width: ann.width,
        height: ann.height,
        label: ann.label,
      }))
    })
  
    setAllAnnotations(initialized)
  }, [images, initialAnnotations])

  // Focus input when it appears
  useEffect(() => {
    if (showLabelInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showLabelInput])

  // Draw Annotation when user change window size
  useEffect(() => {
    const updateCanvasSize = () => {
      if (!imageContainerRef.current) return
      const container = imageContainerRef.current.getBoundingClientRect()
  
      // ✅ 캔버스 사이즈는 여기선 state만 업데이트
      setCanvasSize({
        width: container.width,
        height: container.height,
      })
    }
  
    updateCanvasSize() // 처음 한 번
  
    window.addEventListener("resize", updateCanvasSize)
    return () => window.removeEventListener("resize", updateCanvasSize)
  }, [currentImage.id])
  

  // Draw annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
  
    // ✅ 아직 사이즈 계산 안됐으면 그리지 않음
    if (!canvasSize.width || !canvasSize.height) return
  
    const ctx = canvas.getContext("2d")
    if (!ctx) return
  
    // ✅ 항상 canvasSize 기준으로 캔버스 크기 설정
    canvas.width = canvasSize.width
    canvas.height = canvasSize.height
  
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  
    // Draw existing annotations
    const currentAnnotations = allAnnotations[currentImage.id] || []
    currentAnnotations.forEach((annotation) => {
      const isSelected = selectedAnnotationId === annotation.id
      ctx.strokeStyle = isSelected ? "#06b6d4" : "#0891b2"
      ctx.lineWidth = isSelected ? 3 : 2
  
      const boxW = annotation.width * canvas.width
      const boxH = annotation.height * canvas.height
      const boxX = (annotation.xCenter - annotation.width / 2) * canvas.width
      const boxY = (annotation.yCenter - annotation.height / 2) * canvas.height
  
      ctx.strokeRect(boxX, boxY, boxW, boxH)
  
      const labelText = annotation.label
      const fontHeight = 16
      const padding = 4
      const textWidth = ctx.measureText(labelText).width
  
      ctx.fillStyle = isSelected ? "#06b6d4" : "#0891b2"
      ctx.fillRect(
        boxX,
        Math.max(0, boxY - fontHeight - padding * 2),
        textWidth + padding * 2,
        fontHeight + padding * 2,
      )
  
      ctx.fillStyle = "#000"
      ctx.font = "14px sans-serif"
      ctx.fillText(labelText, boxX + padding, Math.max(padding, boxY - padding))
    })
  
    if (currentRect) {
      ctx.strokeStyle = "#06b6d4"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height)
      ctx.setLineDash([])
    }
  }, [allAnnotations, currentImage.id, selectedAnnotationId, currentRect, canvasSize])
  

  // ✅ 현재 이미지(blob) 로드 (Authorization 헤더 포함)
  useEffect(() => {
    if (!currentImage?.preview) return

    const controller = new AbortController()
    const token = localStorage.getItem("accessToken")

    const loadImage = async () => {
      try {
        setIsImageLoading(true)
        setImageError(null)

        const res = await fetch(currentImage.preview, {
          method: "GET",
          signal: controller.signal,
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        })

        if (!res.ok) {
          throw new Error(`이미지 로드 실패 (${res.status})`)
        }

        const blob = await res.blob()
        const url = URL.createObjectURL(blob)

        // 이전 URL 정리 후 새 URL 설정
        setImageUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
      } catch (err: any) {
        if (err.name === "AbortError") return
        console.error("이미지 로드 실패:", err)
        setImageError(err.message ?? "이미지를 불러오지 못했습니다.")
        setImageUrl(null)
      } finally {
        setIsImageLoading(false)
      }
    }

    loadImage()

    return () => {
      controller.abort()
      // URL 정리는 setImageUrl에서 이전 값을 revoke하고 있으니 여기선 생략 가능
    }
  }, [currentImage?.id, currentImage?.preview])
  

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDrawing(true)
    setStartPos({ x, y })
    setCurrentRect({ x, y, width: 0, height: 0 })
    setSelectedAnnotationId(null)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCurrentRect({
      x: startPos.x,
      y: startPos.y,
      width: x - startPos.x,
      height: y - startPos.y,
    })
  }

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) {
      setIsDrawing(false)
      return
    }

    // Only show label input if rectangle has meaningful size
    if (Math.abs(currentRect.width) > 10 && Math.abs(currentRect.height) > 10) {
      setShowLabelInput(true)
    } else {
      setCurrentRect(null)
    }
    setIsDrawing(false)
  }

  const handleAddAnnotation = () => {
    if (!currentRect || !labelValue.trim() || !imageContainerRef.current) return
  
    const container = imageContainerRef.current
    const cw = container.offsetWidth
    const ch = container.offsetHeight
    if (!cw || !ch) return
  
    // 🔥 드래그 방향에 상관없이 왼쪽 위(xPx, yPx), 폭/높이(wPx, hPx) 픽셀 값 계산
    const xPx = currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x
    const yPx = currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y
    const wPx = Math.abs(currentRect.width)
    const hPx = Math.abs(currentRect.height)
  
    // 0~1 사이로 정규화 + center 좌표 계산
    const xCenter = (xPx + wPx / 2) / cw
    const yCenter = (yPx + hPx / 2) / ch
    const width = wPx / cw
    const height = hPx / ch
  
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
  
    const newAnnotation: Annotation = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      xCenter: clamp01(xCenter),
      yCenter: clamp01(yCenter),
      width: clamp01(width),
      height: clamp01(height),
      label: labelValue.trim(),
    }
  
    setAllAnnotations((prev) => ({
      ...prev,
      [currentImage.id]: [...(prev[currentImage.id] || []), newAnnotation],
    }))
  
    setCurrentRect(null)
    setShowLabelInput(false)
    setLabelValue("")
  }  

  const handleCancel = () => {
    setCurrentRect(null)
    setShowLabelInput(false)
    setLabelValue("")
  }

  const resetDrawingState = () => {
    setCurrentRect(null)
    setSelectedAnnotationId(null)
    setShowLabelInput(false)
    setLabelValue("")
  }  

  const handleRemoveAnnotation = (annotationId: string) => {
    setAllAnnotations((prev) => ({
      ...prev,
      [currentImage.id]: prev[currentImage.id].filter((a) => a.id !== annotationId),
    }))
    setSelectedAnnotationId(null)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => {
      if (prev >= images.length - 1) return prev
      resetDrawingState()
      return prev + 1
    })
  }
  
  const handlePrev = () => {
    setCurrentIndex((prev) => {
      if (prev <= 0) return prev
      resetDrawingState()
      return prev - 1
    })
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
            <h2 className="text-2xl font-bold">Self-Annotation Tool</h2>
            <p className="text-sm text-muted-foreground">
              Drag to draw boxes around objects and label them. Image {currentIndex + 1} of {images.length}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent/10 rounded transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 gap-6">
            {/* Canvas Area */}
            <div className="col-span-3">
              <div className="relative w-full bg-black rounded-lg overflow-hidden border-2 border-border">
              {imageUrl ? (
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt={`Image ${currentIndex + 1}`}
                  className="w-full h-auto block"
                  onLoad={() => {
                    // ✅ 이미지가 실제로 로드된 시점에 컨테이너 크기 재측정
                    if (!imageContainerRef.current) return
                    const container = imageContainerRef.current.getBoundingClientRect()
                    setCanvasSize({
                      width: container.width,
                      height: container.height,
                    })
                  }}
                />
              ) : (
                  <div className="w-full aspect-video flex items-center justify-center text-xs text-muted-foreground">
                    {isImageLoading
                      ? "이미지를 불러오는 중입니다..."
                      : imageError ?? "이미지를 불러올 수 없습니다."}
                  </div>
                )}

                <div ref={imageContainerRef} className="absolute inset-0">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="absolute inset-0 cursor-crosshair"
                  />

                  {/* Label Input */}
                  {showLabelInput && currentRect && (
                    <div
                      className="absolute bg-card border-2 border-accent rounded p-2 z-20"
                      style={{
                        left: `${currentRect.x}px`,
                        top: `${currentRect.y - 50}px`,
                      }}
                    >
                      <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Enter label..."
                        value={labelValue}
                        onChange={(e) => setLabelValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddAnnotation()
                          if (e.key === "Escape") handleCancel()
                        }}
                        className="w-40 text-sm"
                      />
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" onClick={handleAddAnnotation} className="flex-1">
                          Add
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel} className="flex-1 bg-transparent">
                          Cancel
                        </Button>
                      </div>
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
              <Card className="p-4 bg-card/50 border-border/50 flex flex-col h-full">
                <h3 className="font-semibold text-sm mb-4">Annotations ({currentAnnotations.length})</h3>

                <div className="space-y-2 flex-1 overflow-y-auto">
                  {currentAnnotations.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Drag on image to add annotations</p>
                  ) : (
                    currentAnnotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        className={`p-2 rounded border text-xs cursor-pointer transition ${
                          selectedAnnotationId === annotation.id
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent/50"
                        }`}
                        onClick={() => setSelectedAnnotationId(annotation.id)}
                      >
                        <div className="font-semibold text-accent truncate">{annotation.label}</div>
                        <div className="text-muted-foreground text-xs">
                          ({Math.round(annotation.xCenter * 100)}%, {Math.round(annotation.yCenter * 100)}%)
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
            Total: <span className="font-semibold">{totalAnnotations}</span> annotations
          </div>
          <Button onClick={handleSave} className="gap-2">
            Save All Annotations
          </Button>
        </div>
      </Card>
    </div>
  )
}

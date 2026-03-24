import type React from "react"
import { useEffect, useRef, useState } from "react"
import { X, ChevronLeft, ChevronRight, Trash2, Layers, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface ModalAnnotation {
  id: string
  x: number  // YOLO center_x (0..1)
  y: number  // YOLO center_y (0..1)
  width: number   // YOLO normalized width
  height: number  // YOLO normalized height
  label: string
}

export interface ModalImageItem {
  id: number
  preview: string
  filename?: string
  annotations?: ModalAnnotation[]
}

interface ImageAnnotations {
  imageId: number
  annotations: ModalAnnotation[]
}

interface SelfAnnotationModalProps {
  images: ModalImageItem[]
  initialIndex?: number
  onClose: () => void
  onSave: (annotations: ImageAnnotations[]) => void
}

export function SelfAnnotationModal({ images, initialIndex = 0, onClose, onSave }: SelfAnnotationModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [allAnnotations, setAllAnnotations] = useState<Record<number, ModalAnnotation[]>>({})
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [showLabelInput, setShowLabelInput] = useState(false)
  const [labelValue, setLabelValue] = useState("")
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)

  const currentImage = images[currentIndex]

  // Init annotations
  useEffect(() => {
    const init: Record<number, ModalAnnotation[]> = {}
    images.forEach((img) => { init[img.id] = img.annotations ?? [] })
    setAllAnnotations(init)
  }, [images])

  useEffect(() => {
    if (showLabelInput && inputRef.current) inputRef.current.focus()
  }, [showLabelInput])

  // Redraw canvas whenever annotations / currentRect changes
  useEffect(() => {
    redraw()
  }, [allAnnotations, currentImage, selectedAnnotationId, currentRect])

  const redraw = () => {
    const canvas = canvasRef.current
    const img = imgRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !img || !wrapper || !currentImage) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const W = wrapper.clientWidth
    const H = wrapper.clientHeight
    canvas.width = W
    canvas.height = H

    ctx.clearRect(0, 0, W, H)

    const imgRect = img.getBoundingClientRect()
    const wrapperRect = wrapper.getBoundingClientRect()
    const offsetX = imgRect.left - wrapperRect.left
    const offsetY = imgRect.top - wrapperRect.top
    const dispW = imgRect.width
    const dispH = imgRect.height
    const natW = img.naturalWidth || dispW
    const natH = img.naturalHeight || dispH

    const yoloToCanvas = (a: ModalAnnotation) => {
      const cx = a.x * natW
      const cy = a.y * natH
      const aw = a.width * natW
      const ah = a.height * natH
      const sx = dispW / natW
      const sy = dispH / natH
      return {
        x: offsetX + (cx - aw / 2) * sx,
        y: offsetY + (cy - ah / 2) * sy,
        w: aw * sx,
        h: ah * sy,
      }
    }

    // Draw saved annotations
    const annotations = allAnnotations[currentImage.id] || []
    annotations.forEach((a) => {
      const { x, y, w, h } = yoloToCanvas(a)
      const selected = selectedAnnotationId === a.id
      ctx.strokeStyle = selected ? "#22d3ee" : "#06b6d4"
      ctx.lineWidth = selected ? 3 : 2
      ctx.strokeRect(x, y, w, h)

      ctx.font = "bold 12px sans-serif"
      const tw = ctx.measureText(a.label).width
      const pad = 4
      const lh = 16
      ctx.fillStyle = selected ? "#22d3ee" : "#06b6d4"
      ctx.fillRect(x, Math.max(0, y - lh - pad * 2), tw + pad * 2, lh + pad * 2)
      ctx.fillStyle = "#000"
      ctx.fillText(a.label, x + pad, Math.max(14, y - pad))
    })

    // Draw in-progress rect
    if (currentRect) {
      ctx.strokeStyle = "#a855f7"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height)
      ctx.setLineDash([])
    }
  }

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e)
    setIsDrawing(true)
    setStartPos(pos)
    setCurrentRect({ ...pos, width: 0, height: 0 })
    setSelectedAnnotationId(null)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return
    const pos = getPos(e)
    setCurrentRect({ x: startPos.x, y: startPos.y, width: pos.x - startPos.x, height: pos.y - startPos.y })
  }

  const handleMouseUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (currentRect && Math.abs(currentRect.width) > 10 && Math.abs(currentRect.height) > 10) {
      setShowLabelInput(true)
    } else {
      setCurrentRect(null)
    }
  }

  const handleAdd = () => {
    if (!currentRect || !labelValue.trim() || !currentImage || !imgRef.current || !wrapperRef.current) return

    const img = imgRef.current
    const wrapper = wrapperRef.current
    const imgRect = img.getBoundingClientRect()
    const wrapperRect = wrapper.getBoundingClientRect()
    const offsetX = imgRect.left - wrapperRect.left
    const offsetY = imgRect.top - wrapperRect.top
    const dispW = imgRect.width
    const dispH = imgRect.height
    const natW = img.naturalWidth || dispW
    const natH = img.naturalHeight || dispH

    const rx = currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x
    const ry = currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y
    const rw = Math.abs(currentRect.width)
    const rh = Math.abs(currentRect.height)

    const imgRelX = rx - offsetX
    const imgRelY = ry - offsetY
    const scaleX = natW / dispW
    const scaleY = natH / dispH

    const xOnImg = Math.max(0, imgRelX * scaleX)
    const yOnImg = Math.max(0, imgRelY * scaleY)
    const wOnImg = Math.min(natW - xOnImg, rw * scaleX)
    const hOnImg = Math.min(natH - yOnImg, rh * scaleY)

    const annotation: ModalAnnotation = {
      id: Math.random().toString(36).slice(2, 10),
      x: parseFloat(((xOnImg + wOnImg / 2) / natW).toFixed(6)),
      y: parseFloat(((yOnImg + hOnImg / 2) / natH).toFixed(6)),
      width: parseFloat((wOnImg / natW).toFixed(6)),
      height: parseFloat((hOnImg / natH).toFixed(6)),
      label: labelValue.trim(),
    }

    setAllAnnotations((prev) => ({ ...prev, [currentImage.id]: [...(prev[currentImage.id] || []), annotation] }))
    setCurrentRect(null)
    setShowLabelInput(false)
    setLabelValue("")
  }

  const handleRemove = (id: string) => {
    if (!currentImage) return
    setAllAnnotations((prev) => ({ ...prev, [currentImage.id]: (prev[currentImage.id] || []).filter((a) => a.id !== id) }))
    if (selectedAnnotationId === id) setSelectedAnnotationId(null)
  }

  const handleSave = () => {
    setSaving(true)
    onSave(images.map((img) => ({ imageId: img.id, annotations: allAnnotations[img.id] || [] })))
  }

  const currentAnnotations = currentImage ? (allAnnotations[currentImage.id] || []) : []

  if (!currentImage) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      {/* Modal: full height, no internal scroll */}
      <div className="bg-card border border-border rounded-xl w-full max-w-6xl flex flex-col" style={{ height: "calc(100vh - 2rem)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-xl font-bold">Self-Annotation Tool</h2>
            <p className="text-xs text-muted-foreground">
              {currentImage.filename || `Image ${currentIndex + 1}`} &mdash; {currentIndex + 1} / {images.length}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body: fills remaining height, no overflow */}
        <div className="flex flex-1 min-h-0 gap-4 p-4">

          {/* Canvas area */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            {/* Image wrapper: fills all available height */}
            <div
              ref={wrapperRef}
              className="relative flex-1 min-h-0 bg-black/60 rounded-lg overflow-hidden border border-border"
            >
              {/* Image with object-contain to show full image inside wrapper */}
              <img
                ref={imgRef}
                src={currentImage.preview}
                alt={currentImage.filename || "image"}
                className="absolute inset-0 w-full h-full object-contain"
                onLoad={() => redraw()}
              />
              {/* Canvas overlaid exactly on wrapper */}
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="absolute inset-0 w-full h-full cursor-crosshair"
              />

              {/* Label input popup */}
              {showLabelInput && currentRect && (
                <div
                  className="absolute bg-card border-2 border-purple-500 rounded-lg p-3 z-20 shadow-xl"
                  style={{
                    left: Math.min(Math.max(0, currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x), (wrapperRef.current?.clientWidth ?? 400) - 220),
                    top: Math.min(Math.max(10, (currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y + Math.abs(currentRect.height)) + 8), (wrapperRef.current?.clientHeight ?? 400) - 100),
                  }}
                >
                  <p className="text-xs text-muted-foreground mb-2">라벨 입력</p>
                  <Input
                    ref={inputRef}
                    value={labelValue}
                    onChange={(e) => setLabelValue(e.target.value)}
                    placeholder="예: car, person, dog..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAdd()
                      if (e.key === "Escape") { setShowLabelInput(false); setCurrentRect(null); setLabelValue("") }
                    }}
                    className="w-48 text-sm mb-2"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAdd} className="flex-1">Add</Button>
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent"
                      onClick={() => { setShowLabelInput(false); setCurrentRect(null); setLabelValue("") }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Prev / Next navigation */}
            <div className="flex items-center justify-between mt-3 shrink-0">
              <Button variant="outline" size="sm" disabled={currentIndex === 0}
                onClick={() => { setCurrentIndex((p) => p - 1); setCurrentRect(null); setShowLabelInput(false) }}
                className="gap-1 bg-transparent">
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <div className="flex gap-1">
                {images.map((_, i) => (
                  <button key={i}
                    onClick={() => { setCurrentIndex(i); setCurrentRect(null); setShowLabelInput(false) }}
                    className={`rounded-full transition-all h-2 ${i === currentIndex ? "bg-accent w-5" : (allAnnotations[images[i].id]?.length ?? 0) > 0 ? "bg-accent/50 w-2" : "bg-muted-foreground/30 w-2"}`}
                  />
                ))}
              </div>
              <Button variant="outline" size="sm" disabled={currentIndex === images.length - 1}
                onClick={() => { setCurrentIndex((p) => p + 1); setCurrentRect(null); setShowLabelInput(false) }}
                className="gap-1 bg-transparent">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-56 shrink-0 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-sm">Annotations</span>
              <span className="ml-auto text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">{currentAnnotations.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {currentAnnotations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  이미지 위에서 드래그해서<br />바운딩 박스를 그려주세요
                </div>
              ) : (
                currentAnnotations.map((a, i) => (
                  <div key={a.id}
                    onClick={() => setSelectedAnnotationId(a.id === selectedAnnotationId ? null : a.id)}
                    className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-2 ${selectedAnnotationId === a.id ? "border-cyan-500 bg-cyan-500/10" : "border-border hover:border-cyan-500/50 bg-background/40"}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded bg-cyan-500 text-background text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-sm truncate">{a.label}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleRemove(a.id) }} className="text-destructive shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer actions */}
            <div className="mt-4 space-y-2 shrink-0">
              <Button onClick={handleSave} disabled={saving} className="w-full text-sm">
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />저장 중...</> : "Save All"}
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full text-sm bg-transparent">Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

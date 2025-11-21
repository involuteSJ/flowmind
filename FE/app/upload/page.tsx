"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, X, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"

interface UploadedImage {
  id: string
  file: File
  preview: string
  size: number
  uploadedAt: Date
}

export default function UploadPage() {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === "dragenter" || e.type === "dragover")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith("image/"))
    processFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files ? Array.from(e.currentTarget.files) : []
    processFiles(files)
  }

  const processFiles = (files: File[]) => {
    setUploading(true)
    setTimeout(() => {
      const newImages = files.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        size: file.size,
        uploadedAt: new Date(),
      }))
      setImages((prev) => [...prev, ...newImages])
      setUploading(false)
    }, 500)
  }

  const removeImage = (id: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === id)
      if (image) URL.revokeObjectURL(image.preview)
      return prev.filter((img) => img.id !== id)
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Images</h1>
          <p className="text-muted-foreground">
            Upload your images to start building your dataset. Drag and drop or click to select files.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload Area */}
          <div className="lg:col-span-2">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-border bg-card/30"
              }`}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Drag and drop your images</h2>
              <p className="text-muted-foreground mb-6">or</p>
              <label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
                <Button variant="outline" className="cursor-pointer bg-transparent" disabled={uploading} asChild>
                  <span className="flex items-center gap-2">
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Select Files
                      </>
                    )}
                  </span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-4">
                Supported formats: JPG, PNG, WebP, GIF (Max 100MB per file)
              </p>
            </div>

            {/* Uploaded Images Grid */}
            {images.length > 0 && (
              <div className="mt-8">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Uploaded ({images.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="group relative overflow-hidden rounded-lg border border-border bg-card hover:border-primary/50 transition"
                    >
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={image.preview || "/placeholder.svg"}
                          alt="Preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </div>
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute top-2 right-2 p-1 bg-destructive/90 text-destructive-foreground rounded opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-end">
                        <div className="w-full p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition">
                          {formatFileSize(image.size)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h3 className="font-semibold mb-4">Upload Summary</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Total Images</div>
                  <div className="text-2xl font-bold">{images.length}</div>
                </div>
                {images.length > 0 && (
                  <>
                    <div>
                      <div className="text-muted-foreground mb-1">Total Size</div>
                      <div className="font-semibold">
                        {formatFileSize(images.reduce((sum, img) => sum + img.size, 0))}
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <div className="text-muted-foreground mb-1">Newest Upload</div>
                      <div className="text-sm">{images[images.length - 1].uploadedAt.toLocaleTimeString()}</div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs text-muted-foreground mb-4">
                  {images.length === 0 ? "Upload at least 1 image to proceed" : "Ready to annotate your images"}
                </div>
                <Button className="w-full gap-2" disabled={images.length === 0} asChild={images.length > 0}>
                  {images.length > 0 ? (
                    <Link href="/annotate" className="flex items-center gap-2">
                      Continue to Annotation
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <>
                      Continue to Annotation
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-16 grid md:grid-cols-2 gap-6">
          <Card className="p-6 border-primary/20 bg-primary/5">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Tips for Best Results
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Use clear, well-lit images for better accuracy</li>
              <li>• Ensure consistent image sizes for your dataset</li>
              <li>• Include diverse examples to improve model performance</li>
              <li>• At least 50-100 images recommended per category</li>
            </ul>
          </Card>

          <Card className="p-6 border-accent/20 bg-accent/5">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-accent" />
              Dataset Guidelines
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Maximum 5GB per upload session</li>
              <li>• Batch uploads are processed sequentially</li>
              <li>• Your data is encrypted and securely stored</li>
              <li>• Delete images anytime before final export</li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  )
}

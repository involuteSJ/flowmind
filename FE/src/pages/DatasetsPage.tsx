import type React from "react"
import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, Plus, AlertCircle, Upload, ImageIcon, ChevronRight, X, CheckCircle2, Loader2 } from "lucide-react"
import { AnnotationModal } from "@/components/annotation-modal"

interface UploadedImage {
  id: string
  file: File
  preview: string
  size: number
  uploadedAt: Date
}

type Step = "overview" | "upload" | "annotate"

export default function DatasetsPage() {
  const [currentStep, setCurrentStep] = useState<Step>("overview")
  const [images, setImages] = useState<UploadedImage[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showAnnotationModal, setShowAnnotationModal] = useState(false)

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

  const handleAnnotationSave = (
    annotations: Array<{ imageId: string; annotations: Array<{ id: string; x: number; y: number; label: string }> }>,
  ) => {
    console.log("[v0] Annotations saved:", annotations)
    setShowAnnotationModal(false)
    setCurrentStep("overview")
  }

  if (currentStep === "overview") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Datasets</h1>
              <p className="text-muted-foreground">Manage and organize your annotated image datasets.</p>
            </div>
            <Button onClick={() => setCurrentStep("upload")} className="gap-2">
              <Plus className="w-4 h-4" />
              New Dataset
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Datasets List */}
            <div className="lg:col-span-2">
              <Card className="p-8 flex flex-col items-center justify-center min-h-96 border-2 border-dashed">
                <Database className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No datasets yet</h2>
                <p className="text-muted-foreground mb-6 text-center">
                  Create your first dataset by uploading and annotating images.
                </p>
                <Button onClick={() => setCurrentStep("upload")}>Create First Dataset</Button>
              </Card>
            </div>

            {/* Dataset Stats */}
            <div className="lg:col-span-1">
              <div className="space-y-4">
                <Card className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">Total Datasets</div>
                  <div className="text-3xl font-bold">0</div>
                </Card>

                <Card className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">Total Images</div>
                  <div className="text-3xl font-bold">0</div>
                </Card>

                <Card className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">Total Annotations</div>
                  <div className="text-3xl font-bold">0</div>
                </Card>

                <Card className="p-6 border-accent/20 bg-accent/5">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Dataset Tips
                  </h4>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li>• Organize images by category</li>
                    <li>• Maintain balanced datasets</li>
                    <li>• Use consistent labeling</li>
                    <li>• Export as COCO, Pascal VOC, or CSV</li>
                  </ul>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (currentStep === "upload") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <span className="ml-2 font-medium">Upload Images</span>
              </div>
              <div className="flex-1 h-1 bg-muted"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <span className="ml-2 text-muted-foreground">Annotate</span>
              </div>
            </div>
          </div>

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
                  <Button variant="outline" className="cursor-pointer bg-transparent" disabled={uploading}>
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
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentStep("overview")} className="flex-1">
                      Back
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      disabled={images.length === 0}
                      onClick={() => setCurrentStep("annotate")}
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
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

  if (currentStep === "annotate") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  ✓
                </div>
                <span className="ml-2 font-medium">Upload Images</span>
              </div>
              <div className="flex-1 h-1 bg-primary"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <span className="ml-2 font-medium">Annotate</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Annotate Images ({images.length})</h1>
            <p className="text-muted-foreground">
              Add labels and annotations to your images to create a labeled dataset.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Annotation Area */}
            <div className="lg:col-span-2">
              {images.length > 0 ? (
                <Card className="p-8 flex flex-col items-center justify-center min-h-96">
                  <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Start Annotating</h2>
                  <p className="text-muted-foreground mb-6 text-center">
                    Click the button below to open the annotation tool and label your {images.length} image
                    {images.length !== 1 ? "s" : ""}.
                  </p>
                  <Button onClick={() => setShowAnnotationModal(true)} className="gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Open Annotation Tool
                  </Button>
                </Card>
              ) : (
                <Card className="p-8 flex flex-col items-center justify-center min-h-96 border-2 border-dashed">
                  <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No images to annotate</h2>
                  <p className="text-muted-foreground mb-6 text-center">Go back to upload images first.</p>
                  <Button onClick={() => setCurrentStep("upload")}>Back to Upload</Button>
                </Card>
              )}
            </div>

            {/* Annotation Tools Sidebar */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <h3 className="font-semibold mb-4">Annotation Tools</h3>
                <div className="space-y-3">
                  <button className="w-full px-4 py-2 text-left text-sm font-medium rounded border border-border hover:bg-accent/10 transition bg-accent/5 border-accent/30">
                    Classification
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm font-medium rounded border border-border hover:bg-accent/10 transition text-muted-foreground opacity-50 cursor-not-allowed">
                    Bounding Box
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm font-medium rounded border border-border hover:bg-accent/10 transition text-muted-foreground opacity-50 cursor-not-allowed">
                    Polygon
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm font-medium rounded border border-border hover:bg-accent/10 transition text-muted-foreground opacity-50 cursor-not-allowed">
                    Segmentation
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-4">{images.length} images uploaded</p>
                  <div className="flex gap-2 flex-col">
                    <Button onClick={() => setCurrentStep("upload")} variant="outline">
                      Back to Upload
                    </Button>
                    <Button onClick={() => setCurrentStep("overview")}>Finish & Save</Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>

        {/* Annotation Modal */}
        {showAnnotationModal && (
          <AnnotationModal
            images={images}
            onClose={() => setShowAnnotationModal(false)}
            onSave={handleAnnotationSave}
          />
        )}
      </div>
    )
  }

  return null
}

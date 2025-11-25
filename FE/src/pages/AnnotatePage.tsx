import { Link, useParams } from "react-router-dom"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Download, Trash2, Wand2, Zap } from "lucide-react"

interface ImageWithAnnotations {
  id: string
  filename: string
  preview: string
  size: number
  uploadedAt: Date
  annotations: Array<{
    id: string
    label: string
    tags: string[]
    description: string
  }>
}

interface DatasetDetail {
  id: string
  name: string
  createdAt: Date
  description: string
  images: ImageWithAnnotations[]
}

// Mock data
const mockDataset: DatasetDetail = {
  id: "dataset-001",
  name: "Sample Dataset",
  createdAt: new Date("2024-01-15"),
  description: "A test dataset with sample images for annotation",
  images: [
    {
      id: "img-1",
      filename: "landscape-001.jpg",
      preview: "/abstract-geometric-shapes.png",
      size: 2048000,
      uploadedAt: new Date("2024-01-15T10:30:00"),
      annotations: [
        {
          id: "ann-1",
          label: "Mountain",
          tags: ["nature", "outdoor"],
          description: "Snow-covered mountain in the distance",
        },
        {
          id: "ann-2",
          label: "Sky",
          tags: ["nature", "blue"],
          description: "Clear blue sky with clouds",
        },
      ],
    },
    {
      id: "img-2",
      filename: "landscape-002.jpg",
      preview: "/abstract-geometric-shapes.png",
      size: 1856000,
      uploadedAt: new Date("2024-01-15T10:35:00"),
      annotations: [
        {
          id: "ann-3",
          label: "Forest",
          tags: ["nature", "green"],
          description: "Dense forest landscape",
        },
      ],
    },
    {
      id: "img-3",
      filename: "portrait-001.jpg",
      preview: "/sample-image-3.png",
      size: 3124000,
      uploadedAt: new Date("2024-01-15T11:00:00"),
      annotations: [
        {
          id: "ann-4",
          label: "Person",
          tags: ["human", "portrait"],
          description: "Portrait photograph",
        },
        {
          id: "ann-5",
          label: "Background",
          tags: ["studio", "blur"],
          description: "Blurred studio background",
        },
      ],
    },
    {
      id: "img-4",
      filename: "landscape-003.jpg",
      preview: "/abstract-geometric-shapes.png",
      size: 1920000,
      uploadedAt: new Date("2024-01-15T11:15:00"),
      annotations: [
        {
          id: "ann-6",
          label: "Lake",
          tags: ["water", "nature"],
          description: "Alpine lake landscape",
        },
      ],
    },
    {
      id: "img-5",
      filename: "portrait-002.jpg",
      preview: "/sample-image-3.png",
      size: 2560000,
      uploadedAt: new Date("2024-01-15T11:30:00"),
      annotations: [
        {
          id: "ann-7",
          label: "Face",
          tags: ["human", "close-up"],
          description: "Close-up portrait",
        },
      ],
    },
    {
      id: "img-6",
      filename: "nature-001.jpg",
      preview: "/abstract-geometric-shapes.png",
      size: 2304000,
      uploadedAt: new Date("2024-01-15T11:45:00"),
      annotations: [],
    },
  ],
}

export default function AnnotatePage() {
  const dataset = mockDataset

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const totalAnnotations = dataset.images.reduce((sum, img) => sum + img.annotations.length, 0)
  const totalSize = dataset.images.reduce((sum, img) => sum + img.size, 0)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link to="/datasets" className="inline-flex items-center gap-2 text-accent hover:text-accent/80 mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Datasets
          </Link>

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{dataset.name}</h1>
              <p className="text-muted-foreground mb-4">{dataset.description}</p>

              <div className="flex gap-3">
                <Button className="gap-2 bg-accent hover:bg-accent/90">
                  <Wand2 className="w-4 h-4" />
                  Self-Annotation
                </Button>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Zap className="w-4 h-4" />
                  Auto-Annotation
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 bg-transparent">
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button variant="outline" className="gap-2 text-destructive hover:text-destructive bg-transparent">
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stats */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dataset Info</h3>

            <Card className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Images</div>
              <div className="text-3xl font-bold text-accent">{dataset.images.length}</div>
            </Card>

            <Card className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Annotations</div>
              <div className="text-3xl font-bold text-accent">{totalAnnotations}</div>
            </Card>

            <Card className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Dataset Size</div>
              <div className="text-lg font-bold">{formatFileSize(totalSize)}</div>
            </Card>

            <Card className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Created</div>
              <div className="text-lg font-semibold">{formatDate(dataset.createdAt)}</div>
            </Card>
          </div>

          {/* Right Column: Images Grid */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Images ({dataset.images.length})
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {dataset.images.map((image) => (
                <div key={image.id} className="group cursor-pointer">
                  <div className="relative rounded-lg overflow-hidden bg-card border border-border group-hover:border-accent/50 transition">
                    <div className="aspect-square">
                      <img
                        src={image.preview || "/placeholder.svg"}
                        alt={image.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    </div>

                    {image.annotations.length > 0 && (
                      <div className="absolute top-2 right-2 bg-accent/90 text-background text-xs font-semibold px-2 py-1 rounded">
                        {image.annotations.length}
                      </div>
                    )}
                  </div>

                  {/* Filename below image */}
                  <p className="text-xs text-muted-foreground mt-2 truncate group-hover:text-foreground transition">
                    {image.filename}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

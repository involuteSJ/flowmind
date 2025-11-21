"use client"

import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImageIcon, ChevronRight, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function AnnotatePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Annotate Images</h1>
          <p className="text-muted-foreground">
            Add labels and annotations to your images to create a labeled dataset.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Annotation Area */}
          <div className="lg:col-span-2">
            <Card className="p-8 flex flex-col items-center justify-center min-h-96 border-2 border-dashed">
              <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No images to annotate</h2>
              <p className="text-muted-foreground mb-6 text-center">
                Upload images first to start annotating. Go to the Upload page to add images.
              </p>
              <Button asChild>
                <Link href="/upload">Go to Upload</Link>
              </Button>
            </Card>
          </div>

          {/* Annotation Tools Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h3 className="font-semibold mb-4">Annotation Tools</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 text-left text-sm font-medium rounded border border-border hover:bg-accent/10 transition">
                  Classification
                </button>
                <button className="w-full px-4 py-2 text-left text-sm font-medium rounded border border-border hover:bg-accent/10 transition">
                  Bounding Box
                </button>
                <button className="w-full px-4 py-2 text-left text-sm font-medium rounded border border-border hover:bg-accent/10 transition">
                  Polygon
                </button>
                <button className="w-full px-4 py-2 text-left text-sm font-medium rounded border border-border hover:bg-accent/10 transition">
                  Segmentation
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs text-muted-foreground mb-4 flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Upload images to start annotating</span>
                </div>
                <Button className="w-full gap-2" disabled>
                  Save Annotations
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

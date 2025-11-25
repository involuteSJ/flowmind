import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AssetImage } from "@/components/asset-image"
import { ChevronLeft, Download, Trash2, Wand2, Zap } from "lucide-react"

interface ImageWithAnnotations {
  id: string
  filename: string
  annotations: Array<{
    id: string
    label: string
    xCenter: number
    yCenter: number
    width: number
    height: number
  }>
}

interface DatasetDetail {
  id: string
  name: string
  version: string
  createdAt: string
  description: string
  images: ImageWithAnnotations[]
}

export default function AnnotatePage() {
  const [searchParams] = useSearchParams()
  const [dataset, setDataset] = useState<DatasetDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const datasetId = searchParams.get("datasetId")
  const version = searchParams.get("version")

  useEffect(() => {
    if (!datasetId || !version) {
      setError("잘못된 접근입니다. datasetId와 version이 필요합니다.")
      return
    }
  
    const controller = new AbortController()
  
    const fetchDataset = async () => {
      try {
        setIsLoading(true)
        setError(null)
  
        const query = new URLSearchParams({
          datasetId: String(datasetId),
          version: String(version),
        })
  
        const token = localStorage.getItem("accessToken")
  
        const headers: HeadersInit = {}
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }
  
        const res = await fetch(
          `http://localhost:8080/api/datasets/detail?${query.toString()}`,
          {
            method: "GET",
            headers,          // ✅ 토큰 추가
            signal: controller.signal,
          },
        )
  
        if (res.status === 401) {
          // 선택: 바로 에러 메시지 or 로그인 페이지로 이동 등
          throw new Error("로그인이 필요합니다. 다시 로그인 해주세요.")
        }
  
        if (!res.ok) {
          throw new Error(`서버 오류 (${res.status})`)
        }
  
        const data = (await res.json()) as DatasetDetail
        setDataset(data)
      } catch (err: any) {
        if (err.name === "AbortError") return
        console.error("Failed to fetch dataset detail", err)
        setError(err.message ?? "데이터셋 정보를 불러오지 못했습니다.")
      } finally {
        setIsLoading(false)
      }
    }
  
    fetchDataset()
  
    return () => controller.abort()
  }, [datasetId, version])
  

  const totalAnnotations = useMemo(
    () =>
      dataset?.images.reduce(
        (sum, img) => sum + (img.annotations?.length ?? 0),
        0,
      ) ?? 0,
    [dataset],
  )

  const formatDate = (iso: string) => {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            to="/datasets"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Datasets
          </Link>
          <p className="text-destructive">{error}</p>
        </main>
      </div>
    )
  }

  if (isLoading || !dataset) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            to="/datasets"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Datasets
          </Link>
          <p className="text-muted-foreground">
            데이터셋 정보를 불러오는 중입니다...
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            to="/datasets"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Datasets
          </Link>

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                {dataset.name}
                <span className="ml-2 text-lg text-muted-foreground">
                  ({dataset.version})
                </span>
              </h1>
              <p className="text-muted-foreground mb-4">
                {dataset.description}
              </p>

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
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive bg-transparent"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[280px,minmax(0,1fr)] gap-8">
            {/* Left: Dataset Info */}
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Dataset Info
              </h3>

              <Card className="p-4">
                <div className="text-xs text-muted-foreground mb-1">
                  Total Images
                </div>
                <div className="text-3xl font-bold text-accent">
                  {dataset.images.length}
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-xs text-muted-foreground mb-1">
                  Total Annotations
                </div>
                <div className="text-3xl font-bold text-accent">
                  {totalAnnotations}
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-xs text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-lg font-semibold">
                  {formatDate(dataset.createdAt)}
                </div>
              </Card>
            </div>

            {/* Right: Images */}
            <div className="lg:col-span-1">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Images ({dataset.images.length})
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {dataset.images.map((image) => (
                  <div
                    key={image.id}
                    className="group cursor-pointer rounded-lg border bg-card hover:border-accent transition overflow-hidden"
                  >
                    <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                      <AssetImage
                        assetId={image.id}          // 🔥 assetId가 따로 있으면 image.assetId로 변경
                        alt={image.filename}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{image.filename}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {image.annotations.length} annotations
                      </p>
                      {image.annotations.slice(0, 2).map((ann) => (
                        <p
                          key={ann.id}
                          className="text-[11px] text-muted-foreground truncate"
                        >
                          • {ann.label} ({ann.xCenter.toFixed(2)}, {ann.yCenter.toFixed(2)})
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

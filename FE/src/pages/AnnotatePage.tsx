import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type ChangeEvent,
} from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AssetImage } from "@/components/asset-image"
import { ChevronLeft, Download, Trash2, Wand2, Zap } from "lucide-react"
import { SelfAnnotationModal } from "@/components/self-annotation-modal"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

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

/** SelfAnnotationModal이 사용하는 단일 어노테이션 타입 */
interface Annotation {
  id: string
  xCenter: number
  yCenter: number
  width: number
  height: number
  label: string
}

/** 백엔드 Save 요청에 사용하는 이미지별 어노테이션 묶음 */
interface ImageAnnotations {
  imageId: string
  annotations: Annotation[]
}

export default function AnnotatePage() {
  const [searchParams] = useSearchParams()
  const [dataset, setDataset] = useState<DatasetDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  // Self-Annotation 에서 모아놓은 "아직 서버에 안 보낸" 어노테이션
  const [pendingAnnotations, setPendingAnnotations] = useState<ImageAnnotations[] | null>(null)

  // Save As 다이얼로그
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false)
  const [saveAsVersionTag, setSaveAsVersionTag] = useState("")

  // 이미지 추가용 file input
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Self-Annotation 모달 열림 상태
  const [isSelfAnnotationOpen, setIsSelfAnnotationOpen] = useState(false)

  const datasetId = searchParams.get("datasetId")
  const version = searchParams.get("version") // URL 쿼리로 넘어온 현재 버전 태그 (v0, v1 ...)

  // ✅ Self-Annotation 모달에 넘겨줄 이미지 목록
  const selfAnnotationImages = useMemo(
    () =>
      dataset?.images.map((img) => ({
        id: img.id,
        preview: `http://localhost:8080/api/datasets/assets/${img.id}/image`,
      })) ?? [],
    [dataset],
  )

  // ✅ 초기 어노테이션 구조 (이미 DB에 저장된 것들)
  const initialAnnotations = useMemo(() => {
    if (!dataset) return {}

    const result: Record<string, Annotation[]> = {}

    dataset.images.forEach((img) => {
      const mapped: Annotation[] = (img.annotations || []).map((ann) => ({
        id:
          String(ann.id ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
        xCenter: ann.xCenter,
        yCenter: ann.yCenter,
        width: ann.width,
        height: ann.height,
        label: ann.label,
      }))

      result[String(img.id)] = mapped
    })

    return result
  }, [dataset])

  /** ✅ 이미지 추가 핸들러 */
  const handleAddImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    if (!dataset) {
      alert("데이터셋 정보가 없습니다.")
      return
    }
    if (!version) {
      alert("현재 버전 정보가 없습니다. URL을 확인해주세요.")
      return
    }

    const files = Array.from(fileList)
    const formData = new FormData()
    files.forEach((file) => {
      formData.append("images", file)
    })

    const token = localStorage.getItem("accessToken")

    const res = await fetch(
      `http://localhost:8080/api/datasets/assets/${dataset.id}/${encodeURIComponent(
        version,
      )}`,
      {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // ⚠️ FormData 사용할 때는 Content-Type 직접 지정 금지
        },
        body: formData,
      },
    )

    if (!res.ok) {
      const msg = await res.text()
      alert(msg || "이미지 업로드 실패")
      return
    }
    e.target.value = ""
    navigate(0)
  }

  /** ✅ 현재 버전으로 Save */
  const handleSaveCurrentVersion = () => {
    if (!dataset) return
    const versionTag = version ?? dataset.version ?? "v0"
    sendAnnotationsToServer(versionTag)
  }

  /** ✅ Save As 다이얼로그 열기 */
  const handleOpenSaveAs = () => {
    if (!dataset) return
    setSaveAsVersionTag(version ?? dataset.version ?? "") // 기본값으로 현재 버전
    setIsSaveAsOpen(true)
  }

  /** ✅ Save As 확정 */
  const handleConfirmSaveAs = () => {
    if (!saveAsVersionTag.trim()) {
      alert("버전 태그를 입력해주세요.")
      return
    }
    sendAnnotationsToServer(saveAsVersionTag.trim())
    setIsSaveAsOpen(false)
  }

  /** ✅ 어노테이션을 백엔드로 저장 */
  const sendAnnotationsToServer = async (versionTag: string) => {
    if (!dataset) {
      alert("데이터셋 정보가 없습니다.")
      return
    }
    if (!pendingAnnotations || pendingAnnotations.length === 0) {
      alert("저장할 어노테이션이 없습니다. 먼저 Self-Annotation을 진행해주세요.")
      return
    }

    try {
      const token = localStorage.getItem("accessToken")

      const body = {
        datasetId: dataset.id,
        versionTag,
        annotations: pendingAnnotations,
      }

      const res = await fetch(`http://localhost:8080/api/datasets/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || `어노테이션 저장 실패 (${res.status})`)
      }

      alert(`어노테이션이 버전 ${versionTag}로 저장되었습니다.`)

      setPendingAnnotations(null)

      // 🔥 저장 완료 후 현재 페이지 리로드 (버전/데이터 갱신)
      navigate(0)
    } catch (err) {
      console.error("Failed to save annotations:", err)
      alert(
        err instanceof Error
          ? err.message
          : "어노테이션 저장 중 오류가 발생했습니다.",
      )
    }
  }

  /** ✅ 데이터셋 삭제 */
  const handleDeleteDataset = async () => {
    if (!dataset) return

    const ok = window.confirm(
      `데이터셋 "${dataset.name}"(ID: ${dataset.id}) 을(를) 정말 삭제하시겠습니까?`,
    )
    if (!ok) return

    try {
      const token = localStorage.getItem("accessToken")

      const res = await fetch(
        `http://localhost:8080/api/datasets/${dataset.id}`,
        {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      )

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(
          msg || `데이터셋 삭제에 실패했습니다. (status: ${res.status})`,
        )
      }

      alert("데이터셋이 성공적으로 삭제되었습니다.")
      navigate("/datasets")
    } catch (err) {
      console.error("Failed to delete dataset", err)
      alert(
        err instanceof Error
          ? err.message
          : "데이터셋 삭제 중 알 수 없는 오류가 발생했습니다.",
      )
    }
  }

  /** ✅ 상세 정보 불러오기 */
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

        const headers: HeadersInit = {
          Accept: "application/json",  // 👈 JSON 요청 명시
        }

        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }

        const res = await fetch(
          `http://localhost:8080/api/datasets/detail?${query.toString()}`,
          {
            method: "GET",
            headers,
            signal: controller.signal,
          },
        )

        if (res.status === 401) {
          throw new Error("로그인이 필요합니다. 다시 로그인 해주세요.")
        }

        if (!res.ok) {
          const text = await res.text()
          console.error("서버 에러 응답:", text)
          throw new Error(`서버 오류 (${res.status})`)
        }

        // 👇 여기서 JSON인지 한 번 더 검사 (login HTML 같은 것 방지)
        const contentType = res.headers.get("content-type") ?? ""
        if (!contentType.includes("application/json")) {
          const text = await res.text()
          console.error("JSON 이 아닌 응답:", text.slice(0, 200))
          throw new Error("서버에서 JSON이 아닌 응답을 받았습니다. (아마 로그인/에러 페이지일 가능성)")
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
                <Button
                  className="gap-2 bg-accent hover:bg-accent/90"
                  onClick={() => setIsSelfAnnotationOpen(true)}
                >
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
              <Button
                variant="outline"
                className="gap-2 bg-transparent"
                onClick={handleSaveCurrentVersion}
                disabled={!pendingAnnotations}
              >
                Save
              </Button>

              <Button
                variant="outline"
                className="gap-2 bg-transparent"
                onClick={handleOpenSaveAs}
                disabled={!pendingAnnotations}
              >
                Save As
              </Button>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive bg-transparent"
                onClick={handleDeleteDataset}
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

              {/* 이미지 추가 버튼 */}
              <div>
                <Button
                  variant="outline"
                  className="gap-2 bg-transparent"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  이미지 추가
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAddImages}
                />
              </div>
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
                        assetId={image.id}
                        alt={image.filename}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="p-2">
                      <p className="text-xs font-medium truncate">
                        {image.filename}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {image.annotations.length} annotations
                      </p>
                      {image.annotations.slice(0, 2).map((ann) => (
                        <p
                          key={ann.id}
                          className="text-[11px] text-muted-foreground truncate"
                        >
                          • {ann.label} ({ann.xCenter.toFixed(2)},{" "}
                          {ann.yCenter.toFixed(2)})
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

      {/* Save As 다이얼로그 */}
      <Dialog open={isSaveAsOpen} onOpenChange={setIsSaveAsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save As New Version</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 mt-2">
            <p className="text-sm text-muted-foreground">
              새로 저장할 버전 태그를 입력하세요. 예: <code>v1</code>,{" "}
              <code>v0.1</code>
            </p>
            <Input
              value={saveAsVersionTag}
              onChange={(e) => setSaveAsVersionTag(e.target.value)}
              placeholder="예: v1"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsSaveAsOpen(false)}>
              취소
            </Button>
            <Button onClick={handleConfirmSaveAs}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Self-Annotation Modal */}
      {isSelfAnnotationOpen && selfAnnotationImages.length > 0 && (
        <SelfAnnotationModal
          images={selfAnnotationImages}
          initialAnnotations={initialAnnotations}
          onClose={() => setIsSelfAnnotationOpen(false)}
          onSave={(annotationsByImage) => {
            // ✔ 여기서는 서버 호출하지 않고 pendingAnnotations에만 저장
            setPendingAnnotations(annotationsByImage)
            setIsSelfAnnotationOpen(false)
          }}
        />
      )}
    </div>
  )
}

import { Link, useParams } from "react-router-dom"
import { useEffect, useMemo, useRef, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Download, Trash2, Wand2, Zap, Loader2, AlertCircle, Plus, Pencil, CheckCircle2, Lock, GitBranch } from "lucide-react"
import { SelfAnnotationModal, type ModalAnnotation } from "@/components/self-annotation-modal"

type Annotation = {
  id: number
  label: string
  xCenter: number
  yCenter: number
  width: number
  height: number
}

type ImageItem = {
  id: number
  filename: string
  imageUrl: string
  annotations: Annotation[]
}

type DatasetDetail = {
  id: number
  name: string
  version: string
  versionStatus: string   // "DRAFT" | "FINALIZED"
  createdAt: string
  description: string
  images: ImageItem[]
}

type DatasetVersion = {
  id: number
  versionTag: string
  status: string
}

type DatasetSummary = {
  id: number
  name: string
  versions: DatasetVersion[]
}

export default function AnnotatePage() {
  const { versionId } = useParams<{ versionId: string }>()

  const [dataset, setDataset] = useState<DatasetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // null = 모달 닫힘 / 숫자 = 모달 열릴 때 시작할 이미지 인덱스
  const [selfAnnotationStartIndex, setSelfAnnotationStartIndex] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false)
  const [finalizeTag, setFinalizeTag] = useState("")
  const [finalizing, setFinalizing] = useState(false)
  const [branching, setBranching] = useState(false)
  const [showBranchDialog, setShowBranchDialog] = useState(false)
  const [branchSourceVersionId, setBranchSourceVersionId] = useState<string>("")
  const [branchWithAnnotations, setBranchWithAnnotations] = useState(true)
  const [allVersions, setAllVersions] = useState<DatasetVersion[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const run = async () => {
      if (!versionId) {
        setError("versionId가 없습니다.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const token = localStorage.getItem("accessToken")

        const allRes = await fetch("http://localhost:8080/api/datasets/all", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!allRes.ok) throw new Error("데이터셋 목록 조회 실패")

        const allData = (await allRes.json()) as DatasetSummary[]

        const targetVersionId = Number(versionId)
        let targetDatasetId: number | null = null
        let targetVersionTag: string | null = null

        for (const ds of allData) {
          const found = ds.versions?.find((v) => v.id === targetVersionId)
          if (found) {
            targetDatasetId = ds.id
            targetVersionTag = found.versionTag
            // 같은 데이터셋의 모든 버전 저장
            setAllVersions(ds.versions || [])
            break
          }
        }

        if (!targetDatasetId || !targetVersionTag) {
          throw new Error("해당 versionId에 맞는 데이터셋을 찾을 수 없습니다.")
        }

        const detailUrl = `http://localhost:8080/api/datasets/detail?datasetId=${targetDatasetId}&version=${encodeURIComponent(targetVersionTag)}`
        const detailRes = await fetch(detailUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!detailRes.ok) {
          const text = await detailRes.text().catch(() => "")
          throw new Error(text || "데이터셋 상세 조회 실패")
        }

        const detail = (await detailRes.json()) as DatasetDetail
        setDataset(detail)
      } catch (e) {
        setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.")
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [versionId])

  const totalAnnotations = useMemo(
    () => (dataset ? dataset.images.reduce((sum, img) => sum + (img.annotations?.length || 0), 0) : 0),
    [dataset],
  )

  const handleSaveSelfAnnotations = async (saved: Array<{ imageId: number; annotations: ModalAnnotation[] }>) => {
    if (!dataset || !versionId) return

    try {
      const token = localStorage.getItem("accessToken")

      // 1) DB 저장
      const body = saved.map((s) => ({
        imageId: s.imageId,
        annotations: s.annotations.map((a) => ({
          label: a.label,
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
        })),
      }))

      const res = await fetch(`http://localhost:8080/api/datasets/versions/${versionId}/annotations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || "어노테이션 저장 실패")
      }

      // 2) 로컬 상태 업데이트
      const nextImages = dataset.images.map((img) => {
        const found = saved.find((s) => s.imageId === img.id)
        if (!found) return img
        return {
          ...img,
          annotations: found.annotations.map((a, idx) => ({
            id: idx + 1,
            label: a.label,
            xCenter: a.x,
            yCenter: a.y,
            width: a.width,
            height: a.height,
          })),
        }
      })

      setDataset({ ...dataset, images: nextImages })
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.")
    } finally {
      setSelfAnnotationStartIndex(null)
    }
  }

  // 버전 확정
  const handleFinalize = async () => {
    if (!finalizeTag.trim() || !versionId) return
    setFinalizing(true)
    try {
      const token = localStorage.getItem("accessToken")
      const res = await fetch(`http://localhost:8080/api/datasets/versions/${versionId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ versionTag: finalizeTag.trim() }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || "버전 확정 실패")
      }
      const result = await res.json()
      setDataset((prev) => prev ? { ...prev, version: result.versionTag, versionStatus: result.status } : prev)
      setShowFinalizeDialog(false)
      setFinalizeTag("")
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류가 발생했습니다.")
    } finally {
      setFinalizing(false)
    }
  }

  // 새 버전 분기 (선택한 버전 기반으로 새 DRAFT 버전 생성)
  const handleBranch = async () => {
    if (!branchSourceVersionId) return
    setBranching(true)
    try {
      const token = localStorage.getItem("accessToken")
      const res = await fetch(
        `http://localhost:8080/api/datasets/versions/${branchSourceVersionId}/branch?withAnnotations=${branchWithAnnotations}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error("새 버전 생성 실패")
      const result = await res.json()
      window.location.href = `/annotate/${result.versionId}`
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류가 발생했습니다.")
    } finally {
      setBranching(false)
    }
  }

  // 버전 삭제
  const handleDeleteVersion = async () => {
    if (!versionId || !dataset) return
    const confirmed = confirm(
      `버전 "${dataset.version}"을 삭제할까요?\n이미지와 어노테이션이 모두 삭제되며 복구할 수 없습니다.`
    )
    if (!confirmed) return
    try {
      const token = localStorage.getItem("accessToken")
      const res = await fetch(`http://localhost:8080/api/datasets/versions/${versionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("버전 삭제 실패")
      window.location.href = "/datasets"
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.")
    }
  }

  // 이미지 삭제
  const handleDeleteImage = async (assetId: number) => {
    if (!dataset) return
    if (!confirm("이미지를 삭제할까요? 어노테이션도 함께 삭제됩니다.")) return
    try {
      const token = localStorage.getItem("accessToken")
      const res = await fetch(`http://localhost:8080/api/datasets/assets/${assetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("이미지 삭제 실패")
      setDataset({ ...dataset, images: dataset.images.filter((img) => img.id !== assetId) })
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.")
    }
  }

  // 이미지 추가
  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !dataset || !versionId) return
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    try {
      const token = localStorage.getItem("accessToken")
      const formData = new FormData()
      formData.append("datasetName", dataset.name)
      formData.append("version", dataset.version)
      files.forEach((f) => formData.append("files", f))

      const res = await fetch("http://localhost:8080/api/datasets/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || "이미지 업로드 실패")
      }

      // 업로드 후 데이터셋 다시 로드
      const allRes = await fetch("http://localhost:8080/api/datasets/all", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const allData = (await allRes.json()) as DatasetSummary[]
      const targetVersionId = Number(versionId)
      let targetDatasetId: number | null = null
      let targetVersionTag: string | null = null
      for (const ds of allData) {
        const found = ds.versions?.find((v) => v.id === targetVersionId)
        if (found) { targetDatasetId = ds.id; targetVersionTag = found.versionTag; break }
      }
      if (targetDatasetId && targetVersionTag) {
        const detailUrl = `http://localhost:8080/api/datasets/detail?datasetId=${targetDatasetId}&version=${encodeURIComponent(targetVersionTag)}`
        const detailRes = await fetch(detailUrl, { headers: { Authorization: `Bearer ${token}` } })
        if (detailRes.ok) setDataset(await detailRes.json())
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          불러오는 중...
        </main>
      </div>
    )
  }

  if (error || !dataset) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="p-6 border-destructive/30 bg-destructive/5 text-destructive">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <AlertCircle className="w-5 h-5" />
              데이터셋 로드 실패
            </div>
            <p className="text-sm">{error ?? "알 수 없는 오류"}</p>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* 숨겨진 파일 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAddImages}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link to="/datasets" className="inline-flex items-center gap-2 text-accent hover:text-accent/80 mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Datasets
          </Link>

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{dataset.name}</h1>
              <p className="text-muted-foreground mb-4">{dataset.description || "설명이 없습니다."}</p>

              <div className="flex gap-3 flex-wrap">
                <Button
                  className="gap-2 bg-accent hover:bg-accent/90"
                  onClick={() => setSelfAnnotationStartIndex(0)}
                  disabled={dataset.versionStatus === "FINALIZED"}
                >
                  <Wand2 className="w-4 h-4" />
                  Self-Annotation
                </Button>
                <Button variant="outline" className="gap-2 bg-transparent" disabled={dataset.versionStatus === "FINALIZED"}>
                  <Zap className="w-4 h-4" />
                  Auto-Annotation
                </Button>
                {dataset.versionStatus === "DRAFT" ? (
                  <Button
                    variant="outline"
                    className="gap-2 border-green-500 text-green-400 hover:bg-green-600 hover:text-white hover:border-green-600"
                    onClick={() => { setFinalizeTag(""); setShowFinalizeDialog(true) }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    버전 확정
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm text-green-400 font-semibold">
                      <Lock className="w-4 h-4" />
                      확정됨: {dataset.version}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-accent/50 text-accent hover:bg-accent hover:text-white hover:border-accent"
                      onClick={() => { setBranchSourceVersionId(String(versionId)); setShowBranchDialog(true) }}
                      disabled={branching}
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      새 버전으로 편집
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2 bg-transparent"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || dataset.versionStatus === "FINALIZED"}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {uploading ? "업로드 중..." : "이미지 추가"}
              </Button>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button variant="outline" className="gap-2 text-destructive hover:bg-destructive hover:text-white bg-transparent" onClick={handleDeleteVersion}>
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dataset Info</h3>

            <Card className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Version</div>
              <div className="text-2xl font-bold text-accent">{dataset.version}</div>
              <div className={`text-xs mt-1 font-semibold ${dataset.versionStatus === "FINALIZED" ? "text-green-400" : "text-yellow-400"}`}>
                {dataset.versionStatus === "FINALIZED" ? "✅ 확정됨" : "🟡 초안 (DRAFT)"}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Images</div>
              <div className="text-3xl font-bold text-accent">{dataset.images.length}</div>
            </Card>

            <Card className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Annotations</div>
              <div className="text-3xl font-bold text-accent">{totalAnnotations}</div>
            </Card>

            <Card className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Created</div>
              <div className="text-sm font-semibold">{new Date(dataset.createdAt).toLocaleString()}</div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Images ({dataset.images.length})
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {dataset.images.map((image, idx) => (
                <div
                  key={image.id}
                  className="group cursor-pointer"
                  onClick={() => setSelfAnnotationStartIndex(idx)}
                >
                  <div className="relative rounded-lg overflow-hidden bg-card border border-border group-hover:border-accent/50 transition">
                    <div className="aspect-square">
                      <img
                        src={`http://localhost:8080${image.imageUrl}`}
                        alt={image.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    </div>

                    {/* 호버 시 어노테이션 버튼 오버레이 */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <div className="bg-accent text-background text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <Pencil className="w-3 h-3" />
                        Annotate
                      </div>
                      {dataset.versionStatus !== "FINALIZED" && (
                        <button
                          className="bg-destructive text-white text-xs font-semibold p-1.5 rounded-full hover:bg-destructive/80 transition"
                          onClick={(e) => { e.stopPropagation(); handleDeleteImage(image.id) }}
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {image.annotations.length > 0 && (
                      <div className="absolute top-2 right-2 bg-accent/90 text-background text-xs font-semibold px-2 py-1 rounded">
                        {image.annotations.length}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 truncate group-hover:text-foreground transition">
                    {image.filename}
                  </p>
                </div>
              ))}

              {/* 이미지 추가 버튼 (그리드 마지막) */}
              <div
                className="group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="relative rounded-lg overflow-hidden bg-card border-2 border-dashed border-border group-hover:border-accent/50 transition aspect-square flex items-center justify-center">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-accent transition">
                      <Plus className="w-8 h-8" />
                      <span className="text-xs font-semibold">이미지 추가</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {selfAnnotationStartIndex !== null && (
        <SelfAnnotationModal
          initialIndex={selfAnnotationStartIndex}
          images={dataset.images.map((img) => ({
            id: img.id,
            preview: `http://localhost:8080${img.imageUrl}`,
            filename: img.filename,
            annotations: img.annotations.map((a) => ({
              id: String(a.id),
              x: a.xCenter,
              y: a.yCenter,
              width: a.width,
              height: a.height,
              label: a.label,
            })),
          }))}
          onClose={() => setSelfAnnotationStartIndex(null)}
          onSave={handleSaveSelfAnnotations}
        />
      )}

      {/* 새 버전 분기 다이얼로그 */}
      {showBranchDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-accent" />
                새 버전으로 편집
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                기반으로 삼을 버전을 선택하세요. 해당 버전의 이미지가 복사된 새 DRAFT 버전이 생성됩니다.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">버전 선택</label>
              <select
                className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={branchSourceVersionId}
                onChange={(e) => setBranchSourceVersionId(e.target.value)}
              >
                {allVersions.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.versionTag} {v.status === "FINALIZED" ? "✅ 확정됨" : "🟡 초안"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">어노테이션 처리</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border p-3 hover:border-accent/50 transition has-[:checked]:border-accent has-[:checked]:bg-accent/5">
                  <input
                    type="radio"
                    name="branchAnnotations"
                    checked={branchWithAnnotations}
                    onChange={() => setBranchWithAnnotations(true)}
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <div className="text-sm font-medium">어노테이션 포함</div>
                    <div className="text-xs text-muted-foreground mt-0.5">기존 라벨을 그대로 복사합니다</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border p-3 hover:border-accent/50 transition has-[:checked]:border-accent has-[:checked]:bg-accent/5">
                  <input
                    type="radio"
                    name="branchAnnotations"
                    checked={!branchWithAnnotations}
                    onChange={() => setBranchWithAnnotations(false)}
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <div className="text-sm font-medium">이미지만</div>
                    <div className="text-xs text-muted-foreground mt-0.5">어노테이션 없이 이미지만 복사합니다</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 hover:bg-muted hover:text-foreground"
                onClick={() => setShowBranchDialog(false)}
                disabled={branching}
              >
                취소
              </Button>
              <Button
                className="flex-1 bg-accent hover:bg-accent/80 text-white"
                onClick={async () => { setShowBranchDialog(false); await handleBranch() }}
                disabled={!branchSourceVersionId || branching}
              >
                {branching ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />생성 중...</> : "새 버전 생성"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 버전 확정 다이얼로그 */}
      {showFinalizeDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                버전 확정
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                확정된 버전은 수정이 불가능하며, 모델 학습에 사용할 수 있습니다.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">버전 태그 입력</label>
              <Input
                value={finalizeTag}
                onChange={(e) => setFinalizeTag(e.target.value)}
                placeholder="예: v1.0, v2.0-stable"
                onKeyDown={(e) => { if (e.key === "Enter") handleFinalize() }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">현재 임시 버전: <span className="text-accent">{dataset.version}</span></p>
            </div>

            <div className="bg-yellow-950/30 border border-yellow-700/50 rounded-lg p-3 text-xs text-yellow-300">
              ⚠️ 확정 후에는 이미지 추가, 어노테이션 수정이 불가능합니다.
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => { setShowFinalizeDialog(false); setFinalizeTag("") }}
                disabled={finalizing}
              >
                취소
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleFinalize}
                disabled={!finalizeTag.trim() || finalizing}
              >
                {finalizing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />확정 중...</> : "확정하기"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Database,
  Plus,
  AlertCircle,
  Upload,
  ImageIcon,
  Loader2,
  Trash2,
} from "lucide-react"
// 어노테이션 단계로 연결할 때 사용할 수 있음 (지금은 사용 X)
import { AnnotationModal } from "@/components/annotation-modal"

interface UploadedImage {
  id: string
  file: File
  preview: string
  size: number
  uploadedAt: Date
}

interface DatasetVersion {
  id: number
  versionTag: string
  createdAt: string
  assetsCount: number
}

interface DatasetSummary {
  id: number
  name: string
  versions: DatasetVersion[]
}

export default function DatasetsPage() {
  // --- 전체 데이터셋 리스트 상태 ---
  const [datasets, setDatasets] = useState<DatasetSummary[]>([])
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false)
  const [datasetsError, setDatasetsError] = useState<string | null>(null)

  // --- 새 데이터셋 생성 상태 ---
  const [datasetName, setDatasetName] = useState("")
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({})
  const [datasetDescription, setDatasetDescription] = useState("")
  const [images, setImages] = useState<UploadedImage[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()

  // -----------------------------
  // 1. 전체 데이터셋 목록 불러오기
  // -----------------------------
  const fetchDatasets = async () => {
    setIsLoadingDatasets(true)
    setDatasetsError(null)
    const token = localStorage.getItem("accessToken")
    try {
      // TODO: 실제 API에 맞게 URL/파라미터 수정
      const res = await fetch("http://localhost:8080/api/datasets/all", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || "데이터셋 목록을 불러오는 데 실패했습니다.")
      }
      const data = (await res.json()) as DatasetSummary[]
      setDatasets(data)
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "데이터셋 목록을 불러오는 중 오류가 발생했습니다."
      setDatasetsError(msg)
    } finally {
      setIsLoadingDatasets(false)
    }
  }

  useEffect(() => {
    fetchDatasets()
  }, [])

  const handleVersionChange = (datasetId: number, versionTag: string) => {
    setSelectedVersions((prev) => ({
      ...prev,
      [String(datasetId)]: versionTag,
    }))
  }

  // -----------------------------
  // 2. 파일 선택/관리
  // -----------------------------
  const handleOpenFileDialog = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const imageFiles = files.filter((f) => f.type.startsWith("image/"))
    if (!imageFiles.length) {
      setCreateError("이미지 파일만 업로드할 수 있습니다.")
      return
    }

    setCreateError(null)
    setSuccessMessage(null)

    const newImages: UploadedImage[] = imageFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      file,
      preview: URL.createObjectURL(file),
      size: file.size,
      uploadedAt: new Date(),
    }))

    setImages((prev) => [...prev, ...newImages])
  }

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  const totalSizeMB =
    images.reduce((sum, img) => sum + img.size, 0) / (1024 * 1024)

  // -----------------------------
  // 3. 데이터셋 생성 (이름 + 이미지 업로드 → 서버 전송)
  // -----------------------------
  const handleCreateDataset = async () => {
    if (!datasetName.trim()) {
      setCreateError("데이터셋 이름을 입력해주세요.")
      return
    }
    if (images.length === 0) {
      setCreateError("최소 한 장 이상의 이미지를 업로드해야 합니다.")
      return
    }
  
    setCreateError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)
  
    try {
      const formData = new FormData()
      const token = localStorage.getItem("accessToken")
  
      formData.append("name", datasetName.trim())
      formData.append("description", datasetDescription.trim())
      images.forEach((img) => {
        formData.append("images", img.file)
      })
  
      const response = await fetch("http://localhost:8080/api/datasets/new", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
  
      const raw = await response.text()
      if (!response.ok) {
        throw new Error(raw || "데이터셋 생성에 실패했습니다.")
      }
  
      // ✅ JSON 파싱
      const data = JSON.parse(raw) as {
        datasetId?: string | number
        id?: string | number
        version?: string
        versionTag?: string
        versionName?: string
        versionId?: string | number
      }
  
      // ✅ 실제 백엔드 응답 필드명에 맞게 이 부분만 정확히 맞춰주면 됨
      // 예시: { datasetId: 1, versionId: 10, version: "1.0" } 를 기대
      const datasetId =
        data.datasetId ?? data.id // <- 실제 필드명에 맞게 수정
      const version =
        data.version ?? data.versionTag ?? data.versionName ?? "1.0"
      const versionId =
        data.versionId ?? data.id // <- 라우트 파라미터로 쓸 version PK
  
      setSuccessMessage("데이터셋이 성공적으로 생성되었습니다.")
  
      if (!datasetId || !versionId) {
        console.warn(
          "⚠ datasetId 또는 versionId가 응답에 없습니다. annotation 페이지로 이동할 수 없습니다.",
          data,
        )
      } else {
        // ✅ AnnotatePage로 이동 (path 파라미터 + query string)
        //   - path:   /annotate/:versionId
        //   - query:  ?datasetId=...&version=...
        navigate(
          `/annotate/${versionId}?datasetId=${datasetId}&version=${encodeURIComponent(
            String(version),
          )}`,
        )
      }
  
      // 폼 초기화
      setDatasetName("")
      setImages([])
  
      // 리스트 다시 불러오기
      fetchDatasets()
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "데이터셋 생성 중 오류가 발생했습니다."
      setCreateError(message)
    } finally {
      setIsSubmitting(false)
    }
  }
  

  // -----------------------------
  // 4. 렌더링
  // -----------------------------
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="w-6 h-6" />
              Datasets
            </h1>
            <p className="text-muted-foreground mt-1">
              생성된 데이터셋을 확인하고, 새로운 데이터셋을 생성할 수 있습니다.
            </p>
          </div>
          {/* 필요하면 상단에 New Dataset 버튼을 둬서 오른쪽 카드로 스크롤/포커싱해도 됨 */}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* 왼쪽: 전체 데이터셋 리스트 */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">All Datasets</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={fetchDatasets}
                  disabled={isLoadingDatasets}
                >
                  {isLoadingDatasets && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  <span>Refresh</span>
                </Button>
              </div>

              {datasetsError && (
                <div className="flex items-center gap-2 text-sm text-destructive mb-3">
                  <AlertCircle className="w-4 h-4" />
                  <span>{datasetsError}</span>
                </div>
              )}

              {isLoadingDatasets ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Loading datasets…
                </div>
              ) : datasets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
                  <Database className="w-10 h-10 mb-3 opacity-70" />
                  아직 생성된 데이터셋이 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-xs text-muted-foreground">
                        <th className="text-left py-2 pr-2">Name</th>
                        <th className="text-left py-2 pr-2">Assets</th>
                        <th className="text-left py-2 pr-2">Version</th>
                        <th className="text-left py-2">Created</th>
                        <th className="text-left py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {datasets.map((ds) => {
                        const latestVersion = ds.versions?.[0] ?? null
                        const selectedVersionTag =
                          selectedVersions[String(ds.id)] ?? latestVersion?.versionTag

                        const selectedVersion =
                          ds.versions.find((v) => v.versionTag === selectedVersionTag) ?? latestVersion

                        return (
                          <tr key={ds.id} className="border-b last:border-b-0">
                            {/* Dataset Name */}
                            <td className="py-2 pr-2 font-medium">{ds.name}</td>

                            {/* Image Count */}
                            <td className="py-2 pr-2">
                              {selectedVersion ? selectedVersion.assetsCount : 0}
                            </td>

                            {/* Version 선택 셀렉트 */}
                            <td className="py-2 pr-2">
                              <select
                                className="border rounded px-2 py-1 text-xs"
                                value={selectedVersionTag}
                                onChange={(e) => handleVersionChange(ds.id, e.target.value)}
                              >
                                {ds.versions.map((v) => (
                                  <option key={v.id} value={v.versionTag}>
                                    {v.versionTag}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* CreatedAt */}
                            <td className="py-2 text-xs text-muted-foreground">
                              {selectedVersion
                                ? new Date(selectedVersion.createdAt).toLocaleString()
                                : "-"}
                            </td>

                            {/* Details 버튼 */}
                            <td className="py-2 pr-2">
                              <button
                                className="text-xs underline text-accent"
                                onClick={() => {
                                  if (!selectedVersion) {
                                    alert("선택된 버전 정보가 없습니다.")
                                    return
                                  }
                                  navigate(
                                    `/annotate/${selectedVersion.id}?datasetId=${ds.id}&version=${encodeURIComponent(
                                      selectedVersion.versionTag,
                                    )}`,
                                  )
                                }}
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        )
                      })}

                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* 오른쪽: 새 데이터셋 생성 카드 */}
          <div className="space-y-4">
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create New Dataset
                </h2>
              </div>

              {/* 데이터셋 이름 */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Dataset Name</label>
                <Input
                  placeholder="예: dog"
                  value={datasetName}
                  onChange={(e) => {
                    setDatasetName(e.target.value)
                    setSuccessMessage(null)
                  }}
                  className="h-8 text-sm"
                />
              </div>
              {/* 데이터셋 설명 */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Dataset Description</label>
                <Input
                  placeholder="예: this is dog dataset"
                  value={datasetDescription}
                  onChange={(e) => {
                    setDatasetDescription(e.target.value)
                    setSuccessMessage(null)
                  }}
                  className="h-8 text-sm"
                />
              </div>

              {/* 이미지 업로드 */}
              <div className="space-y-2">
                <label className="text-xs font-medium flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" />
                  Images
                </label>

                <div
                  className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/60 transition"
                  onClick={handleOpenFileDialog}
                >
                  <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                  <p className="text-xs font-medium">Click to select images</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    PNG, JPG 등 이미지 파일을 여러 개 선택할 수 있습니다.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* 업로드된 이미지 미리보기 */}
                {images.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">
                        Uploaded Images{" "}
                        <span className="text-muted-foreground">
                          ({images.length})
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Total: {totalSizeMB.toFixed(2)} MB
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={img.preview}
                            alt={img.file.name}
                            className="w-full h-16 object-cover rounded border"
                          />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                            onClick={() => handleRemoveImage(img.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 에러 / 성공 메시지 */}
              {createError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {createError}
                </p>
              )}
              {successMessage && (
                <p className="text-xs text-emerald-500">{successMessage}</p>
              )}

              {/* 생성 버튼 */}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleCreateDataset}
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  <span>Create Dataset</span>
                </Button>
              </div>
            </Card>

            {/* 추후: 여기 오른쪽에 Auto/Self Annotation 가이드 같은 정보 카드도 추가 가능 */}
          </div>
        </div>
      </main>
    </div>
  )
}

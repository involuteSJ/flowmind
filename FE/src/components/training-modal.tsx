"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, ChevronDown, ChevronUp } from "lucide-react"

interface TrainingModalProps {
  isOpen: boolean
  onClose: () => void
  onStartTraining: (config: TrainingConfig) => void
}

export interface TrainingConfig {
  datasetVersionId: number
  datasetLabel: string
  modelType: string
  modelSize: string
  epochs: number
  batchSize: number
  learningRate: number
  optimizer: string
}

interface FinalizedVersion {
  versionId: number
  datasetName: string
  versionTag: string
  imageCount: number
}

export function TrainingModal({ isOpen, onClose, onStartTraining }: TrainingModalProps) {
  const [versions, setVersions] = useState<FinalizedVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)

  const [config, setConfig] = useState<TrainingConfig>({
    datasetVersionId: 0,
    datasetLabel: "",
    modelType: "yolov8",
    modelSize: "n",
    epochs: 50,
    batchSize: 32,
    learningRate: 0.001,
    optimizer: "adam",
  })

  // FINALIZED 버전 목록 로드
  useEffect(() => {
    if (!isOpen) return
    const load = async () => {
      setLoadingVersions(true)
      try {
        const token = localStorage.getItem("accessToken")
        const res = await fetch("http://localhost:8080/api/datasets/all", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error("목록 조회 실패")
        const data = await res.json()

        const finalized: FinalizedVersion[] = []
        for (const ds of data) {
          for (const v of ds.versions ?? []) {
            if (v.status === "FINALIZED") {
              finalized.push({
                versionId: v.id,
                datasetName: ds.name,
                versionTag: v.versionTag,
                imageCount: v.assetsCount ?? 0,
              })
            }
          }
        }
        setVersions(finalized)

        if (finalized.length > 0) {
          setConfig((prev) => ({
            ...prev,
            datasetVersionId: finalized[0].versionId,
            datasetLabel: `${finalized[0].datasetName} — ${finalized[0].versionTag}`,
          }))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingVersions(false)
      }
    }
    load()
  }, [isOpen])

  const handleChange = <K extends keyof TrainingConfig>(field: K, value: TrainingConfig[K]) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  const handleVersionChange = (versionId: number) => {
    const v = versions.find((v) => v.versionId === versionId)
    setConfig((prev) => ({
      ...prev,
      datasetVersionId: versionId,
      datasetLabel: v ? `${v.datasetName} — ${v.versionTag}` : "",
    }))
  }

  const selectedVersion = versions.find((v) => v.versionId === config.datasetVersionId)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold">Configure Training</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Section 1: Dataset & Model */}
          <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-blue-100">Dataset & Model Selection</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 데이터셋 버전 선택 */}
              <div>
                <label className="text-sm font-semibold block mb-2">데이터셋 버전 <span className="text-blue-400">(확정된 버전만 표시)</span></label>
                {loadingVersions ? (
                  <div className="text-sm text-muted-foreground px-4 py-3 border border-border rounded-lg">불러오는 중...</div>
                ) : versions.length === 0 ? (
                  <div className="text-sm text-destructive px-4 py-3 border border-destructive/40 rounded-lg bg-destructive/5">
                    확정된 버전이 없습니다. 먼저 데이터셋 버전을 확정해주세요.
                  </div>
                ) : (
                  <select
                    value={config.datasetVersionId}
                    onChange={(e) => handleVersionChange(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                  >
                    {versions.map((v) => (
                      <option key={v.versionId} value={v.versionId}>
                        {v.datasetName} — {v.versionTag} ({v.imageCount}장)
                      </option>
                    ))}
                  </select>
                )}
                {selectedVersion && (
                  <p className="text-xs text-muted-foreground mt-1">
                    총 {selectedVersion.imageCount}개 이미지
                  </p>
                )}
              </div>

              {/* 모델 타입 + 크기 */}
              <div className="col-span-2 space-y-3">
                <label className="text-sm font-semibold block">Model Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["yolov8", "yolo11", "yolo12"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleChange("modelType", m)}
                      className={`py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                        config.modelType === m
                          ? "bg-accent text-white border-accent"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {m === "yolov8" ? "YOLOv8" : m === "yolo11" ? "YOLO11" : "YOLO12"}
                    </button>
                  ))}
                </div>

                <label className="text-sm font-semibold block mt-2">Model Size</label>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    { value: "n", label: "Nano",   desc: "가장 빠름" },
                    { value: "s", label: "Small",  desc: "빠름" },
                    { value: "m", label: "Medium", desc: "균형" },
                    { value: "l", label: "Large",  desc: "높은 정확도" },
                    { value: "x", label: "XLarge", desc: "최고 정확도" },
                  ] as const).map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleChange("modelSize", value)}
                      className={`flex flex-col items-center py-2.5 px-1 rounded-lg border text-sm transition-colors ${
                        config.modelSize === value
                          ? "bg-accent text-white border-accent"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <span className="font-bold">{label[0]}</span>
                      <span className="text-xs font-semibold">{label}</span>
                      <span className={`text-[10px] mt-0.5 ${config.modelSize === value ? "text-white/70" : "text-muted-foreground"}`}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Hyperparameters */}
          <div className="bg-purple-950/30 border border-purple-800/50 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-purple-100">Hyperparameters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold block mb-2">Epochs</label>
                <input
                  type="number"
                  value={config.epochs}
                  onChange={(e) => handleChange("epochs", parseInt(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                  min="1" max="500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">Batch Size</label>
                <input
                  type="number"
                  value={config.batchSize}
                  onChange={(e) => handleChange("batchSize", parseInt(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                  min="8" max="256"
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">Learning Rate</label>
                <input
                  type="number"
                  value={config.learningRate}
                  onChange={(e) => handleChange("learningRate", parseFloat(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                  min="0.00001" max="0.1" step="0.00001"
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">Optimizer</label>
                <select
                  value={config.optimizer}
                  onChange={(e) => handleChange("optimizer", e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="adam">Adam</option>
                  <option value="sgd">SGD</option>
                  <option value="rmsprop">RMSprop</option>
                  <option value="adagrad">AdaGrad</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-primary/5 border-l-4 border-l-primary p-4 rounded">
            <h4 className="font-semibold text-sm mb-3">Training Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Dataset</span>
                <div className="font-semibold">{selectedVersion?.datasetName ?? "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Version</span>
                <div className="font-semibold">{selectedVersion?.versionTag ?? "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Model Type</span>
                <div className="font-semibold">{config.modelType} - {config.modelSize.toUpperCase()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Epochs</span>
                <div className="font-semibold">{config.epochs}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Batch Size</span>
                <div className="font-semibold">{config.batchSize}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Learning Rate</span>
                <div className="font-semibold">{config.learningRate}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose} className="flex-1 hover:bg-muted hover:text-foreground">
              Cancel
            </Button>
            <Button
              onClick={() => { onStartTraining(config); onClose() }}
              className="flex-1 bg-accent hover:bg-accent/80 text-white"
              disabled={versions.length === 0 || config.datasetVersionId === 0}
            >
              Start Training
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

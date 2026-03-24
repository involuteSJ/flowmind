"use client"

import { useState, useEffect } from "react"
import { X, Zap, Settings, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface OptimizationModalProps {
  isOpen: boolean
  onClose: () => void
  onStart: (config: OptimizationConfig) => void
}

export interface OptimizationConfig {
  trainingJobId: number
  sourceModelName: string
  format: "ONNX" | "ENGINE"
  imgSize: number
  halfPrecision: boolean
  dynamic: boolean
  simplify: boolean
  opset: number
  workspace: number
}

interface CompletedModel {
  jobId: number
  modelName: string
  datasetName: string
  versionTag: string
  modelType: string
  modelSize: string
}

const FORMAT_INFO = {
  ONNX: {
    label: "ONNX",
    desc: "범용 딥러닝 모델 포맷. CPU/GPU 모두 지원하며 다양한 런타임과 호환됩니다.",
    badge: "범용",
    color: "border-blue-500 bg-blue-500/10",
    badgeColor: "bg-blue-500/20 text-blue-300",
  },
  ENGINE: {
    label: "TensorRT Engine",
    desc: "NVIDIA GPU 전용 최적화 포맷. 가장 빠른 추론 속도를 제공합니다.",
    badge: "GPU 전용",
    color: "border-purple-500 bg-purple-500/10",
    badgeColor: "bg-purple-500/20 text-purple-300",
  },
}

export function OptimizationModal({ isOpen, onClose, onStart }: OptimizationModalProps) {
  const [models, setModels] = useState<CompletedModel[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<number>(0)
  const [format, setFormat] = useState<"ONNX" | "ENGINE">("ONNX")
  const [showAdvanced, setShowAdvanced] = useState(false)

  // 공통
  const [imgSize, setImgSize] = useState(640)
  const [halfPrecision, setHalfPrecision] = useState(false)
  // ONNX
  const [dynamic, setDynamic] = useState(false)
  const [simplify, setSimplify] = useState(true)
  const [opset, setOpset] = useState(12)
  // ENGINE
  const [workspace, setWorkspace] = useState(4)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    const token = localStorage.getItem("accessToken")
    fetch("http://localhost:8080/api/optimization/models", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: CompletedModel[]) => {
        setModels(data)
        if (data.length > 0) setSelectedJobId(data[0].jobId)
      })
      .catch(() => setModels([]))
      .finally(() => setLoading(false))
  }, [isOpen])

  if (!isOpen) return null

  const selectedModel = models.find((m) => m.jobId === selectedJobId)
  const canStart = selectedJobId > 0

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              Model Optimization
            </h2>
            <p className="text-sm text-muted-foreground mt-1">학습된 모델을 경량화하여 배포 최적화</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 모델 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold block">원본 모델 선택 (완료된 학습)</label>
            {loading ? (
              <div className="text-sm text-muted-foreground px-4 py-3 border border-border rounded-lg">불러오는 중...</div>
            ) : models.length === 0 ? (
              <div className="text-sm text-destructive px-4 py-3 border border-destructive/40 rounded-lg bg-destructive/5">
                완료된 학습 모델이 없습니다.
              </div>
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground outline-none"
              >
                {models.map((m) => (
                  <option key={m.jobId} value={m.jobId}>
                    {m.modelName ?? `Job #${m.jobId}`} ({m.modelType}-{m.modelSize?.toUpperCase()})
                  </option>
                ))}
              </select>
            )}
            {selectedModel && (
              <p className="text-xs text-muted-foreground px-1">
                데이터셋: {selectedModel.datasetName} — {selectedModel.versionTag}
              </p>
            )}
          </div>

          {/* 포맷 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold block">경량화 포맷</label>
            <div className="grid grid-cols-2 gap-3">
              {(["ONNX", "ENGINE"] as const).map((f) => {
                const info = FORMAT_INFO[f]
                const selected = format === f
                return (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selected ? info.color : "border-border bg-background/50 hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{info.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.badgeColor}`}>
                        {info.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{info.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 기본 옵션 */}
          <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              기본 옵션
            </h3>

            {/* Image Size */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Image Size: <span className="text-accent">{imgSize}</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[320, 416, 640, 1280].map((s) => (
                  <button
                    key={s}
                    onClick={() => setImgSize(s)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      imgSize === s
                        ? "bg-accent text-white border-accent"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Half Precision */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">FP16 (Half Precision)</div>
                <div className="text-xs text-muted-foreground">모델 크기 절반, 추론 속도 향상 (GPU 필요)</div>
              </div>
              <button
                onClick={() => setHalfPrecision(!halfPrecision)}
                className={`w-11 h-6 rounded-full transition-colors relative ${halfPrecision ? "bg-accent" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${halfPrecision ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>

          {/* 고급 옵션 토글 */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-sm font-semibold"
            >
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                고급 옵션
              </span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border bg-muted/10">
                {format === "ONNX" ? (
                  <>
                    {/* Dynamic */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Dynamic Shape</div>
                        <div className="text-xs text-muted-foreground">입력 크기를 동적으로 허용</div>
                      </div>
                      <button
                        onClick={() => setDynamic(!dynamic)}
                        className={`w-11 h-6 rounded-full transition-colors relative ${dynamic ? "bg-accent" : "bg-muted"}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${dynamic ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    {/* Simplify */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Simplify</div>
                        <div className="text-xs text-muted-foreground">onnx-simplifier로 그래프 단순화</div>
                      </div>
                      <button
                        onClick={() => setSimplify(!simplify)}
                        className={`w-11 h-6 rounded-full transition-colors relative ${simplify ? "bg-accent" : "bg-muted"}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${simplify ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    {/* Opset */}
                    <div>
                      <label className="text-sm font-medium block mb-2">
                        ONNX Opset: <span className="text-accent">{opset}</span>
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[11, 12, 13, 17].map((v) => (
                          <button
                            key={v}
                            onClick={() => setOpset(v)}
                            className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                              opset === v ? "bg-accent text-white border-accent" : "border-border bg-background hover:bg-muted"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  /* ENGINE */
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Workspace (GB): <span className="text-accent">{workspace}</span>
                    </label>
                    <input
                      type="range" min="1" max="16" step="1"
                      value={workspace}
                      onChange={(e) => setWorkspace(Number(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1 GB</span><span>16 GB</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">TensorRT 빌드 시 허용할 최대 GPU 메모리</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent hover:bg-muted">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onStart({
                trainingJobId: selectedJobId,
                sourceModelName: selectedModel?.modelName ?? `Job #${selectedJobId}`,
                format,
                imgSize,
                halfPrecision,
                dynamic,
                simplify,
                opset,
                workspace,
              })
              onClose()
            }}
            disabled={!canStart}
            className="flex-1 gap-2 bg-yellow-500 hover:bg-yellow-500/80 text-black font-semibold"
          >
            <Zap className="w-4 h-4" />
            Start Optimization
          </Button>
        </div>
      </Card>
    </div>
  )
}

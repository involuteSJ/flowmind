"use client"

import { useState, useEffect } from "react"
import { X, BarChart3, TrendingUp, Target, Percent } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface EvaluationModalProps {
  isOpen: boolean
  onClose: () => void
  onStartEvaluation: (config: EvaluationConfig) => void
}

export interface EvaluationConfig {
  trainingJobId: number
  modelName: string
  datasetVersionId: number
  datasetLabel: string
  testSplit: number
}

interface CompletedModel {
  jobId: number
  modelName: string
  datasetName: string
  versionTag: string
  modelType: string
  modelSize: string
  createdAt: string
}

interface FinalizedVersion {
  versionId: number
  datasetName: string
  versionTag: string
}

export function EvaluationModal({ isOpen, onClose, onStartEvaluation }: EvaluationModalProps) {
  const [models, setModels] = useState<CompletedModel[]>([])
  const [versions, setVersions] = useState<FinalizedVersion[]>([])
  const [loadingModels, setLoadingModels] = useState(false)

  const [selectedModelJobId, setSelectedModelJobId] = useState<number>(0)
  const [selectedVersionId, setSelectedVersionId] = useState<number>(0)
  const [testSplit, setTestSplit] = useState(20)

  useEffect(() => {
    if (!isOpen) return
    const token = localStorage.getItem("accessToken")

    const loadModels = async () => {
      setLoadingModels(true)
      try {
        const res = await fetch("http://localhost:8080/api/evaluation/models", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error()
        const data: CompletedModel[] = await res.json()
        setModels(data)
        if (data.length > 0) setSelectedModelJobId(data[0].jobId)
      } catch {
        setModels([])
      } finally {
        setLoadingModels(false)
      }
    }

    const loadVersions = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/datasets/all", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        const finalized: FinalizedVersion[] = []
        for (const ds of data) {
          for (const v of ds.versions ?? []) {
            if (v.status === "FINALIZED") {
              finalized.push({ versionId: v.id, datasetName: ds.name, versionTag: v.versionTag })
            }
          }
        }
        setVersions(finalized)
        if (finalized.length > 0) setSelectedVersionId(finalized[0].versionId)
      } catch {
        setVersions([])
      }
    }

    loadModels()
    loadVersions()
  }, [isOpen])

  const selectedModel = models.find((m) => m.jobId === selectedModelJobId)
  const selectedVersion = versions.find((v) => v.versionId === selectedVersionId)

  if (!isOpen) return null

  const canStart = selectedModelJobId > 0 && selectedVersionId > 0

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold">Model Evaluation</h2>
            <p className="text-sm text-muted-foreground mt-1">학습 완료 모델의 성능을 평가합니다</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Model & Dataset */}
          <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-5 space-y-4">
            <h3 className="text-lg font-bold text-blue-100 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Model & Dataset Selection
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* 모델 선택 */}
              <div>
                <label className="text-sm font-semibold block mb-2">
                  평가할 모델 <span className="text-blue-400">(완료된 학습만)</span>
                </label>
                {loadingModels ? (
                  <div className="text-sm text-muted-foreground px-4 py-3 border border-border rounded-lg">불러오는 중...</div>
                ) : models.length === 0 ? (
                  <div className="text-sm text-destructive px-4 py-3 border border-destructive/40 rounded-lg bg-destructive/5">
                    완료된 학습 모델이 없습니다.
                  </div>
                ) : (
                  <select
                    value={selectedModelJobId}
                    onChange={(e) => setSelectedModelJobId(Number(e.target.value))}
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
                  <p className="text-xs text-muted-foreground mt-1">
                    데이터셋: {selectedModel.datasetName} — {selectedModel.versionTag}
                  </p>
                )}
              </div>

              {/* 평가 데이터셋 */}
              <div>
                <label className="text-sm font-semibold block mb-2">
                  평가 데이터셋 <span className="text-blue-400">(확정된 버전만)</span>
                </label>
                {versions.length === 0 ? (
                  <div className="text-sm text-destructive px-4 py-3 border border-destructive/40 rounded-lg bg-destructive/5">
                    확정된 데이터셋이 없습니다.
                  </div>
                ) : (
                  <select
                    value={selectedVersionId}
                    onChange={(e) => setSelectedVersionId(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground outline-none"
                  >
                    {versions.map((v) => (
                      <option key={v.versionId} value={v.versionId}>
                        {v.datasetName} — {v.versionTag}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Test Split 슬라이더 */}
            <div>
              <label className="text-sm font-semibold block mb-2">
                Test Split: <span className="text-blue-300">{testSplit}%</span>
              </label>
              <input
                type="range" min="10" max="50" step="5"
                value={testSplit}
                onChange={(e) => setTestSplit(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>10%</span><span>50%</span>
              </div>
            </div>
          </div>

          {/* 평가 메트릭 안내 */}
          <div className="bg-purple-950/30 border border-purple-800/50 rounded-lg p-5">
            <h3 className="text-lg font-bold text-purple-100 flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5" />
              평가 지표 (자동 계산)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Precision", desc: "예측한 것 중 맞은 비율" },
                { name: "Recall",    desc: "실제 정답 중 맞춘 비율" },
                { name: "mAP@50",   desc: "IoU 0.5 기준 평균 정밀도" },
                { name: "mAP@50:95",desc: "IoU 0.5~0.95 평균 정밀도" },
              ].map((m) => (
                <div key={m.name} className="p-3 rounded-lg border border-purple-800/50 bg-purple-900/20">
                  <div className="font-semibold text-sm text-purple-200">{m.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-lg p-4">
            <h3 className="text-base font-bold text-cyan-100 flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4" />
              Evaluation Summary
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">모델</span>
                <div className="font-semibold">{selectedModel?.modelName ?? "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">평가 데이터셋</span>
                <div className="font-semibold">
                  {selectedVersion ? `${selectedVersion.datasetName} — ${selectedVersion.versionTag}` : "—"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Test Split</span>
                <div className="font-semibold">{testSplit}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent hover:bg-muted">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onStartEvaluation({
                trainingJobId: selectedModelJobId,
                modelName: selectedModel?.modelName ?? `Job #${selectedModelJobId}`,
                datasetVersionId: selectedVersionId,
                datasetLabel: selectedVersion
                  ? `${selectedVersion.datasetName} — ${selectedVersion.versionTag}`
                  : `Version #${selectedVersionId}`,
                testSplit,
              })
              onClose()
            }}
            disabled={!canStart}
            className="flex-1 gap-2 bg-accent hover:bg-accent/80 text-white"
          >
            <Percent className="w-4 h-4" />
            Start Evaluation
          </Button>
        </div>
      </Card>
    </div>
  )
}

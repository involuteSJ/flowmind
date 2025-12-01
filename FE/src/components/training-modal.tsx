"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X } from "lucide-react"

export interface DatasetVersion {
  id: number
  versionTag: string
  createdAt: string
  assetsCount: number
}

export interface DatasetSummary {
  id: number
  name: string
  versions: DatasetVersion[]
}

interface TrainingModalProps {
  isOpen: boolean
  onClose: () => void
  onStartTraining: (config: TrainingConfig) => void
  datasets: DatasetSummary[]
}

export interface TrainingConfig {
  datasetId: string
  datasetVersion: string
  modelName: string
  modelVersion: string
  modelType: string      // object-detection / image-classification / ...
  base: string           // yolov8 / yolo11 / yolo12
  modelSize: string      // n / s / m / l / x
  epochs: number
  batchSize: number
  learningRate: number
  optimizer: string
}

export function TrainingModal({
  isOpen,
  onClose,
  onStartTraining,
  datasets,
}: TrainingModalProps) {
  const [config, setConfig] = useState<TrainingConfig>({
    datasetId: "",
    datasetVersion: "",
    modelName: "",
    modelVersion: "",
    modelType: "object-detection",
    base: "yolov8",      // ← 변경됨
    modelSize: "n",
    epochs: 50,
    batchSize: 32,
    learningRate: 0.001,
    optimizer: "adam",
  })

  // 기본 데이터셋 선택
  useEffect(() => {
    if (!config.datasetId && datasets.length > 0) {
      const first = datasets[0]
      const firstVersion = first.versions[0]?.versionTag || ""
      setConfig((prev) => ({
        ...prev,
        datasetId: String(first.id),
        datasetVersion: firstVersion,
      }))
    }
  }, [datasets])

  const selectedDataset = datasets.find(
    (d) => String(d.id) === config.datasetId,
  )
  const datasetVersions = selectedDataset?.versions || []

  // 데이터셋 변경 시 버전 기본값 맞추기
  useEffect(() => {
    const ds = datasets.find((d) => String(d.id) === config.datasetId)
    const versions = ds?.versions || []

    setConfig((prev) => {
      if (versions.length === 0) {
        if (prev.datasetVersion === "") return prev
        return { ...prev, datasetVersion: "" }
      }

      const exists = versions.some(
        (v) => v.versionTag === prev.datasetVersion,
      )
      const newVersion = exists ? prev.datasetVersion : versions[0].versionTag
      if (newVersion === prev.datasetVersion) return prev
      return { ...prev, datasetVersion: newVersion }
    })
  }, [config.datasetId, datasets])

  const handleChange = (field: keyof TrainingConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  const handleStartTraining = () => {
    onStartTraining(config)
    onClose()
  }

  if (!isOpen) return null

  const datasetName = selectedDataset?.name || "-"
  const datasetVersionLabel = config.datasetVersion || "-"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Configure Training</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Section 1: Dataset & Model Selection */}
          <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 text-blue-100">
              Dataset &amp; Model Selection
            </h3>

            {/* Row 1: Dataset / Dataset Version */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Select Dataset */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Select Dataset
                </label>
                <select
                  value={config.datasetId}
                  onChange={(e) =>
                    handleChange("datasetId", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                >
                  {datasets.length === 0 && (
                    <option value="">사용 가능한 데이터셋이 없습니다</option>
                  )}
                  {datasets.map((ds) => (
                    <option key={ds.id} value={String(ds.id)}>
                      {ds.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Dataset Version */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Select Dataset Version
                </label>
                <select
                  value={config.datasetVersion}
                  onChange={(e) =>
                    handleChange("datasetVersion", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                  disabled={datasetVersions.length === 0}
                >
                  {datasetVersions.length === 0 && (
                    <option value="">사용 가능한 버전이 없습니다</option>
                  )}
                  {datasetVersions.map((v) => (
                    <option key={v.id} value={v.versionTag}>
                      {v.versionTag}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Model Name / Model Version (user input) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Model Name
                </label>
                <input
                  type="text"
                  value={config.modelName}
                  onChange={(e) =>
                    handleChange("modelName", e.target.value)
                  }
                  placeholder="e.g. yolo-bug-detector"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Model Version
                </label>
                <input
                  type="text"
                  value={config.modelVersion}
                  onChange={(e) =>
                    handleChange("modelVersion", e.target.value)
                  }
                  placeholder="e.g. v1.0.0"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            {/* Row 3: Model Type / Base Model / Model Size */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Model Type */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Model Type
                </label>
                <select
                  value={config.modelType}
                  onChange={(e) =>
                    handleChange("modelType", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="object-detection">Object Detection</option>
                  <option value="image-classification">
                    Image Classification
                  </option>
                  <option value="segmentation">
                    Semantic Segmentation
                  </option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Select Base Model */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Select Base
                </label>
                <select
                  value={config.base}
                  onChange={(e) => handleChange("base", e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground"
                >
                  <option value="yolov8">YOLOv8</option>
                  <option value="yolo11">YOLO11</option>
                  <option value="yolo12">YOLO12</option>
                </select>
              </div>

              {/* Model Size */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Model Size
                </label>
                <select
                  value={config.modelSize}
                  onChange={(e) =>
                    handleChange("modelSize", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="n">n (nano)</option>
                  <option value="s">s (small)</option>
                  <option value="m">m (medium)</option>
                  <option value="l">l (large)</option>
                  <option value="x">x (x-large)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Hyperparameters */}
          <div className="bg-purple-950/30 border border-purple-800/50 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 text-purple-100">
              Hyperparameters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Epochs
                </label>
                <input
                  type="number"
                  value={config.epochs}
                  onChange={(e) =>
                    handleChange(
                      "epochs",
                      Number.parseInt(e.target.value),
                    )
                  }
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                  min={1}
                  max={500}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Batch Size
                </label>
                <input
                  type="number"
                  value={config.batchSize}
                  onChange={(e) =>
                    handleChange(
                      "batchSize",
                      Number.parseInt(e.target.value),
                    )
                  }
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                  min={1}
                  max={512}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Learning Rate
                </label>
                <input
                  type="number"
                  value={config.learningRate}
                  onChange={(e) =>
                    handleChange(
                      "learningRate",
                      Number.parseFloat(e.target.value),
                    )
                  }
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                  min={0.00001}
                  max={0.1}
                  step={0.00001}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Optimizer
                </label>
                <select
                  value={config.optimizer}
                  onChange={(e) =>
                    handleChange("optimizer", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="adam">Adam</option>
                  <option value="sgd">SGD</option>
                  <option value="adamw">AdamW</option>
                  <option value="rmsprop">RMSprop</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-6">
            <h4 className="font-semibold text-sm mb-3">
              Training Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Dataset:</span>
                <div className="font-semibold text-foreground">
                  {datasetName}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Dataset Version:</span>
                <div className="font-semibold text-foreground">
                  {datasetVersionLabel}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Model Name:</span>
                <div className="font-semibold text-foreground">
                  {config.modelName || "-"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Model Version:</span>
                <div className="font-semibold text-foreground">
                  {config.modelVersion || "-"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Model Type:</span>
                <div className="font-semibold text-foreground">
                  {config.modelType}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Base Model:</span>
                <div className="font-semibold text-foreground">
                  {config.base}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Model Size:</span>
                <div className="font-semibold text-foreground">
                  {config.modelSize}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Epochs:</span>
                <div className="font-semibold text-foreground">
                  {config.epochs}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Batch Size:</span>
                <div className="font-semibold text-foreground">
                  {config.batchSize}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Learning Rate:
                </span>
                <div className="font-semibold text-foreground">
                  {config.learningRate}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-transparent"
            >
              Cancel
            </Button>
            <Button onClick={handleStartTraining} className="flex-1">
              Start Training
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

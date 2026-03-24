"use client"

import { useState } from "react"
import { X, BarChart3, TrendingUp, Target, Percent } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface EvaluationModalProps {
  isOpen: boolean
  onClose: () => void
  onStartEvaluation: (config: EvaluationConfig) => void
}

export interface EvaluationConfig {
  model: string
  dataset: string
  testSplit: number
  metrics: string[]
}

const mockModels = [
  { id: "1", name: "ResNet-50 v1.2", type: "Image Classification", accuracy: 94.2 },
  { id: "2", name: "YOLOv8 Custom", type: "Object Detection", accuracy: 89.7 },
  { id: "3", name: "EfficientNet B4", type: "Image Classification", accuracy: 96.1 },
]

const mockDatasets = [
  { id: "1", name: "Product Images", images: 1250 },
  { id: "2", name: "Street Objects", images: 3420 },
  { id: "3", name: "Medical Scans", images: 890 },
]

const availableMetrics = [
  { id: "accuracy", name: "Accuracy", description: "Overall correctness" },
  { id: "precision", name: "Precision", description: "Positive predictive value" },
  { id: "recall", name: "Recall", description: "True positive rate" },
  { id: "f1", name: "F1 Score", description: "Harmonic mean of precision and recall" },
  { id: "confusion", name: "Confusion Matrix", description: "Classification breakdown" },
  { id: "roc", name: "ROC-AUC", description: "Receiver operating characteristic" },
]

export function EvaluationModal({ isOpen, onClose, onStartEvaluation }: EvaluationModalProps) {
  const [selectedModel, setSelectedModel] = useState("")
  const [selectedDataset, setSelectedDataset] = useState("")
  const [testSplit, setTestSplit] = useState(20)
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["accuracy", "precision", "recall", "f1"])

  if (!isOpen) return null

  const handleStartEvaluation = () => {
    onStartEvaluation({
      model: selectedModel,
      dataset: selectedDataset,
      testSplit,
      metrics: selectedMetrics,
    })
    onClose()
  }

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId) ? prev.filter((m) => m !== metricId) : [...prev, metricId]
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Model Evaluation</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure evaluation settings for your trained model
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Model & Dataset Selection */}
          <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-4 text-blue-100 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Model & Dataset Selection
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full p-3 rounded-lg bg-background border border-border text-foreground"
                >
                  <option value="">Choose a model...</option>
                  {mockModels.map((model) => (
                    <option key={model.id} value={model.name}>
                      {model.name} ({model.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Test Dataset</label>
                <select
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  className="w-full p-3 rounded-lg bg-background border border-border text-foreground"
                >
                  <option value="">Choose a dataset...</option>
                  {mockDatasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.name}>
                      {dataset.name} ({dataset.images} images)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Test Split: {testSplit}%
              </label>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={testSplit}
                onChange={(e) => setTestSplit(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>10%</span>
                <span>50%</span>
              </div>
            </div>
          </div>

          {/* Evaluation Metrics */}
          <div className="bg-purple-950/30 border border-purple-800/50 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-4 text-purple-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Evaluation Metrics
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select the metrics you want to calculate for this evaluation
            </p>
            <div className="grid grid-cols-2 gap-3">
              {availableMetrics.map((metric) => (
                <button
                  key={metric.id}
                  onClick={() => toggleMetric(metric.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedMetrics.includes(metric.id)
                      ? "border-purple-500 bg-purple-500/20"
                      : "border-border hover:border-purple-500/50 bg-background/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selectedMetrics.includes(metric.id)
                          ? "bg-purple-500 border-purple-500"
                          : "border-muted-foreground"
                      }`}
                    >
                      {selectedMetrics.includes(metric.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-sm">{metric.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 pl-6">{metric.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-4 text-cyan-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Evaluation Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Model:</span>
                <div className="font-semibold">{selectedModel || "Not selected"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Dataset:</span>
                <div className="font-semibold">{selectedDataset || "Not selected"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Test Split:</span>
                <div className="font-semibold">{testSplit}%</div>
              </div>
              <div>
                <span className="text-muted-foreground">Metrics Selected:</span>
                <div className="font-semibold">{selectedMetrics.length} metrics</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button
            onClick={handleStartEvaluation}
            disabled={!selectedModel || !selectedDataset || selectedMetrics.length === 0}
            className="flex-1 gap-2"
          >
            <Percent className="w-4 h-4" />
            Start Evaluation
          </Button>
        </div>
      </Card>
    </div>
  )
}

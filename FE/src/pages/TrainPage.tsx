import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Play, History, AlertCircle } from "lucide-react"
import {
  TrainingModal,
  TrainingConfig,
  DatasetSummary,
} from "@/components/training-modal"

export default function TrainPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [datasets, setDatasets] = useState<DatasetSummary[]>([])
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false)

  useEffect(() => {
    const fetchDatasets = async () => {
      setIsLoadingDatasets(true)
      try {
        const token = localStorage.getItem("accessToken")
        const res = await fetch("http://localhost:8080/api/datasets/all", {
          method: "GET",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        })

        if (!res.ok) {
          const text = await res.text().catch(() => "")
          console.error("Failed to fetch datasets for training:", text)
          return
        }

        const data = (await res.json()) as DatasetSummary[]
        setDatasets(data)
      } catch (err) {
        console.error("Unexpected error while fetching datasets:", err)
      } finally {
        setIsLoadingDatasets(false)
      }
    }

    fetchDatasets()
  }, [])

  const handleStartTraining = async (config: TrainingConfig) => {
    const token = localStorage.getItem("accessToken")
  
    // 백엔드에 넘길 payload 형태 정의
    const payload = {
      datasetId: Number(config.datasetId),
      datasetVersion: config.datasetVersion,
    
      model: {
        name: config.modelName,
        version: config.modelVersion,
        type: config.modelType,
        base: config.base,          // ← 변경됨
        size: config.modelSize,
      },
    
      hyperparams: {
        epochs: config.epochs,
        batchSize: config.batchSize,
        learningRate: config.learningRate,
        optimizer: config.optimizer,
      },
    }
  
    const res = await fetch("http://localhost:8080/api/train", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
  
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      console.error("Train start failed:", res.status, text)
      alert("학습 시작에 실패했습니다.")
      return
    }
  
    // 필요하면 응답 JSON 읽기
    // const data = await res.json()
    alert("학습을 시작했습니다.")
  }
  

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Train Models</h1>
            <p className="text-muted-foreground">
              Train custom ML models using your annotated datasets.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Play className="w-4 h-4 mr-2" />
            Start Training
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Training Overview */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Training Overview</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure and launch new training jobs for your datasets.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Ready to train a new model?
                </p>
                <Button variant="outline" onClick={() => setIsModalOpen(true)}>
                  <Play className="w-4 h-4 mr-2" />
                  Configure Training
                </Button>
                {isLoadingDatasets && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Loading datasets...
                  </p>
                )}
                {!isLoadingDatasets && datasets.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    No datasets available. Please create a dataset first.
                  </p>
                )}
              </div>
            </Card>

            {/* Training History (placeholder) */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-muted">
                  <History className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold">Training History</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Training history will appear here once you start training
                models.
              </p>
            </Card>
          </div>

          {/* Training Stats */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-1">
                  Active Trainings
                </div>
                <div className="text-3xl font-bold">0</div>
              </Card>

              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-1">
                  Completed Models
                </div>
                <div className="text-3xl font-bold">0</div>
              </Card>

              <Card className="p-6">
                <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Training Tips
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>
                    • Start with a small number of epochs to validate your
                    setup.
                  </li>
                  <li>• Monitor validation loss to prevent overfitting.</li>
                  <li>• Use smaller batch sizes if you run into memory issues.</li>
                  <li>• Ensure your dataset is well-balanced across classes.</li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <TrainingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStartTraining={handleStartTraining}
        datasets={datasets}
      />
    </div>
  )
}

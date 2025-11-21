import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Play, History, AlertCircle } from "lucide-react"

export default function TrainPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Train Models</h1>
          <p className="text-muted-foreground">Train custom ML models using your annotated datasets.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Training Configuration */}
          <div className="lg:col-span-2">
            <Card className="p-8 flex flex-col items-center justify-center min-h-96 border-2 border-dashed">
              <Brain className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No training sessions yet</h2>
              <p className="text-muted-foreground mb-6 text-center">
                Select a dataset and configure training parameters to start training a model.
              </p>
              <Button className="gap-2" disabled>
                <Play className="w-4 h-4" />
                Start Training
              </Button>
            </Card>
          </div>

          {/* Training Stats */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-1">Active Trainings</div>
                <div className="text-3xl font-bold">0</div>
              </Card>

              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-1">Completed Models</div>
                <div className="text-3xl font-bold">0</div>
              </Card>

              <Card className="p-6 border-primary/20 bg-primary/5">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Training History
                </h4>
                <div className="text-xs text-muted-foreground">No training history yet</div>
              </Card>

              <Card className="p-6 border-accent/20 bg-accent/5">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Model Options
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• Image Classification</li>
                  <li>• Object Detection</li>
                  <li>• Semantic Segmentation</li>
                  <li>• Custom Fine-tuning</li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

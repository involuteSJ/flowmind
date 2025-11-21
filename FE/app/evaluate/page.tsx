"use client"

import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Download, AlertCircle } from "lucide-react"

export default function EvaluatePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Evaluate Models</h1>
          <p className="text-muted-foreground">Analyze and evaluate the performance of your trained models.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Evaluation Metrics */}
          <div className="lg:col-span-2">
            <Card className="p-8 flex flex-col items-center justify-center min-h-96 border-2 border-dashed">
              <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No models to evaluate</h2>
              <p className="text-muted-foreground mb-6 text-center">
                Train a model first to view evaluation metrics and performance analysis.
              </p>
              <Button variant="outline">View Training Page</Button>
            </Card>
          </div>

          {/* Evaluation Stats */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-1">Models Evaluated</div>
                <div className="text-3xl font-bold">0</div>
              </Card>

              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-1">Average Accuracy</div>
                <div className="text-3xl font-bold">-</div>
              </Card>

              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-1">Best Model</div>
                <div className="text-sm font-semibold">None</div>
              </Card>

              <Button className="w-full gap-2 bg-transparent" variant="outline" disabled>
                <Download className="w-4 h-4" />
                Export Report
              </Button>

              <Card className="p-6 border-accent/20 bg-accent/5">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Evaluation Metrics
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• Accuracy & Precision</li>
                  <li>• Recall & F1 Score</li>
                  <li>• Confusion Matrix</li>
                  <li>• ROC-AUC Curves</li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

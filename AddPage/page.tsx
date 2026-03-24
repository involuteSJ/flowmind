"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Play, CheckCircle2, TrendingUp, Target, Percent, Download } from "lucide-react"
import { EvaluationModal, type EvaluationConfig } from "@/components/evaluation-modal"

interface EvaluationResult extends EvaluationConfig {
  id: string
  date: string
  results: {
    accuracy?: number
    precision?: number
    recall?: number
    f1?: number
  }
}

export default function EvaluatePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationResult[]>([])

  const handleStartEvaluation = (config: EvaluationConfig) => {
    // Generate mock results
    const newResult: EvaluationResult = {
      ...config,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleString(),
      results: {
        accuracy: Math.round((85 + Math.random() * 12) * 10) / 10,
        precision: Math.round((82 + Math.random() * 15) * 10) / 10,
        recall: Math.round((80 + Math.random() * 18) * 10) / 10,
        f1: Math.round((83 + Math.random() * 14) * 10) / 10,
      },
    }
    setEvaluationHistory([newResult, ...evaluationHistory])
  }

  const averageAccuracy =
    evaluationHistory.length > 0
      ? (evaluationHistory.reduce((sum, e) => sum + (e.results.accuracy || 0), 0) / evaluationHistory.length).toFixed(1)
      : "-"

  const bestModel =
    evaluationHistory.length > 0
      ? evaluationHistory.reduce((best, curr) =>
          (curr.results.accuracy || 0) > (best.results.accuracy || 0) ? curr : best
        )
      : null

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Evaluate Models</h1>
          <p className="text-lg text-muted-foreground">
            Analyze and evaluate the performance of your trained models
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Evaluation Section */}
          <div className="lg:col-span-3">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Models Evaluated</div>
                <div className="text-3xl font-bold mt-1">{evaluationHistory.length}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Average Accuracy</div>
                <div className="text-3xl font-bold mt-1">{averageAccuracy}%</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Best Score</div>
                <div className="text-3xl font-bold mt-1">
                  {bestModel ? `${bestModel.results.accuracy}%` : "-"}
                </div>
              </Card>
            </div>

            {/* CTA Card */}
            <Card className="p-12 flex flex-col items-center justify-center border-2 border-dashed mb-6">
              <BarChart3 className="w-20 h-20 text-primary/40 mb-6" />
              <h2 className="text-2xl font-bold mb-2 text-center">Ready to evaluate your model?</h2>
              <p className="text-muted-foreground mb-8 text-center max-w-md">
                Select a trained model and dataset to run performance evaluation
              </p>
              <Button size="lg" className="gap-2" onClick={() => setIsModalOpen(true)}>
                <Play className="w-5 h-5" />
                Start Evaluation
              </Button>
            </Card>

            {/* Evaluation History */}
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Evaluation Results
              </h3>
              {evaluationHistory.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No evaluations yet. Start your first evaluation to see results here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {evaluationHistory.map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <div>
                            <div className="font-semibold">{evaluation.model}</div>
                            <div className="text-sm text-muted-foreground">
                              Dataset: {evaluation.dataset} | Test Split: {evaluation.testSplit}%
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          <div>{evaluation.date}</div>
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-4 gap-3 mt-3">
                        {evaluation.metrics.includes("accuracy") && (
                          <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-3 text-center">
                            <div className="text-xs text-muted-foreground mb-1">Accuracy</div>
                            <div className="text-lg font-bold text-blue-300">{evaluation.results.accuracy}%</div>
                          </div>
                        )}
                        {evaluation.metrics.includes("precision") && (
                          <div className="bg-purple-950/30 border border-purple-800/50 rounded-lg p-3 text-center">
                            <div className="text-xs text-muted-foreground mb-1">Precision</div>
                            <div className="text-lg font-bold text-purple-300">{evaluation.results.precision}%</div>
                          </div>
                        )}
                        {evaluation.metrics.includes("recall") && (
                          <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-lg p-3 text-center">
                            <div className="text-xs text-muted-foreground mb-1">Recall</div>
                            <div className="text-lg font-bold text-cyan-300">{evaluation.results.recall}%</div>
                          </div>
                        )}
                        {evaluation.metrics.includes("f1") && (
                          <div className="bg-green-950/30 border border-green-800/50 rounded-lg p-3 text-center">
                            <div className="text-xs text-muted-foreground mb-1">F1 Score</div>
                            <div className="text-lg font-bold text-green-300">{evaluation.results.f1}%</div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" className="bg-transparent gap-1">
                          <Download className="w-3 h-3" />
                          Export
                        </Button>
                        <Button variant="outline" size="sm" className="bg-transparent gap-1">
                          <BarChart3 className="w-3 h-3" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-6 border-l-4 border-l-primary">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Available Metrics
              </h4>
              <ul className="space-y-2">
                <li className="text-sm">
                  <span className="text-primary font-medium">Accuracy</span>
                  <p className="text-xs text-muted-foreground">Overall correctness</p>
                </li>
                <li className="text-sm">
                  <span className="text-primary font-medium">Precision</span>
                  <p className="text-xs text-muted-foreground">Positive predictive value</p>
                </li>
                <li className="text-sm">
                  <span className="text-primary font-medium">Recall</span>
                  <p className="text-xs text-muted-foreground">True positive rate</p>
                </li>
                <li className="text-sm">
                  <span className="text-primary font-medium">F1 Score</span>
                  <p className="text-xs text-muted-foreground">Harmonic mean</p>
                </li>
              </ul>
            </Card>

            <Card className="p-6 bg-accent/5 border-accent/20">
              <h4 className="font-bold mb-3 flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Best Performing Model
              </h4>
              {bestModel ? (
                <div>
                  <div className="font-semibold text-accent">{bestModel.model}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Accuracy: {bestModel.results.accuracy}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{bestModel.date}</div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No evaluations yet</p>
              )}
            </Card>

            <Button
              className="w-full gap-2"
              variant="outline"
              disabled={evaluationHistory.length === 0}
            >
              <Download className="w-4 h-4" />
              Export All Results
            </Button>
          </div>
        </div>
      </main>

      <EvaluationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStartEvaluation={handleStartEvaluation}
      />
    </div>
  )
}

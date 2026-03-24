import { useState, useEffect, useRef } from "react"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart3, Play, CheckCircle2, TrendingUp, Target,
  Percent, Clock, XCircle, Download,
} from "lucide-react"
import { EvaluationModal, type EvaluationConfig } from "@/components/evaluation-modal"

type EvalStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"

interface EvalJob {
  evalId: number
  trainingJobId: number
  modelName: string | null
  datasetVersionId: number
  datasetName: string | null
  versionTag: string | null
  testSplit: number
  status: EvalStatus
  progress: number
  metricPrecision: number | null
  metricRecall: number | null
  metricMap50: number | null
  metricMap5095: number | null
  errorMsg: string | null
  createdAt: string
}

const PAGE_SIZE = 5

export default function EvaluatePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [jobs, setJobs] = useState<EvalJob[]>([])
  const [page, setPage] = useState(1)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const token = () => localStorage.getItem("accessToken")

  useEffect(() => {
    fetchMyJobs()
  }, [])

  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === "PENDING" || j.status === "RUNNING")
    if (hasActive && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        const activeJobs = jobs.filter((j) => j.status === "PENDING" || j.status === "RUNNING")
        for (const j of activeJobs) await pollJob(j.evalId)
      }, 3000)
    } else if (!hasActive && pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null } }
  }, [jobs])

  const fetchMyJobs = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/evaluation/list", {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!res.ok) return
      setJobs(await res.json())
    } catch {}
  }

  const pollJob = async (evalId: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/evaluation/${evalId}/status`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!res.ok) return
      const updated: EvalJob = await res.json()
      setJobs((prev) => prev.map((j) => j.evalId === updated.evalId ? updated : j))
    } catch {}
  }

  const handleStartEvaluation = async (config: EvaluationConfig) => {
    try {
      const res = await fetch("http://localhost:8080/api/evaluation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          trainingJobId: config.trainingJobId,
          datasetVersionId: config.datasetVersionId,
          testSplit: config.testSplit,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const job: EvalJob = await res.json()
      setJobs((prev) => [job, ...prev])
      setPage(1)
    } catch (e) {
      alert(e instanceof Error ? e.message : "평가 시작 실패")
    }
  }

  const fmt = (v: number | null) => v != null ? `${v.toFixed(1)}%` : "—"

  const completedJobs = jobs.filter((j) => j.status === "COMPLETED")
  const bestJob = completedJobs.length > 0
    ? completedJobs.reduce((best, cur) => (cur.metricMap50 ?? 0) > (best.metricMap50 ?? 0) ? cur : best)
    : null
  const avgMap50 = completedJobs.length > 0
    ? (completedJobs.reduce((s, j) => s + (j.metricMap50 ?? 0), 0) / completedJobs.length).toFixed(1)
    : "—"

  const statusBadge = (status: EvalStatus) => {
    const map: Record<EvalStatus, { label: string; cls: string; icon: JSX.Element }> = {
      PENDING:   { label: "대기 중", cls: "bg-blue-500/15 text-blue-400",      icon: <Clock className="w-3 h-3" /> },
      RUNNING:   { label: "평가 중", cls: "bg-yellow-500/15 text-yellow-400",  icon: <Clock className="w-3 h-3 animate-spin" /> },
      COMPLETED: { label: "완료",    cls: "bg-green-500/15 text-green-400",    icon: <CheckCircle2 className="w-3 h-3" /> },
      FAILED:    { label: "실패",    cls: "bg-destructive/15 text-destructive", icon: <XCircle className="w-3 h-3" /> },
    }
    const { label, cls, icon } = map[status]
    return (
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${cls}`}>
        {icon}{label}
      </span>
    )
  }

  const pagedJobs = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(jobs.length / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Evaluate Models</h1>
            <p className="text-muted-foreground">학습된 모델의 성능을 평가하고 결과를 확인하세요.</p>
          </div>
          <Button className="gap-2 bg-accent hover:bg-accent/80 text-white" onClick={() => setIsModalOpen(true)}>
            <Play className="w-4 h-4" />
            New Evaluation
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* 메인 영역 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 빠른 통계 */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="text-xs text-muted-foreground mb-1">평가 횟수</div>
                <div className="text-2xl font-bold">{jobs.length}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground mb-1">평균 mAP@50</div>
                <div className="text-2xl font-bold text-blue-400">{avgMap50}{avgMap50 !== "—" ? "%" : ""}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground mb-1">Best mAP@50</div>
                <div className="text-2xl font-bold text-green-400">
                  {bestJob ? `${bestJob.metricMap50?.toFixed(1)}%` : "—"}
                </div>
              </Card>
            </div>

            {jobs.length === 0 ? (
              <Card className="p-12 flex flex-col items-center justify-center border-2 border-dashed">
                <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">평가 기록이 없습니다</h2>
                <p className="text-muted-foreground mb-6 text-center">
                  학습 완료된 모델을 선택하고 성능 평가를 시작하세요.
                </p>
                <Button className="gap-2 bg-accent hover:bg-accent/80 text-white" onClick={() => setIsModalOpen(true)}>
                  <Play className="w-4 h-4" />
                  Start Evaluation
                </Button>
              </Card>
            ) : (
              <>
                {pagedJobs.map((job) => (
                  <Card key={job.evalId} className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-base">
                          {job.modelName ?? `Job #${job.trainingJobId}`}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          데이터셋: {job.datasetName && job.versionTag
                            ? `${job.datasetName} — ${job.versionTag}`
                            : `Version #${job.datasetVersionId}`}
                          {" · "}Test Split: {job.testSplit}%
                        </div>
                        <div className="text-xs text-muted-foreground">{job.createdAt?.slice(0, 19).replace("T", " ")}</div>
                      </div>
                      {statusBadge(job.status)}
                    </div>

                    {/* 진행률 */}
                    {(job.status === "PENDING" || job.status === "RUNNING") && (
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>진행률</span><span>{job.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${job.progress}%` }} />
                        </div>
                      </div>
                    )}

                    {/* 결과 메트릭 */}
                    {job.status === "COMPLETED" && (
                      <div className="grid grid-cols-4 gap-2">
                        <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-3 text-center">
                          <div className="text-xs text-muted-foreground mb-1">Precision</div>
                          <div className="text-base font-bold text-blue-300">{fmt(job.metricPrecision)}</div>
                        </div>
                        <div className="bg-purple-950/30 border border-purple-800/50 rounded-lg p-3 text-center">
                          <div className="text-xs text-muted-foreground mb-1">Recall</div>
                          <div className="text-base font-bold text-purple-300">{fmt(job.metricRecall)}</div>
                        </div>
                        <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-lg p-3 text-center">
                          <div className="text-xs text-muted-foreground mb-1">mAP@50</div>
                          <div className="text-base font-bold text-cyan-300">{fmt(job.metricMap50)}</div>
                        </div>
                        <div className="bg-green-950/30 border border-green-800/50 rounded-lg p-3 text-center">
                          <div className="text-xs text-muted-foreground mb-1">mAP@50:95</div>
                          <div className="text-base font-bold text-green-300">{fmt(job.metricMap5095)}</div>
                        </div>
                      </div>
                    )}

                    {job.status === "FAILED" && (
                      <div className="text-xs text-destructive bg-destructive/10 rounded p-2">{job.errorMsg}</div>
                    )}
                  </Card>
                ))}

                {/* 페이징 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                      className="px-3 py-1.5 text-sm rounded border border-border disabled:opacity-30 hover:bg-muted">이전</button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button key={i + 1} onClick={() => setPage(i + 1)}
                        className={`px-3 py-1.5 text-sm rounded border transition-colors ${page === i + 1 ? "bg-accent text-white border-accent" : "border-border hover:bg-muted"}`}>
                        {i + 1}
                      </button>
                    ))}
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="px-3 py-1.5 text-sm rounded border border-border disabled:opacity-30 hover:bg-muted">다음</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 사이드바 */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-1">완료된 평가</div>
              <div className="text-3xl font-bold text-green-400">{completedJobs.length}</div>
            </Card>
            <Card className="p-6 border-l-4 border-l-primary">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <Target className="w-4 h-4" />
                평가 지표 안내
              </h4>
              <ul className="space-y-3 text-sm">
                {[
                  { name: "Precision", desc: "예측 중 정답 비율" },
                  { name: "Recall",    desc: "정답 중 탐지 비율" },
                  { name: "mAP@50",   desc: "IoU≥0.5 평균 정밀도" },
                  { name: "mAP@50:95",desc: "엄격한 평균 정밀도" },
                ].map((m) => (
                  <li key={m.name}>
                    <span className="text-primary font-medium">{m.name}</span>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-6 bg-accent/5 border-accent/20">
              <h4 className="font-bold mb-3 flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Best Model
              </h4>
              {bestJob ? (
                <div>
                  <div className="font-semibold text-accent text-sm">{bestJob.modelName}</div>
                  <div className="text-xs text-muted-foreground mt-1">mAP@50: {fmt(bestJob.metricMap50)}</div>
                  <div className="text-xs text-muted-foreground">Precision: {fmt(bestJob.metricPrecision)}</div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">아직 평가 결과가 없습니다</p>
              )}
            </Card>
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

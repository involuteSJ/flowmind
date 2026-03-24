import { useState, useEffect, useRef } from "react"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Play, History, AlertCircle, CheckCircle2, Clock, XCircle, X, Download } from "lucide-react"
import { TrainingModal, type TrainingConfig } from "@/components/training-modal"

type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED"

type TrainingJob = {
  jobId: number
  versionId: number
  datasetName: string | null
  versionTag: string | null
  modelType: string
  modelSize: string | null
  epochs: number
  batchSize: number
  learningRate: number
  optimizer: string
  status: JobStatus
  progress: number
  modelPath: string | null
  modelName: string | null
  modelVersion: number | null
  errorMsg: string | null
  createdAt: string
  // FE only
  datasetLabel?: string
}

function jobLabel(job: TrainingJob): string {
  if (job.datasetName && job.versionTag) return `${job.datasetName} — ${job.versionTag}`
  if (job.datasetLabel) return job.datasetLabel
  return `Version #${job.versionId}`
}

const PAGE_SIZE = 5

export default function TrainPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [jobs, setJobs] = useState<TrainingJob[]>([])
  const [page, setPage] = useState(1)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 페이지 진입 시 기존 job 목록 로드
  useEffect(() => {
    fetchMyJobs()
  }, [])

  // 실행 중인 job이 있으면 3초마다 폴링
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === "PENDING" || j.status === "RUNNING")
    if (hasActive && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        const activeJobs = jobs.filter((j) => j.status === "PENDING" || j.status === "RUNNING")
        for (const j of activeJobs) {
          await pollJob(j.jobId)
        }
      }, 3000)
    } else if (!hasActive && pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [jobs])

  const token = () => localStorage.getItem("accessToken")

  const fetchMyJobs = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/training/list", {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!res.ok) return
      const data: TrainingJob[] = await res.json()
      setJobs(data)
    } catch (e) {
      console.error(e)
    }
  }

  const pollJob = async (jobId: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/training/${jobId}/status`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!res.ok) return
      const updated: TrainingJob = await res.json()
      setJobs((prev) =>
        prev.map((j) =>
          j.jobId === updated.jobId
            ? { ...updated, datasetLabel: j.datasetLabel }
            : j
        )
      )
    } catch (e) {
      console.error(e)
    }
  }

  const handleStartTraining = async (config: TrainingConfig) => {
    try {
      const res = await fetch("http://localhost:8080/api/training/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          datasetVersionId: config.datasetVersionId,
          modelType: config.modelType,
          modelSize: config.modelSize,
          epochs: config.epochs,
          batchSize: config.batchSize,
          learningRate: config.learningRate,
          optimizer: config.optimizer,
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || "학습 시작 실패")
      }
      const job: TrainingJob = await res.json()
      setJobs((prev) => [{ ...job, datasetLabel: config.datasetLabel }, ...prev])
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류가 발생했습니다.")
    }
  }

  const handleCancel = async (jobId: number) => {
    if (!confirm("학습을 취소할까요?")) return
    try {
      await fetch(`http://localhost:8080/api/training/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      })
      setJobs((prev) => prev.map((j) => j.jobId === jobId ? { ...j, status: "CANCELLED" } : j))
    } catch (e) {
      alert("취소 실패")
    }
  }

  const activeCount = jobs.filter((j) => j.status === "RUNNING" || j.status === "PENDING").length
  const completedCount = jobs.filter((j) => j.status === "COMPLETED").length

  const statusBadge = (status: JobStatus) => {
    const map: Record<JobStatus, { label: string; cls: string; icon: JSX.Element }> = {
      PENDING:   { label: "대기 중",   cls: "bg-blue-500/15 text-blue-400",      icon: <Clock className="w-3 h-3" /> },
      RUNNING:   { label: "학습 중",   cls: "bg-yellow-500/15 text-yellow-400",  icon: <Clock className="w-3 h-3 animate-spin" /> },
      COMPLETED: { label: "완료",      cls: "bg-green-500/15 text-green-400",    icon: <CheckCircle2 className="w-3 h-3" /> },
      FAILED:    { label: "실패",      cls: "bg-destructive/15 text-destructive",icon: <XCircle className="w-3 h-3" /> },
      CANCELLED: { label: "취소됨",   cls: "bg-muted text-muted-foreground",    icon: <X className="w-3 h-3" /> },
    }
    const { label, cls, icon } = map[status]
    return (
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${cls}`}>
        {icon}{label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Train Models</h1>
            <p className="text-muted-foreground">Train custom ML models using your annotated datasets.</p>
          </div>
          <Button className="gap-2 bg-accent hover:bg-accent/80 text-white" onClick={() => setIsModalOpen(true)}>
            <Play className="w-4 h-4" />
            New Training
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Job 목록 */}
          <div className="lg:col-span-2 space-y-4">
            {jobs.length === 0 ? (
              <Card className="p-8 flex flex-col items-center justify-center min-h-96 border-2 border-dashed">
                <Brain className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No training sessions yet</h2>
                <p className="text-muted-foreground mb-6 text-center">
                  확정된 데이터셋 버전을 선택하고 학습을 시작하세요.
                </p>
                <Button className="gap-2 bg-accent hover:bg-accent/80 text-white" onClick={() => setIsModalOpen(true)}>
                  <Play className="w-4 h-4" />
                  Start Training
                </Button>
              </Card>
            ) : (
              <>
                {jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((job) => (
                <Card key={job.jobId} className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-base">
                        {jobLabel(job)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{job.createdAt?.slice(0, 19).replace("T", " ")}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(job.status)}
                      {(job.status === "RUNNING" || job.status === "PENDING") && (
                        <button
                          onClick={() => handleCancel(job.jobId)}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 진행률 바 */}
                  {(job.status === "RUNNING" || job.status === "PENDING") && (
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>진행률</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-500"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 파라미터 정보 */}
                  <div className="grid grid-cols-3 gap-3 text-sm pt-1">
                    <div><div className="text-xs text-muted-foreground">Model</div><div className="font-medium">{job.modelType}{job.modelSize ? `-${job.modelSize.toUpperCase()}` : ""}</div></div>
                    <div><div className="text-xs text-muted-foreground">Epochs</div><div className="font-medium">{job.epochs}</div></div>
                    <div><div className="text-xs text-muted-foreground">Batch</div><div className="font-medium">{job.batchSize}</div></div>
                    <div><div className="text-xs text-muted-foreground">LR</div><div className="font-medium">{job.learningRate}</div></div>
                    <div><div className="text-xs text-muted-foreground">Optimizer</div><div className="font-medium">{job.optimizer}</div></div>
                    {job.status === "FAILED" && job.errorMsg && (
                      <div className="col-span-3">
                        <div className="text-xs text-muted-foreground">오류</div>
                        <div className="text-xs text-destructive">{job.errorMsg}</div>
                      </div>
                    )}
                  </div>

                  {/* 완료 시 다운로드 버튼 */}
                  {job.status === "COMPLETED" && job.modelPath && (
                    <div className="pt-2 border-t border-border flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">모델명</div>
                        <div className="font-mono text-sm font-semibold text-green-400">
                          {job.modelName ?? `job_${job.jobId}`}
                          {job.modelVersion && (
                            <span className="ml-2 text-xs bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">
                              v{job.modelVersion}
                            </span>
                          )}
                        </div>
                      </div>
                      <a
                        href={`http://localhost:8080/api/training/${job.jobId}/download`}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors whitespace-nowrap"
                      >
                        <Download className="w-4 h-4" />
                        모델 다운로드 (.pt)
                      </a>
                    </div>
                  )}
                </Card>
              ))}

                {/* 페이징 */}
                {jobs.length > PAGE_SIZE && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-sm rounded border border-border disabled:opacity-30 hover:bg-muted transition-colors"
                    >
                      이전
                    </button>
                    {Array.from({ length: Math.ceil(jobs.length / PAGE_SIZE) }, (_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setPage(i + 1)}
                        className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                          page === i + 1
                            ? "bg-accent text-white border-accent"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(Math.ceil(jobs.length / PAGE_SIZE), p + 1))}
                      disabled={page === Math.ceil(jobs.length / PAGE_SIZE)}
                      className="px-3 py-1.5 text-sm rounded border border-border disabled:opacity-30 hover:bg-muted transition-colors"
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 사이드바 */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Active Trainings</div>
              <div className="text-3xl font-bold text-yellow-400">{activeCount}</div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Completed Models</div>
              <div className="text-3xl font-bold text-green-400">{completedCount}</div>
            </Card>
            <Card className="p-6 border-primary/20 bg-primary/5">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent Jobs
              </h4>
              {jobs.length === 0 ? (
                <div className="text-xs text-muted-foreground">No training history yet</div>
              ) : (
                <div className="space-y-2">
                  {jobs.slice(0, 5).map((job) => (
                    <div key={job.jobId} className="text-xs flex justify-between items-center gap-2">
                      <span className="text-muted-foreground truncate">{job.modelType}</span>
                      <span className={
                        job.status === "COMPLETED" ? "text-green-400" :
                        job.status === "RUNNING"   ? "text-yellow-400" :
                        job.status === "PENDING"   ? "text-blue-400" :
                        job.status === "FAILED"    ? "text-destructive" : "text-muted-foreground"
                      }>{job.progress}%</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card className="p-6 border-accent/20 bg-accent/5">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Supported Models
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>• YOLOv8</li>
                <li>• YOLO11</li>
                <li>• YOLO12</li>
              </ul>
            </Card>
          </div>
        </div>
      </main>

      <TrainingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStartTraining={handleStartTraining}
      />
    </div>
  )
}

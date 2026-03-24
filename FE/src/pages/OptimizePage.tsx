import { useState, useEffect, useRef } from "react"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Zap, Play, CheckCircle2, Clock, XCircle, Download,
  FileBox, Cpu,
} from "lucide-react"
import { OptimizationModal, type OptimizationConfig } from "@/components/optimization-modal"

type OptStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"

interface OptJob {
  optId: number
  trainingJobId: number
  sourceModelName: string | null
  datasetName: string | null
  versionTag: string | null
  format: "ONNX" | "ENGINE"
  imgSize: number
  halfPrecision: boolean
  dynamic: boolean
  simplify: boolean
  opset: number
  workspace: number
  status: OptStatus
  progress: number
  outputFilename: string | null
  outputSizeMb: number | null
  errorMsg: string | null
  createdAt: string
}

const PAGE_SIZE = 5

export default function OptimizePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [jobs, setJobs] = useState<OptJob[]>([])
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
        const active = jobs.filter((j) => j.status === "PENDING" || j.status === "RUNNING")
        for (const j of active) await pollJob(j.optId)
      }, 3000)
    } else if (!hasActive && pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null } }
  }, [jobs])

  const fetchMyJobs = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/optimization/list", {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!res.ok) return
      setJobs(await res.json())
    } catch {}
  }

  const pollJob = async (optId: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/optimization/${optId}/status`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!res.ok) return
      const updated: OptJob = await res.json()
      setJobs((prev) => prev.map((j) => j.optId === updated.optId ? updated : j))
    } catch {}
  }

  const handleStart = async (config: OptimizationConfig) => {
    try {
      const res = await fetch("http://localhost:8080/api/optimization/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          trainingJobId: config.trainingJobId,
          format: config.format,
          imgSize: config.imgSize,
          halfPrecision: config.halfPrecision,
          dynamic: config.dynamic,
          simplify: config.simplify,
          opset: config.opset,
          workspace: config.workspace,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const job: OptJob = await res.json()
      setJobs((prev) => [job, ...prev])
      setPage(1)
    } catch (e) {
      alert(e instanceof Error ? e.message : "경량화 시작 실패")
    }
  }

  const handleDownload = (optId: number, filename: string) => {
    const a = document.createElement("a")
    a.href = `http://localhost:8080/api/optimization/${optId}/download`
    a.download = filename
    a.click()
  }

  const completedJobs = jobs.filter((j) => j.status === "COMPLETED")

  const statusBadge = (status: OptStatus) => {
    const map: Record<OptStatus, { label: string; cls: string; icon: JSX.Element }> = {
      PENDING:   { label: "대기 중", cls: "bg-blue-500/15 text-blue-400",       icon: <Clock className="w-3 h-3" /> },
      RUNNING:   { label: "변환 중", cls: "bg-yellow-500/15 text-yellow-400",   icon: <Clock className="w-3 h-3 animate-spin" /> },
      COMPLETED: { label: "완료",    cls: "bg-green-500/15 text-green-400",     icon: <CheckCircle2 className="w-3 h-3" /> },
      FAILED:    { label: "실패",    cls: "bg-destructive/15 text-destructive",  icon: <XCircle className="w-3 h-3" /> },
    }
    const { label, cls, icon } = map[status]
    return (
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${cls}`}>
        {icon}{label}
      </span>
    )
  }

  const formatBadge = (fmt: "ONNX" | "ENGINE") =>
    fmt === "ONNX"
      ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">ONNX</span>
      : <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">TensorRT</span>

  const pagedJobs = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(jobs.length / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Zap className="w-8 h-8 text-yellow-400" />
              Optimize Models
            </h1>
            <p className="text-muted-foreground">학습된 모델을 ONNX 또는 TensorRT Engine으로 경량화하세요.</p>
          </div>
          <Button
            className="gap-2 bg-yellow-500 hover:bg-yellow-500/80 text-black font-semibold"
            onClick={() => setIsModalOpen(true)}
          >
            <Play className="w-4 h-4" />
            New Optimization
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* 메인 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 통계 */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="text-xs text-muted-foreground mb-1">총 경량화</div>
                <div className="text-2xl font-bold">{jobs.length}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground mb-1">완료</div>
                <div className="text-2xl font-bold text-green-400">{completedJobs.length}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground mb-1">실패</div>
                <div className="text-2xl font-bold text-destructive">
                  {jobs.filter((j) => j.status === "FAILED").length}
                </div>
              </Card>
            </div>

            {jobs.length === 0 ? (
              <Card className="p-12 flex flex-col items-center justify-center border-2 border-dashed">
                <Zap className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">경량화 기록이 없습니다</h2>
                <p className="text-muted-foreground mb-6 text-center max-w-md">
                  학습 완료 모델을 ONNX 또는 TensorRT Engine으로 변환하세요.
                </p>
                <Button
                  className="gap-2 bg-yellow-500 hover:bg-yellow-500/80 text-black font-semibold"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Play className="w-4 h-4" />
                  Start Optimization
                </Button>
              </Card>
            ) : (
              <>
                {pagedJobs.map((job) => (
                  <Card key={job.optId} className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {job.sourceModelName ?? `Job #${job.trainingJobId}`}
                          </span>
                          {formatBadge(job.format)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          imgSize: {job.imgSize} · FP16: {job.halfPrecision ? "✓" : "✗"}
                          {job.format === "ONNX"
                            ? ` · dynamic: ${job.dynamic ? "✓" : "✗"} · opset: ${job.opset}`
                            : ` · workspace: ${job.workspace}GB`}
                        </div>
                        <div className="text-xs text-muted-foreground">{job.createdAt?.slice(0, 19).replace("T", " ")}</div>
                      </div>
                      {statusBadge(job.status)}
                    </div>

                    {/* 진행률 */}
                    {(job.status === "PENDING" || job.status === "RUNNING") && (
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>변환 중...</span><span>{job.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 transition-all duration-500"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* 완료 결과 */}
                    {job.status === "COMPLETED" && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-green-950/30 border border-green-800/50 rounded-lg p-3 text-sm">
                          <div className="text-xs text-muted-foreground mb-0.5">출력 파일</div>
                          <div className="font-mono text-xs text-green-300 truncate">
                            {job.outputFilename ?? "완료"}
                          </div>
                          {job.outputSizeMb != null && (
                            <div className="text-xs text-muted-foreground mt-0.5">{job.outputSizeMb} MB</div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="gap-1.5 bg-green-600 hover:bg-green-600/80 text-white shrink-0"
                          onClick={() => handleDownload(job.optId, job.outputFilename ?? "model")}
                        >
                          <Download className="w-3.5 h-3.5" />
                          다운로드
                        </Button>
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
                        className={`px-3 py-1.5 text-sm rounded border transition-colors ${page === i + 1 ? "bg-yellow-500 text-black border-yellow-500" : "border-border hover:bg-muted"}`}>
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
            <Card className="p-6 border-l-4 border-l-yellow-400">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <FileBox className="w-4 h-4 text-yellow-400" />
                지원 포맷
              </h4>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-semibold text-blue-300">ONNX</div>
                  <p className="text-xs text-muted-foreground">범용 포맷. CPU/GPU 모두 사용 가능. 다양한 프레임워크와 호환.</p>
                </div>
                <div>
                  <div className="font-semibold text-purple-300">TensorRT Engine</div>
                  <p className="text-xs text-muted-foreground">NVIDIA 전용. 가장 빠른 추론. GPU 필수, 장치 고정 파일.</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                최적화 팁
              </h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>• FP16 활성화 시 크기 약 50% 절감</li>
                <li>• ONNX Simplify는 거의 항상 권장</li>
                <li>• Dynamic Shape는 배치 크기 유동적 필요 시</li>
                <li>• TensorRT는 변환 시간이 길지만 추론이 가장 빠름</li>
                <li>• Opset 12+ 권장 (최신 연산자 지원)</li>
              </ul>
            </Card>
          </div>
        </div>
      </main>

      <OptimizationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStart={handleStart}
      />
    </div>
  )
}

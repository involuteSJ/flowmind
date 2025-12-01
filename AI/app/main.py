# app/main.py
from fastapi import FastAPI, BackgroundTasks, HTTPException
import httpx
import traceback

from app.schemas import TrainJobRequest
from app.trainer.yolo_trainer import train_yolo

app = FastAPI(title="Flowmind GPU Training Server")


@app.get("/health")
def health():
    return {"status": "ok"}


async def _notify_backend(callback_url: str, payload: dict):
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.post(callback_url, json=payload)
        except Exception:
            # 로그만 남기고 끝 (실서비스면 retry/queue 고려)
            print("[ERROR] callback failed:")
            traceback.print_exc()


def _run_training(job: TrainJobRequest):
    """
    동기 함수: 실제 학습 수행.
    FastAPI BackgroundTasks에서 이 함수를 백그라운드로 호출.
    """
    try:
        best_model_path, metrics = train_yolo(job)

        payload = {
            "jobId": job.jobId,
            "status": "SUCCESS",
            "resultModelPath": best_model_path,
            "errorMessage": None,
            # 필요하면 metrics도 추가 가능
            # "metrics": metrics,
        }
    except Exception as e:
        payload = {
            "jobId": job.jobId,
            "status": "FAILED",
            "resultModelPath": None,
            "errorMessage": f"{e.__class__.__name__}: {e}",
        }

    # 비동기로 콜백 요청
    import anyio
    anyio.run(_notify_backend, job.callbackUrl, payload)


@app.post("/train/start")
def start_train(req: TrainJobRequest, background_tasks: BackgroundTasks):
    """
    학습 요청 엔드포인트.
    - 즉시 200 OK와 함께 "job accepted" 응답
    - 실제 학습은 백그라운드에서 실행
    """
    # 간단한 유효성 검사 예시
    if req.hyperparams.epochs <= 0:
        raise HTTPException(status_code=400, detail="epochs must be > 0")

    # 여기서 jobId 기준으로 중복 학습 방지 등을 체크하려면
    # Redis나 간단한 in-memory 맵을 두거나, 그냥 BE에서 제어해도 됨.

    background_tasks.add_task(_run_training, req)

    return {
        "message": "training started",
        "jobId": req.jobId,
    }

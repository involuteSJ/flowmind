from fastapi import APIRouter, BackgroundTasks
from schemas.train_schema import TrainRequest, TrainStartResponse
from services.train_service import run_training

router = APIRouter()


@router.post("/train", response_model=TrainStartResponse)
async def start_train(req: TrainRequest, background_tasks: BackgroundTasks):
    """BE로부터 학습 요청을 받아 BackgroundTask로 실행"""
    background_tasks.add_task(run_training, req)
    return TrainStartResponse(jobId=req.jobId, status="RUNNING")

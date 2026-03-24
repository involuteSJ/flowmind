from fastapi import APIRouter, BackgroundTasks
from schemas.eval_schema import EvaluateRequest, EvaluateResponse
from services.eval_service import run_evaluation

router = APIRouter()


@router.post("/evaluate", response_model=EvaluateResponse)
async def start_evaluate(req: EvaluateRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_evaluation, req)
    return EvaluateResponse(evalId=req.evalId, status="RUNNING")

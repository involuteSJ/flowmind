from fastapi import APIRouter, BackgroundTasks
from schemas.opt_schema import OptimizeRequest, OptimizeResponse
from services.opt_service import run_optimization

router = APIRouter()


@router.post("/optimize", response_model=OptimizeResponse)
async def start_optimize(req: OptimizeRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_optimization, req)
    return OptimizeResponse(optId=req.optId, status="RUNNING")

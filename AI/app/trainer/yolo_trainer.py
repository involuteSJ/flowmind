# app/trainer/yolo_trainer.py
import os
from pathlib import Path
from typing import Tuple

from ultralytics import YOLO

from app.schemas import TrainJobRequest
from app.config import settings


def _resolve_yolo_checkpoint(model_base: str, size: str) -> str:
    """
    예:
      base="yolov8", size="n" -> "yolov8n.pt"
      base="yolo11", size="s" -> "yolo11s.pt"
    """
    return f"{model_base}{size}.pt"


def _resolve_dataset_yaml(dataset_id: int, dataset_version: str) -> str:
    """
    BE에서 데이터셋을 버전별로 생성해두고,
    GPU 서버에서는 그 경로 규칙만 알면 됨.
    예: /data/datasets/{dataset_id}/{dataset_version}/data.yaml
    """
    return str(
        Path(settings.DATASET_ROOT) / str(dataset_id) / dataset_version / "data.yaml"
    )


def _resolve_output_dir(job_id: int) -> Path:
    """
    YOLO 학습 결과를 저장할 디렉토리
    """
    out_dir = Path(settings.MODEL_ROOT) / "yolo" / f"job-{job_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir


def train_yolo(job: TrainJobRequest) -> Tuple[str, dict]:
    """
    실제 YOLO 학습을 실행하고,
    (best_model_path, metrics dict)를 리턴
    """
    ckpt = _resolve_yolo_checkpoint(job.model.base, job.model.size)
    data_yaml = _resolve_dataset_yaml(job.datasetId, job.datasetVersion)
    out_dir = _resolve_output_dir(job.jobId)

    model = YOLO(ckpt)

    results = model.train(
        data=data_yaml,
        epochs=job.hyperparams.epochs,
        batch=job.hyperparams.batchSize,
        lr0=job.hyperparams.learningRate,
        optimizer=job.hyperparams.optimizer.lower(),
        project=str(out_dir),
        name="exp",
        exist_ok=True,
    )

    # ultralytics 결과에서 best 모델 경로 가져오기
    best_path = str(Path(results.save_dir) / "weights" / "best.pt")

    metrics = {
        "metrics": getattr(results, "results_dict", {}),
    }

    return best_path, metrics

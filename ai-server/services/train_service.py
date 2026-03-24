import os
from pathlib import Path

import httpx
from ultralytics import YOLO

from config import settings
from schemas.train_schema import TrainRequest
from services.dataset_builder import build_yolo_dataset, cleanup_dataset


# YOLO 모델 가중치 매핑 (modelType + modelSize)
MODEL_WEIGHTS = {
    ("yolov8", "n"): "yolov8n.pt",
    ("yolov8", "s"): "yolov8s.pt",
    ("yolov8", "m"): "yolov8m.pt",
    ("yolov8", "l"): "yolov8l.pt",
    ("yolov8", "x"): "yolov8x.pt",
    ("yolo11", "n"): "yolo11n.pt",
    ("yolo11", "s"): "yolo11s.pt",
    ("yolo11", "m"): "yolo11m.pt",
    ("yolo11", "l"): "yolo11l.pt",
    ("yolo11", "x"): "yolo11x.pt",
    ("yolo12", "n"): "yolo12n.pt",
    ("yolo12", "s"): "yolo12s.pt",
    ("yolo12", "m"): "yolo12m.pt",
    ("yolo12", "l"): "yolo12l.pt",
    ("yolo12", "x"): "yolo12x.pt",
}


def _callback_progress(be_callback_url: str, job_id: int, progress: int):
    try:
        with httpx.Client(timeout=5) as client:
            client.post(f"{be_callback_url}/{job_id}/progress", json={"progress": progress})
    except Exception as e:
        print(f"[callback] progress 전송 실패: {e}")


def _callback_complete(be_callback_url: str, job_id: int, model_path: str):
    try:
        with httpx.Client(timeout=5) as client:
            client.post(f"{be_callback_url}/{job_id}/complete", json={"modelPath": model_path})
    except Exception as e:
        print(f"[callback] complete 전송 실패: {e}")


def _callback_fail(be_callback_url: str, job_id: int, error_msg: str):
    try:
        with httpx.Client(timeout=5) as client:
            client.post(f"{be_callback_url}/{job_id}/fail", json={"errorMsg": error_msg})
    except Exception as e:
        print(f"[callback] fail 전송 실패: {e}")


def run_training(req: TrainRequest):
    """BackgroundTask로 실행되는 YOLO 학습 함수"""
    job_id = req.jobId
    be_url = req.beCallbackUrl
    temp_base = settings.temp_dataset_path

    print(f"[train] Job {job_id} 시작 — 모델: {req.modelType}, epochs: {req.epochs}")

    try:
        # 1. YOLO 데이터셋 폴더 구성
        _callback_progress(be_url, job_id, 5)
        yaml_path = build_yolo_dataset(job_id, req.assets, temp_base)
        print(f"[train] 데이터셋 빌드 완료: {yaml_path}")

        # 2. 모델 출력 경로
        output_dir = Path(req.modelOutputPath) / str(job_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        # 3. 가중치 선택
        size = getattr(req, "modelSize", "n") or "n"
        weights = MODEL_WEIGHTS.get((req.modelType, size), f"{req.modelType}{size}.pt")
        print(f"[train] 가중치: {weights}")
        model = YOLO(weights)

        # 4. 진행률 콜백 (epoch마다 호출)
        def on_train_epoch_end(trainer):
            epoch = trainer.epoch + 1
            total = trainer.args.epochs  # trainer.epochs → trainer.args.epochs
            progress = int(10 + (epoch / total) * 85)  # 10~95%
            print(f"[train] Job {job_id} epoch {epoch}/{total} — {progress}%")
            _callback_progress(be_url, job_id, progress)

        model.add_callback("on_train_epoch_end", on_train_epoch_end)

        # 5. 학습 실행
        _callback_progress(be_url, job_id, 10)
        # ultralytics optimizer 이름 정규화 (첫 글자 대문자)
        optimizer_map = {
            "adam": "Adam",
            "adamw": "AdamW",
            "nadam": "NAdam",
            "radam": "RAdam",
            "rmsprop": "RMSProp",
            "sgd": "SGD",
            "auto": "auto",
        }
        optimizer_name = optimizer_map.get(req.optimizer.lower(), "Adam")

        results = model.train(
            data=yaml_path,
            epochs=req.epochs,
            batch=req.batchSize,
            lr0=req.learningRate,
            optimizer=optimizer_name,
            project=str(output_dir),
            name="train",
            exist_ok=True,
            verbose=True,
        )

        # 6. best.pt 경로
        best_pt = output_dir / "train" / "weights" / "best.pt"
        model_path = str(best_pt) if best_pt.exists() else str(output_dir)

        print(f"[train] Job {job_id} 완료 — 모델: {model_path}")
        _callback_complete(be_url, job_id, model_path)

    except Exception as e:
        print(f"[train] Job {job_id} 실패: {e}")
        _callback_fail(be_url, job_id, str(e))

    finally:
        # 7. 임시 데이터 정리
        cleanup_dataset(job_id, temp_base)
        print(f"[train] Job {job_id} 임시 데이터 삭제 완료")

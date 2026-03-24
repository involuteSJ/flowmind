import random
from pathlib import Path

import httpx
from ultralytics import YOLO

from config import settings
from schemas.eval_schema import EvaluateRequest
from services.dataset_builder import build_yolo_dataset, cleanup_dataset


def _callback_progress(be_url: str, eval_id: int, progress: int):
    try:
        with httpx.Client(timeout=5) as client:
            client.post(f"{be_url}/{eval_id}/progress", json={"progress": progress})
    except Exception as e:
        print(f"[eval callback] progress 전송 실패: {e}")


def _callback_complete(be_url: str, eval_id: int, metrics: dict):
    try:
        with httpx.Client(timeout=5) as client:
            client.post(f"{be_url}/{eval_id}/complete", json=metrics)
    except Exception as e:
        print(f"[eval callback] complete 전송 실패: {e}")


def _callback_fail(be_url: str, eval_id: int, error_msg: str):
    try:
        with httpx.Client(timeout=5) as client:
            client.post(f"{be_url}/{eval_id}/fail", json={"errorMsg": error_msg})
    except Exception as e:
        print(f"[eval callback] fail 전송 실패: {e}")


def run_evaluation(req: EvaluateRequest):
    """BackgroundTask로 실행되는 YOLO 평가 함수"""
    eval_id = req.evalId
    be_url = req.beCallbackUrl
    temp_base = settings.temp_dataset_path

    print(f"[eval] EvalJob {eval_id} 시작 — 모델: {req.modelPath}")

    try:
        _callback_progress(be_url, eval_id, 10)

        # 데이터셋 빌드 (val 폴더에 testSplit% 비율로)
        # build_yolo_dataset은 80/20 고정이므로 testSplit은 val 비율로 사용
        yaml_path = build_yolo_dataset(
            job_id=f"eval_{eval_id}",
            assets=req.assets,
            temp_base=temp_base,
            val_ratio=req.testSplit / 100.0
        )
        print(f"[eval] 데이터셋 빌드 완료: {yaml_path}")

        _callback_progress(be_url, eval_id, 30)

        model_path = Path(req.modelPath)
        if not model_path.exists():
            raise FileNotFoundError(f"모델 파일 없음: {req.modelPath}")

        model = YOLO(str(model_path))

        _callback_progress(be_url, eval_id, 50)

        results = model.val(data=yaml_path, verbose=False)

        _callback_progress(be_url, eval_id, 90)

        # 메트릭 추출
        precision = float(results.box.mp) if hasattr(results, 'box') else 0.0
        recall    = float(results.box.mr) if hasattr(results, 'box') else 0.0
        map50     = float(results.box.map50) if hasattr(results, 'box') else 0.0
        map5095   = float(results.box.map) if hasattr(results, 'box') else 0.0

        print(f"[eval] EvalJob {eval_id} 완료 — P:{precision:.3f} R:{recall:.3f} mAP50:{map50:.3f}")
        _callback_complete(be_url, eval_id, {
            "precision": round(precision * 100, 2),
            "recall":    round(recall * 100, 2),
            "map50":     round(map50 * 100, 2),
            "map5095":   round(map5095 * 100, 2),
        })

    except Exception as e:
        print(f"[eval] EvalJob {eval_id} 실패: {e}")
        _callback_fail(be_url, eval_id, str(e))

    finally:
        cleanup_dataset(f"eval_{eval_id}", temp_base)
        print(f"[eval] EvalJob {eval_id} 임시 데이터 삭제 완료")

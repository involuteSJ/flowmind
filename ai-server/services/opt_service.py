import os
import re
from pathlib import Path

import httpx
from ultralytics import YOLO

from schemas.opt_schema import OptimizeRequest


def _post(url: str, payload: dict):
    try:
        with httpx.Client(timeout=10) as client:
            client.post(url, json=payload)
    except Exception as e:
        print(f"[opt callback] 전송 실패 ({url}): {e}")


def run_optimization(req: OptimizeRequest):
    opt_id = req.optId
    be_url = req.beCallbackUrl
    fmt = req.format.lower()

    print(f"[opt] OptJob {opt_id} 시작 — format: {fmt}, model: {req.modelPath}")

    try:
        _post(f"{be_url}/{opt_id}/progress", {"progress": 10})

        model_path = Path(req.modelPath)
        if not model_path.exists():
            raise FileNotFoundError(f"모델 파일 없음: {req.modelPath}")

        output_dir = Path(req.outputDir)
        output_dir.mkdir(parents=True, exist_ok=True)

        model = YOLO(str(model_path))

        _post(f"{be_url}/{opt_id}/progress", {"progress": 30})

        import torch
        device = "0" if torch.cuda.is_available() else "cpu"

        if fmt == "engine" and device == "cpu":
            raise RuntimeError("TensorRT Engine은 CUDA GPU가 필요합니다. ONNX 포맷을 사용하세요.")

        export_kwargs = {
            "imgsz": req.imgSize,
            "half": req.halfPrecision and torch.cuda.is_available(),
            "device": device,
        }

        if fmt == "onnx":
            export_kwargs.update({
                "format": "onnx",
                "dynamic": req.dynamic,
                "simplify": req.simplify,
                "opset": req.opset,
            })
        elif fmt == "engine":
            export_kwargs.update({
                "format": "engine",
                "workspace": req.workspace,
            })
        else:
            raise ValueError(f"지원하지 않는 형식: {fmt}")

        _post(f"{be_url}/{opt_id}/progress", {"progress": 50})

        # ultralytics export — 결과 파일은 원본 모델과 같은 폴더에 생성됨
        exported_path = model.export(**export_kwargs)
        exported_path = Path(exported_path)

        _post(f"{be_url}/{opt_id}/progress", {"progress": 80})

        # 출력 디렉터리로 이동 + 고유 파일명 부여
        ext = ".onnx" if fmt == "onnx" else ".engine"
        # 파일명: {modelLabel}_{imgSize}fp16{ext} 형태, 특수문자 제거
        safe_label = re.sub(r"[^\w\-]", "_", req.modelLabel)
        fp_suffix = "_fp16" if (req.halfPrecision and torch.cuda.is_available()) else ""
        dest_name = f"{safe_label}_{req.imgSize}{fp_suffix}{ext}"
        dest = output_dir / dest_name
        if exported_path.resolve() != dest.resolve():
            if dest.exists():
                dest.unlink()
            exported_path.rename(dest)

        size_mb = round(dest.stat().st_size / (1024 * 1024), 2)

        print(f"[opt] OptJob {opt_id} 완료 — {dest} ({size_mb} MB)")
        _post(f"{be_url}/{opt_id}/complete", {
            "outputPath": str(dest),
            "outputSizeMb": size_mb,
        })

    except Exception as e:
        print(f"[opt] OptJob {opt_id} 실패: {e}")
        _post(f"{be_url}/{opt_id}/fail", {"errorMsg": str(e)})

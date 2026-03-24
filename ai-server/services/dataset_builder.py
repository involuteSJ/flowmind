import os
import shutil
import random
from pathlib import Path
from typing import List, Dict

import yaml

from schemas.train_schema import AssetItem


def build_yolo_dataset(job_id, assets: List[AssetItem], temp_base: str, val_ratio: float = 0.2) -> str:
    """
    YOLO 학습용 폴더 구조 생성 후 data.yaml 경로 반환.

    temp_base/{job_id}/
      images/train/, images/val/
      labels/train/, labels/val/
      data.yaml
    """
    job_dir = Path(temp_base) / str(job_id)
    for split in ["train", "val"]:
        (job_dir / "images" / split).mkdir(parents=True, exist_ok=True)
        (job_dir / "labels" / split).mkdir(parents=True, exist_ok=True)

    # 어노테이션이 있는 에셋만 사용
    annotated = [a for a in assets if a.annotations]
    if not annotated:
        annotated = assets  # 어노테이션 없어도 일단 진행

    random.shuffle(annotated)
    split_idx = int(len(annotated) * (1 - val_ratio))
    train_assets = annotated[:split_idx] if split_idx > 0 else annotated
    val_assets = annotated[split_idx:] if split_idx < len(annotated) else annotated[:1]

    # 클래스 맵 (classId → className, 정렬된 고유 목록)
    class_map: Dict[int, str] = {}
    for asset in assets:
        for ann in asset.annotations:
            class_map[ann.classId] = ann.className
    sorted_classes = [class_map[cid] for cid in sorted(class_map.keys())]
    # classId → YOLO index 매핑
    class_id_to_idx = {cid: idx for idx, cid in enumerate(sorted(class_map.keys()))}

    def copy_asset(asset: AssetItem, split: str):
        src = Path(asset.storagePath)
        if not src.exists():
            return

        # 이미지 복사
        dst_img = job_dir / "images" / split / asset.filename
        shutil.copy2(src, dst_img)

        # 라벨 .txt 생성
        label_name = Path(asset.filename).stem + ".txt"
        dst_label = job_dir / "labels" / split / label_name
        lines = []
        for ann in asset.annotations:
            idx = class_id_to_idx.get(ann.classId, 0)
            lines.append(f"{idx} {ann.xCenter:.6f} {ann.yCenter:.6f} {ann.width:.6f} {ann.height:.6f}")
        dst_label.write_text("\n".join(lines))

    for asset in train_assets:
        copy_asset(asset, "train")
    for asset in val_assets:
        copy_asset(asset, "val")

    # data.yaml
    data_yaml = {
        "path": str(job_dir.resolve()),
        "train": "images/train",
        "val": "images/val",
        "nc": len(sorted_classes),
        "names": sorted_classes,
    }
    yaml_path = job_dir / "data.yaml"
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(data_yaml, f, allow_unicode=True)

    return str(yaml_path)


def cleanup_dataset(job_id, temp_base: str):
    job_dir = Path(temp_base) / str(job_id)
    if job_dir.exists():
        shutil.rmtree(job_dir)

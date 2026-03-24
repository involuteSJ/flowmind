from typing import List, Optional
from pydantic import BaseModel


class AnnotationItem(BaseModel):
    classId: int
    className: str
    xCenter: float
    yCenter: float
    width: float
    height: float


class AssetItem(BaseModel):
    assetId: int
    filename: str
    storagePath: str
    annotations: List[AnnotationItem] = []


class TrainRequest(BaseModel):
    jobId: int
    datasetVersionId: int
    datasetRootPath: str
    modelOutputPath: str
    beCallbackUrl: str
    modelType: str          # yolov8 | yolo11 | yolo12
    modelSize: str = "n"   # n | s | m | l | x
    epochs: int
    batchSize: int
    learningRate: float
    optimizer: str
    assets: List[AssetItem]


class TrainStartResponse(BaseModel):
    jobId: int
    status: str

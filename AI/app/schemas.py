# app/schemas.py
from pydantic import BaseModel, AnyHttpUrl


class ModelSpec(BaseModel):
    type: str        # "object-detection"
    base: str        # "yolov8", "yolo11", ...
    size: str        # "n", "s", "m", "l", "x"


class Hyperparams(BaseModel):
    epochs: int
    batchSize: int
    learningRate: float
    optimizer: str   # "SGD", "Adam" 등


class TrainJobRequest(BaseModel):
    # BE가 TrainJob 저장 후 넘겨주는 PK
    jobId: int

    # BE의 TrainRequest와 동일한 부분
    datasetId: int
    datasetVersion: str
    model: ModelSpec
    hyperparams: Hyperparams

    # GPU가 학습 완료 후 콜백할 주소
    callbackUrl: AnyHttpUrl

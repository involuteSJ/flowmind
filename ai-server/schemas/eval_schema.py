from typing import List, Optional
from pydantic import BaseModel
from schemas.train_schema import AnnotationItem, AssetItem


class EvaluateRequest(BaseModel):
    evalId: int
    modelPath: str
    testSplit: int = 20
    beCallbackUrl: str
    assets: List[AssetItem]


class EvaluateResponse(BaseModel):
    evalId: int
    status: str

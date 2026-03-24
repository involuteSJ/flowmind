from pydantic import BaseModel


class OptimizeRequest(BaseModel):
    optId: int
    modelPath: str
    modelLabel: str      # {datasetName}_{versionTag}_v{modelVersion} 형태
    format: str          # "onnx" | "engine"
    imgSize: int = 640
    halfPrecision: bool = False
    # ONNX
    dynamic: bool = False
    simplify: bool = True
    opset: int = 12
    # ENGINE (TensorRT)
    workspace: int = 4
    outputDir: str
    beCallbackUrl: str


class OptimizeResponse(BaseModel):
    optId: int
    status: str

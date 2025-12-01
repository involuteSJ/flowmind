# app/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # YOLO 학습에 사용할 데이터셋 루트 경로
    DATASET_ROOT: str = "/data/datasets"

    # 모델 아티팩트 저장 루트
    MODEL_ROOT: str = "/data/models"

    # BE에서 보낸 콜백 URL을 그대로 쓸 수도 있지만,
    # 공통 prefix가 있다면 이렇게 둘 수 있음
    BACKEND_API_KEY: str = "CHANGE_ME"  # GPU -> BE 콜백 인증용 shared secret

    class Config:
        env_file = ".env"

settings = Settings()

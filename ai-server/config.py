from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ai_server_host: str = "0.0.0.0"
    ai_server_port: int = 8000
    be_base_url: str = "http://localhost:8080"
    model_output_path: str = "C:/AI/coding/flowmind/models"
    temp_dataset_path: str = "C:/AI/coding/flowmind/ai-server/temp"

    class Config:
        env_file = ".env"

settings = Settings()

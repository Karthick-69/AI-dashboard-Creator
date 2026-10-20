import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Automated Data Analysis & Customizable Dashboard Generator"
    API_V1_STR: str = "/api"
    
    # AI Provider Settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    
    # File upload limits
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: list[str] = [".csv", ".xlsx", ".xls", ".json"]
    
    # Storage paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    TEMP_STORAGE_DIR: Path = BASE_DIR / "temp_storage"
    SAMPLE_DATA_DIR: Path = BASE_DIR.parent / "sample_data"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
settings.TEMP_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

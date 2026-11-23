from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    MPESA_CONSUMER_KEY: str
    MPESA_CONSUMER_SECRET: str
    MPESA_ENV: str
    MPESA_B2C_SHORTCODE: str
    MPESA_INITIATOR_NAME: str
    MPESA_SECURITY_CREDENTIAL: str
    MPESA_RESULT_URL: str
    MPESA_TIMEOUT_URL: str

    class Config:
        env_file = BASE_DIR / ".env"  # absolute path
        env_file_encoding = "utf-8"
        extra = "allow"

settings = Settings()

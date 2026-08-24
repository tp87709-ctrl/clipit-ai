"""Application configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Clipit.ai"
    app_env: str = "development"

    host: str = "0.0.0.0"
    port: int = 8000
    frontend_url: str = "http://localhost:3000"

    database_path: str = "data/clipit.db"
    media_root: str = "media"

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    whisper_model: str = "base"
    ffmpeg_path: str = "ffmpeg"


def get_settings() -> Settings:
    return Settings()

"""
Application configuration settings
"""

import json
import secrets
from typing import List, Optional
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Application
    APP_NAME: str = "Snag-to-Spec"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/snagtospec"

    # Security — no default; must always be set via env
    SECRET_KEY: str = ""
    API_KEY: str = ""
    DEFAULT_USER_ID: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ALLOWED_HOSTS: List[str] | str = Field(
        default_factory=lambda: ["localhost", "127.0.0.1", "*.vercel.app", "*.onrender.com"]
    )

    # CORS
    CORS_ORIGINS: List[str] | str = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:5173"]
    )

    # OpenAI
    OPENAI_API_KEY: str = ""

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("[") and value.endswith("]"):
                return json.loads(value)
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("ALLOWED_HOSTS", mode="before")
    @classmethod
    def parse_allowed_hosts(cls, value):
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("[") and value.endswith("]"):
                return json.loads(value)
            return [host.strip() for host in value.split(",") if host.strip()]
        return value

    @model_validator(mode="after")
    def validate_security_requirements(self):
        # In DEBUG mode, auto-generate a SECRET_KEY if missing so devs can start fast
        if not self.SECRET_KEY:
            if self.DEBUG:
                self.SECRET_KEY = secrets.token_urlsafe(48)
            else:
                raise ValueError(
                    "SECRET_KEY must be set via environment variable when DEBUG is False"
                )

        if not self.DEBUG:
            if not self.API_KEY:
                raise ValueError("API_KEY must be configured when DEBUG is False")
        return self

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

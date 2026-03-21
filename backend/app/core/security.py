"""
Lightweight request security guards.
"""

from fastapi import Header, HTTPException, status
from app.core.config import settings


def require_api_key(x_api_key: str | None = Header(default=None)):
    """
    Require API key for write operations when API_KEY is configured.
    This is a secondary guard alongside JWT auth for backwards compatibility.
    """
    if not settings.API_KEY:
        return

    if x_api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

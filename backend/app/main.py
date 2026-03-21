"""
Snag-to-Spec Backend Main Application
FastAPI application entry point
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.database import get_db
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


# FIX #13 MEDIUM: Simple in-memory rate limiting middleware
class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Basic sliding-window rate limiter for write endpoints.
    Limits POST/PATCH/PUT/DELETE to 60 requests per minute per IP.
    """

    def __init__(self, app, max_requests: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = {}

    async def dispatch(self, request: Request, call_next):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return await call_next(request)

        import time

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - self.window_seconds

        # Clean old entries
        timestamps = self._requests.get(client_ip, [])
        timestamps = [t for t in timestamps if t > window_start]

        if len(timestamps) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."},
            )

        timestamps.append(now)
        self._requests[client_ip] = timestamps
        return await call_next(request)


app = FastAPI(
    title="Snag-to-Spec API",
    description="AI-powered contract intelligence platform for construction defects",
    version="1.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=60, window_seconds=60)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint"""
    return JSONResponse(
        content={
            "message": "Snag-to-Spec API",
            "version": "1.1.0",
            "docs": "/api/docs",
        }
    )


@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    FIX #9: Verifies database connectivity with a simple query.
    """
    try:
        db = next(get_db())
        try:
            db.execute("SELECT 1")
            db_status = "connected"
        except Exception as exc:
            logger.warning("Health check DB query failed: %s", exc)
            db_status = "disconnected"
        finally:
            db.close()
    except Exception as exc:
        logger.warning("Health check could not obtain DB session: %s", exc)
        db_status = "unavailable"

    is_healthy = db_status == "connected"
    status_code = 200 if is_healthy else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if is_healthy else "degraded",
            "database": db_status,
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

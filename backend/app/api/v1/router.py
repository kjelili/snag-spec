"""
Main API router
"""

from fastapi import APIRouter
from app.api.v1 import snags, instructions, auth

api_router = APIRouter()

# Auth routes (no API key required)
api_router.include_router(auth.router)

# Resource routes
api_router.include_router(snags.router)
api_router.include_router(instructions.router)


@api_router.get("/test")
async def test_endpoint():
    """Test endpoint"""
    return {"message": "API v1 is working"}

from fastapi import APIRouter
from app.routers import video
from app.routers import manuals

api_router = APIRouter()

api_router.include_router(video.router, tags=["video"])
api_router.include_router(manuals.router, tags=["manuals"])

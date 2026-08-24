"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import get_connection, initialize_database
from app.repositories.project_repository import ProjectRepository
from app.repositories.video_repository import VideoRepository
from app.api.projects import router as projects_router
from app.api.videos import router as videos_router
from app.services.project_service import ProjectService
from app.services.video_service import VideoService

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and wire up services
    initialize_database(settings.database_path)
    conn = get_connection(settings.database_path)

    project_repo = ProjectRepository(conn)
    project_service = ProjectService(project_repo)

    video_repo = VideoRepository(conn)
    video_service = VideoService(video_repo, project_repo)

    from app.api.projects import set_service as set_project_service
    from app.api.videos import set_service as set_video_service

    set_project_service(project_service)
    set_video_service(video_service)

    yield

    # Shutdown
    conn.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check() -> dict:
    return {
        "status": "healthy",
        "service": settings.app_name,
        "environment": settings.app_env,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


app.include_router(projects_router)
app.include_router(videos_router)

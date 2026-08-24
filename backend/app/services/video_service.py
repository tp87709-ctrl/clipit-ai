"""Video business logic — upload, validation, storage."""

import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.config import get_settings
from app.models.video import VideoListResponse, VideoResponse
from app.repositories.project_repository import ProjectRepository
from app.repositories.video_repository import VideoRepository

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}
MAX_FILE_SIZE_MB = 5000

# Project root: backend/app/services/video_service.py → 4 parents up
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class VideoService:
    """Orchestrates video upload, validation, and storage."""

    def __init__(self, video_repo: VideoRepository, project_repo: ProjectRepository):
        self.video_repo = video_repo
        self.project_repo = project_repo
        self.settings = get_settings()

    def _media_dir(self) -> Path:
        """Resolve media_root to an absolute path relative to the project root."""
        return (PROJECT_ROOT / self.settings.media_root).resolve()

    async def upload_video(self, project_id: str, file: UploadFile) -> VideoResponse:
        """Upload a video file, validate it, store it, and create a DB record."""
        # Verify project exists
        project = self.project_repo.get(project_id)
        if project is None:
            raise ValueError("Project not found")

        # Validate file extension
        original_name = file.filename or "unknown"
        ext = Path(original_name).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(
                f"Invalid file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )

        # Check file size via SpooledTemporaryFile without loading all into memory
        file.file.seek(0, 2)  # seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # seek back to start

        if file_size == 0:
            raise ValueError("File is empty")

        max_bytes = MAX_FILE_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise ValueError(f"File too large ({file_size} bytes). Max: {MAX_FILE_SIZE_MB} MB")

        # Generate safe filename and date-partitioned path
        video_id = str(uuid4())
        stored_name = f"{video_id}{ext}"

        now = datetime.now(timezone.utc)
        date_path = now.strftime("%Y/%m/%d")

        upload_dir = self._media_dir() / "uploads" / date_path
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_path = upload_dir / stored_name

        # Stream file to disk (never loads entire file into memory)
        with open(file_path, "wb") as out:
            shutil.copyfileobj(file.file, out)

        # Store path relative to project root
        relative_path = file_path.relative_to(PROJECT_ROOT).as_posix()

        # Create DB record
        return self.video_repo.create(
            video_id=video_id,
            project_id=project_id,
            original_filename=original_name,
            stored_filename=stored_name,
            file_path=relative_path,
            file_size=file_size,
            mime_type=file.content_type or "application/octet-stream",
        )

    def get_video(self, video_id: str) -> VideoResponse | None:
        """Get a video by ID."""
        return self.video_repo.get(video_id)

    def list_videos(self, project_id: str) -> VideoListResponse:
        """List all videos for a project."""
        videos, total = self.video_repo.list_by_project(project_id)
        return VideoListResponse(videos=videos, total=total)

    def delete_video(self, video_id: str) -> bool:
        """Delete a video record and its file. Returns True if deleted."""
        video = self.video_repo.get(video_id)
        if video is None:
            return False

        # Delete the stored file (resolve relative path from project root)
        full_path = (PROJECT_ROOT / video.file_path).resolve()
        if full_path.exists():
            full_path.unlink()

        # Delete the DB record
        return self.video_repo.delete(video_id)

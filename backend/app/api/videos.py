"""Video API routes."""

from fastapi import APIRouter, HTTPException, UploadFile

from app.services.video_service import VideoService

router = APIRouter(tags=["videos"])

# Service instance set by main.py after DB init
_service: VideoService | None = None


def set_service(service: VideoService) -> None:
    """Set the video service. Called by main.py on startup."""
    global _service
    _service = service


def _get_service() -> VideoService:
    if _service is None:
        raise RuntimeError("VideoService not initialized")
    return _service


@router.post("/api/projects/{project_id}/videos")
async def upload_video(project_id: str, file: UploadFile):
    """Upload a video file to a project."""
    service = _get_service()
    try:
        video = await service.upload_video(project_id, file)
        return video
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/projects/{project_id}/videos")
async def list_project_videos(project_id: str):
    """List all videos for a project."""
    service = _get_service()
    return service.list_videos(project_id)


@router.get("/api/videos/{video_id}")
async def get_video(video_id: str):
    """Get video details."""
    service = _get_service()
    video = service.get_video(video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.delete("/api/videos/{video_id}")
async def delete_video(video_id: str):
    """Delete a video record and its file."""
    service = _get_service()
    deleted = service.delete_video(video_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"deleted": True}

"""Video domain models."""

from pydantic import BaseModel


class VideoResponse(BaseModel):
    """Response model for a video."""
    id: str
    project_id: str
    original_filename: str
    stored_filename: str
    file_path: str
    file_size: int
    mime_type: str
    status: str
    created_at: str
    updated_at: str


class VideoListResponse(BaseModel):
    """Response model for video list."""
    videos: list[VideoResponse]
    total: int

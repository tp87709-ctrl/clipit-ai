"""Project domain models."""

from datetime import datetime
from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    """Request model for creating a project."""
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)


class ProjectUpdate(BaseModel):
    """Request model for updating a project."""
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    status: str | None = Field(default=None)


class ProjectResponse(BaseModel):
    """Response model for a project."""
    id: str
    name: str
    description: str
    status: str
    created_at: str
    updated_at: str


class ProjectListResponse(BaseModel):
    """Response model for project list."""
    projects: list[ProjectResponse]
    total: int

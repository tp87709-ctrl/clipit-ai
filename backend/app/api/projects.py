"""Project API routes."""

from fastapi import APIRouter, HTTPException, Query

from app.models.project import ProjectCreate, ProjectUpdate
from app.services.project_service import ProjectService

router = APIRouter(prefix="/api/projects", tags=["projects"])

# Service instance set by main.py after DB init
_service: ProjectService | None = None


def set_service(service: ProjectService) -> None:
    """Set the project service. Called by main.py on startup."""
    global _service
    _service = service


def _get_service() -> ProjectService:
    if _service is None:
        raise RuntimeError("ProjectService not initialized")
    return _service


@router.post("")
async def create_project(data: ProjectCreate):
    """Create a new project."""
    service = _get_service()
    project = service.create_project(data)
    return project


@router.get("")
async def list_projects(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
):
    """List all projects."""
    service = _get_service()
    return service.list_projects(offset, limit)


@router.get("/{project_id}")
async def get_project(project_id: str):
    """Get project details."""
    service = _get_service()
    project = service.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate):
    """Update a project."""
    service = _get_service()
    project = service.update_project(project_id, data)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project."""
    service = _get_service()
    deleted = service.delete_project(project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"deleted": True}

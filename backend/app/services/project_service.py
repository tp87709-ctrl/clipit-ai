"""Project business logic."""

from app.models.project import ProjectCreate, ProjectListResponse, ProjectResponse, ProjectUpdate
from app.repositories.project_repository import ProjectRepository


class ProjectService:
    """Orchestrates project operations."""

    def __init__(self, repository: ProjectRepository):
        self.repository = repository

    def create_project(self, data: ProjectCreate) -> ProjectResponse:
        """Create a new project."""
        return self.repository.create(data)

    def get_project(self, project_id: str) -> ProjectResponse | None:
        """Get a project by ID."""
        return self.repository.get(project_id)

    def list_projects(self, offset: int = 0, limit: int = 50) -> ProjectListResponse:
        """List projects with pagination."""
        projects, total = self.repository.list_all(offset, limit)
        return ProjectListResponse(projects=projects, total=total)

    def update_project(self, project_id: str, data: ProjectUpdate) -> ProjectResponse | None:
        """Update a project. Returns None if not found."""
        return self.repository.update(project_id, data)

    def delete_project(self, project_id: str) -> bool:
        """Delete a project. Returns True if deleted."""
        return self.repository.delete(project_id)

"""Project data access layer."""

import sqlite3
from datetime import datetime, timezone
from uuid import uuid4

from app.models.project import ProjectCreate, ProjectResponse, ProjectUpdate


class ProjectRepository:
    """CRUD operations for projects."""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    def create(self, data: ProjectCreate) -> ProjectResponse:
        """Create a new project."""
        project_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()

        self.conn.execute(
            "INSERT INTO projects (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (project_id, data.name, data.description, "active", now, now),
        )
        self.conn.commit()

        return self.get(project_id)  # type: ignore

    def get(self, project_id: str) -> ProjectResponse | None:
        """Get a project by ID."""
        row = self.conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if row is None:
            return None
        return self._row_to_response(row)

    def list_all(self, offset: int = 0, limit: int = 50) -> tuple[list[ProjectResponse], int]:
        """List projects with pagination."""
        total = self.conn.execute("SELECT COUNT(*) as cnt FROM projects").fetchone()["cnt"]
        rows = self.conn.execute(
            "SELECT * FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        return [self._row_to_response(r) for r in rows], total

    def update(self, project_id: str, data: ProjectUpdate) -> ProjectResponse | None:
        """Update a project. Returns None if not found."""
        existing = self.get(project_id)
        if existing is None:
            return None

        updates = {}
        if data.name is not None:
            updates["name"] = data.name
        if data.description is not None:
            updates["description"] = data.description
        if data.status is not None:
            updates["status"] = data.status

        if not updates:
            return existing

        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [project_id]

        self.conn.execute(f"UPDATE projects SET {set_clause} WHERE id = ?", values)
        self.conn.commit()

        return self.get(project_id)

    def delete(self, project_id: str) -> bool:
        """Delete a project. Returns True if deleted."""
        cursor = self.conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        self.conn.commit()
        return cursor.rowcount > 0

    def _row_to_response(self, row: sqlite3.Row) -> ProjectResponse:
        """Convert a database row to a response model."""
        return ProjectResponse(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

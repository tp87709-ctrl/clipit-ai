"""Video data access layer."""

import sqlite3
from datetime import datetime, timezone

from app.models.video import VideoResponse


class VideoRepository:
    """CRUD operations for videos."""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    def create(
        self,
        video_id: str,
        project_id: str,
        original_filename: str,
        stored_filename: str,
        file_path: str,
        file_size: int,
        mime_type: str,
    ) -> VideoResponse:
        """Create a new video record."""
        now = datetime.now(timezone.utc).isoformat()

        self.conn.execute(
            """INSERT INTO videos
               (id, project_id, original_filename, stored_filename, file_path,
                file_size, mime_type, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (video_id, project_id, original_filename, stored_filename,
             file_path, file_size, mime_type, "uploaded", now, now),
        )
        self.conn.commit()

        return self.get(video_id)  # type: ignore

    def get(self, video_id: str) -> VideoResponse | None:
        """Get a video by ID."""
        row = self.conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
        if row is None:
            return None
        return self._row_to_response(row)

    def list_by_project(self, project_id: str) -> tuple[list[VideoResponse], int]:
        """List all videos for a project."""
        total = self.conn.execute(
            "SELECT COUNT(*) as cnt FROM videos WHERE project_id = ?", (project_id,)
        ).fetchone()["cnt"]
        rows = self.conn.execute(
            "SELECT * FROM videos WHERE project_id = ? ORDER BY created_at DESC",
            (project_id,),
        ).fetchall()
        return [self._row_to_response(r) for r in rows], total

    def delete(self, video_id: str) -> bool:
        """Delete a video record. Returns True if deleted."""
        cursor = self.conn.execute("DELETE FROM videos WHERE id = ?", (video_id,))
        self.conn.commit()
        return cursor.rowcount > 0

    def _row_to_response(self, row: sqlite3.Row) -> VideoResponse:
        """Convert a database row to a response model."""
        return VideoResponse(
            id=row["id"],
            project_id=row["project_id"],
            original_filename=row["original_filename"],
            stored_filename=row["stored_filename"],
            file_path=row["file_path"],
            file_size=row["file_size"],
            mime_type=row["mime_type"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

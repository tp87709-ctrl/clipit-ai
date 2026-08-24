"""Tests for video API endpoints."""

import io
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def project_id(client):
    """Create a project and return its ID."""
    resp = client.post("/api/projects", json={"name": "Video Test Project"})
    return resp.json()["id"]


def _make_video_content(size_kb: int = 10) -> bytes:
    """Create fake video content of the given size."""
    return b"\x00" * (size_kb * 1024)


def test_upload_video(client, project_id):
    content = _make_video_content()
    resp = client.post(
        f"/api/projects/{project_id}/videos",
        files={"file": ("test.mp4", io.BytesIO(content), "video/mp4")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["original_filename"] == "test.mp4"
    assert data["status"] == "uploaded"
    assert data["project_id"] == project_id
    assert data["file_size"] == len(content)
    assert data["stored_filename"].endswith(".mp4")


def test_upload_rejects_invalid_extension(client, project_id):
    resp = client.post(
        f"/api/projects/{project_id}/videos",
        files={"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert resp.status_code == 400
    assert "Invalid file type" in resp.json()["detail"]


def test_upload_rejects_empty_file(client, project_id):
    resp = client.post(
        f"/api/projects/{project_id}/videos",
        files={"file": ("empty.mp4", io.BytesIO(b""), "video/mp4")},
    )
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"].lower()


def test_upload_rejects_nonexistent_project(client):
    content = _make_video_content()
    resp = client.post(
        "/api/projects/nonexistent/videos",
        files={"file": ("test.mp4", io.BytesIO(content), "video/mp4")},
    )
    assert resp.status_code == 400
    assert "not found" in resp.json()["detail"].lower()


def test_list_project_videos(client, project_id):
    # Upload two videos
    for name in ["a.mp4", "b.mov"]:
        ext = name.split(".")[-1]
        client.post(
            f"/api/projects/{project_id}/videos",
            files={"file": (name, io.BytesIO(_make_video_content()), f"video/{ext}")},
        )

    resp = client.get(f"/api/projects/{project_id}/videos")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["videos"]) == 2


def test_get_video(client, project_id):
    upload_resp = client.post(
        f"/api/projects/{project_id}/videos",
        files={"file": ("detail.mp4", io.BytesIO(_make_video_content()), "video/mp4")},
    )
    video_id = upload_resp.json()["id"]

    resp = client.get(f"/api/videos/{video_id}")
    assert resp.status_code == 200
    assert resp.json()["original_filename"] == "detail.mp4"


def test_get_video_not_found(client):
    resp = client.get("/api/videos/nonexistent")
    assert resp.status_code == 404


def test_delete_video(client, project_id):
    upload_resp = client.post(
        f"/api/projects/{project_id}/videos",
        files={"file": ("delete.mp4", io.BytesIO(_make_video_content()), "video/mp4")},
    )
    video_id = upload_resp.json()["id"]

    resp = client.delete(f"/api/videos/{video_id}")
    assert resp.status_code == 200
    assert resp.json()["deleted"] is True

    # Verify gone
    get_resp = client.get(f"/api/videos/{video_id}")
    assert get_resp.status_code == 404


def test_delete_video_not_found(client):
    resp = client.delete("/api/videos/nonexistent")
    assert resp.status_code == 404


def test_upload_allows_mov_avi_mkv(client, project_id):
    for ext in ["mov", "avi", "mkv"]:
        resp = client.post(
            f"/api/projects/{project_id}/videos",
            files={"file": (f"test.{ext}", io.BytesIO(_make_video_content()), f"video/{ext}")},
        )
        assert resp.status_code == 200, f"Upload of .{ext} should succeed"

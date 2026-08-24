"""Tests for project API endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def test_create_project(client):
    response = client.post("/api/projects", json={"name": "Test Project", "description": "A test"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["description"] == "A test"
    assert data["status"] == "active"
    assert "id" in data
    assert "created_at" in data


def test_create_project_minimal(client):
    response = client.post("/api/projects", json={"name": "Minimal"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Minimal"
    assert data["description"] == ""


def test_create_project_empty_name_fails(client):
    response = client.post("/api/projects", json={"name": ""})
    assert response.status_code == 422


def test_list_projects(client):
    client.post("/api/projects", json={"name": "First"})
    client.post("/api/projects", json={"name": "Second"})

    response = client.get("/api/projects")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    assert len(data["projects"]) >= 2


def test_list_projects_pagination(client):
    for i in range(5):
        client.post("/api/projects", json={"name": f"Project {i}"})

    response = client.get("/api/projects?limit=2&offset=0")
    data = response.json()
    assert len(data["projects"]) == 2
    assert data["total"] >= 5


def test_get_project(client):
    create_resp = client.post("/api/projects", json={"name": "Detail Test"})
    project_id = create_resp.json()["id"]

    response = client.get(f"/api/projects/{project_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Detail Test"


def test_get_project_not_found(client):
    response = client.get("/api/projects/nonexistent-id")
    assert response.status_code == 404


def test_update_project(client):
    create_resp = client.post("/api/projects", json={"name": "Original"})
    project_id = create_resp.json()["id"]

    response = client.patch(f"/api/projects/{project_id}", json={"name": "Updated"})
    assert response.status_code == 200
    assert response.json()["name"] == "Updated"


def test_update_project_not_found(client):
    response = client.patch("/api/projects/nonexistent-id", json={"name": "X"})
    assert response.status_code == 404


def test_delete_project(client):
    create_resp = client.post("/api/projects", json={"name": "To Delete"})
    project_id = create_resp.json()["id"]

    response = client.delete(f"/api/projects/{project_id}")
    assert response.status_code == 200
    assert response.json()["deleted"] is True

    get_resp = client.get(f"/api/projects/{project_id}")
    assert get_resp.status_code == 404


def test_delete_project_not_found(client):
    response = client.delete("/api/projects/nonexistent-id")
    assert response.status_code == 404


def test_health_still_works(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

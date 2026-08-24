"""Tests for the health check endpoint."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def test_health_returns_200(client):
    response = client.get("/api/health")
    assert response.status_code == 200


def test_health_response_shape(client):
    data = client.get("/api/health").json()
    assert data["status"] == "healthy"
    assert data["service"] == "Clipit.ai"
    assert "timestamp" in data
    assert set(data.keys()) == {"status", "service", "environment", "timestamp"}

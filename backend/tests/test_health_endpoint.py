"""
Unit tests for lightweight health check endpoint (/health and /api/health).
"""
import sys
import time
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from server import app

client = TestClient(app)


def test_health_check_endpoint():
    """Verify /health returns lightweight status in under 50ms with 200 OK."""
    start_time = time.time()
    response = client.get("/health")
    elapsed_ms = (time.time() - start_time) * 1000

    assert response.status_code == 200
    assert elapsed_ms < 50.0  # Sub-50ms constraint

    data = response.json()
    assert data["status"] == "ok"
    assert data["message"] == "SUBHOUZ Backend is running"
    assert isinstance(data["timestamp"], str)
    assert data["timestamp"].endswith("Z")
    assert isinstance(data["uptime"], int)
    assert data["uptime"] >= 0


def test_api_health_check_endpoint():
    """Verify /api/health returns matching health payload."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["message"] == "SUBHOUZ Backend is running"
    assert "timestamp" in data
    assert "uptime" in data

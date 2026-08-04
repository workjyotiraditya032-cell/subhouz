"""
Unit and API integration tests for Attached Bathroom feature in Room Management.
"""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
SUPER_ADMIN = {"email": "admin@subhouz.com", "password": "SubhouzAdmin@2026"}
HOSTEL_ADMIN = {"email": "jogmaya.admin@subhouz.com", "password": "hostel@123"}


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN, timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Backend not running or login failed: {r.status_code}")
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return s


def test_room_default_has_attached_bathroom_false(admin_session):
    """Test that creating a room without specifying attached bathroom defaults to False."""
    # First get a hostel id
    res_h = admin_session.get(f"{BASE_URL}/api/hostels")
    assert res_h.status_code == 200
    hostels = res_h.json()
    assert len(hostels) > 0
    hostel_id = hostels[0]["id"]

    room_num = f"TEST-{uuid.uuid4().hex[:4]}"
    payload = {
        "hostel_id": hostel_id,
        "room_number": room_num,
        "floor_number": 1,
        "capacity": 2,
        "rent": 4500
    }
    r = admin_session.post(f"{BASE_URL}/api/rooms", json=payload)
    assert r.status_code == 200
    data = r.json()

    assert data["has_attached_bathroom"] is False
    assert data["hasAttachedBathroom"] is False
    assert data["has_bathroom"] is False

    # Cleanup
    room_id = data["id"]
    admin_session.delete(f"{BASE_URL}/api/rooms/{room_id}")


def test_create_room_with_attached_bathroom_true(admin_session):
    """Test creating a room with has_attached_bathroom set to True."""
    res_h = admin_session.get(f"{BASE_URL}/api/hostels")
    hostel_id = res_h.json()[0]["id"]

    room_num = f"TEST-{uuid.uuid4().hex[:4]}"
    payload = {
        "hostel_id": hostel_id,
        "room_number": room_num,
        "floor_number": 2,
        "capacity": 1,
        "rent": 6000,
        "has_attached_bathroom": True
    }
    r = admin_session.post(f"{BASE_URL}/api/rooms", json=payload)
    assert r.status_code == 200
    data = r.json()

    assert data["has_attached_bathroom"] is True
    assert data["hasAttachedBathroom"] is True
    assert data["has_bathroom"] is True

    # Cleanup
    room_id = data["id"]
    admin_session.delete(f"{BASE_URL}/api/rooms/{room_id}")


def test_update_room_attached_bathroom_toggle(admin_session):
    """Test editing a room to toggle has_attached_bathroom between True and False."""
    res_h = admin_session.get(f"{BASE_URL}/api/hostels")
    hostel_id = res_h.json()[0]["id"]

    room_num = f"TEST-{uuid.uuid4().hex[:4]}"
    payload = {
        "hostel_id": hostel_id,
        "room_number": room_num,
        "floor_number": 1,
        "capacity": 2,
        "rent": 5000,
        "has_attached_bathroom": False
    }
    r_create = admin_session.post(f"{BASE_URL}/api/rooms", json=payload)
    assert r_create.status_code == 200
    room = r_create.json()
    room_id = room["id"]

    try:
        # Toggle to True using hasAttachedBathroom camelCase parameter
        r_update1 = admin_session.put(f"{BASE_URL}/api/rooms/{room_id}", json={"hasAttachedBathroom": True})
        assert r_update1.status_code == 200
        updated1 = r_update1.json()
        assert updated1["has_attached_bathroom"] is True
        assert updated1["hasAttachedBathroom"] is True

        # Toggle to False using has_attached_bathroom snake_case parameter
        r_update2 = admin_session.put(f"{BASE_URL}/api/rooms/{room_id}", json={"has_attached_bathroom": False})
        assert r_update2.status_code == 200
        updated2 = r_update2.json()
        assert updated2["has_attached_bathroom"] is False
        assert updated2["hasAttachedBathroom"] is False

    finally:
        admin_session.delete(f"{BASE_URL}/api/rooms/{room_id}")


def test_list_rooms_attached_bathroom_filter(admin_session):
    """Test filtering rooms by has_attached_bathroom query parameter."""
    res_h = admin_session.get(f"{BASE_URL}/api/hostels")
    hostel_id = res_h.json()[0]["id"]

    r_true = admin_session.get(f"{BASE_URL}/api/rooms", params={"hostel_id": hostel_id, "has_attached_bathroom": "true"})
    assert r_true.status_code == 200
    for room in r_true.json():
        assert room["has_attached_bathroom"] is True

    r_false = admin_session.get(f"{BASE_URL}/api/rooms", params={"hostel_id": hostel_id, "has_attached_bathroom": "false"})
    assert r_false.status_code == 200
    for room in r_false.json():
        assert room["has_attached_bathroom"] is False

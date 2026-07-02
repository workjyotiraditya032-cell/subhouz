"""
Backend tests for Subhouz Smart Hostel Management Platform
Tests: auth, hostels, rooms, residents, rent tracker (core), automation, dashboard
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://rent-track-hub.preview.emergentagent.com").rstrip("/")

SUPER_ADMIN = {"email": "admin@subhouz.com", "password": "SubhouzAdmin@2026"}
HOSTEL_ADMIN = {"email": "jogmaya.admin@subhouz.com", "password": "hostel@123"}


# ----- fixtures -----
@pytest.fixture(scope="module")
def super_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN, timeout=15)
    assert r.status_code == 200, f"Super admin login failed: {r.status_code} {r.text}"
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return s


@pytest.fixture(scope="module")
def hostel_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=HOSTEL_ADMIN, timeout=15)
    assert r.status_code == 200, f"Hostel admin login failed: {r.status_code} {r.text}"
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return s


# ----- health -----
def test_health():
    r = requests.get(f"{BASE_URL}/api/health", timeout=10)
    assert r.status_code == 200
    assert r.json().get("status") == "healthy"


# ----- Auth -----
class TestAuth:
    def test_login_super_admin(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "super_admin"
        assert d["email"] == SUPER_ADMIN["email"]
        assert "token" in d and len(d["token"]) > 20

    def test_login_hostel_admin(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json=HOSTEL_ADMIN, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "hostel_admin"
        assert d.get("hostel_id"), "Hostel admin should have hostel_id"

    def test_login_invalid(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": "admin@subhouz.com", "password": "wrong"},
                          timeout=15)
        assert r.status_code == 401

    def test_me_endpoint(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == SUPER_ADMIN["email"]
        assert d["role"] == "super_admin"


# ----- Hostels -----
class TestHostels:
    def test_list_hostels_super(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/hostels", timeout=15)
        assert r.status_code == 200
        hostels = r.json()
        assert isinstance(hostels, list)
        assert len(hostels) >= 3, f"Expected >=3 seeded hostels, got {len(hostels)}"
        names = [h.get("name", "") for h in hostels]
        # spot-check seeded hostels
        assert any("Jogmaya" in n for n in names)

    def test_list_hostels_scoped_for_hostel_admin(self, hostel_session):
        r = hostel_session.get(f"{BASE_URL}/api/hostels", timeout=15)
        assert r.status_code == 200
        hostels = r.json()
        # hostel_admin should see only their own hostel
        assert isinstance(hostels, list)
        assert len(hostels) == 1, f"Hostel admin should see 1 hostel, got {len(hostels)}"


# ----- Public Hostels (iteration 3) -----
class TestPublicHostels:
    def test_public_list_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/hostels/public", timeout=15)
        assert r.status_code == 200
        hostels = r.json()
        assert isinstance(hostels, list)
        assert len(hostels) >= 3
        h = hostels[0]
        for k in ["id", "name", "address", "hostel_type", "starting_rent",
                  "total_rooms", "total_beds", "available_beds", "occupancy_rate",
                  "average_rating", "review_count", "facilities"]:
            assert k in h, f"Missing key {k} in public hostel; keys: {list(h.keys())}"
        assert isinstance(h["facilities"], list) and len(h["facilities"]) > 0
        assert isinstance(h["starting_rent"], (int, float))
        assert 0 <= h["occupancy_rate"] <= 100
        # deterministic rating in seeded range
        assert 4.2 <= h["average_rating"] <= 4.8

    def test_public_types_present(self):
        r = requests.get(f"{BASE_URL}/api/hostels/public", timeout=15)
        assert r.status_code == 200
        types = {h["hostel_type"] for h in r.json()}
        # Expect boys, girls, mixed among seeded hostels
        assert "boys" in types
        assert "girls" in types
        assert "mixed" in types

    def test_public_detail_by_id(self):
        listing = requests.get(f"{BASE_URL}/api/hostels/public", timeout=15).json()
        hid = listing[0]["id"]
        r = requests.get(f"{BASE_URL}/api/hostels/public/{hid}", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == hid
        assert "rooms" in d and isinstance(d["rooms"], list)
        # rooms should have expected keys
        if d["rooms"]:
            room = d["rooms"][0]
            for k in ["id", "room_number", "rent", "capacity", "total_beds", "available_beds"]:
                assert k in room, f"Missing key {k} in room; keys: {list(room.keys())}"
        # starting_rent should equal min room rent when rooms exist
        if d["rooms"]:
            rents = [r["rent"] for r in d["rooms"] if r.get("rent")]
            if rents:
                assert d["starting_rent"] == min(rents)

    def test_public_detail_invalid_id(self):
        # Use a valid ObjectId format that doesn't exist
        r = requests.get(f"{BASE_URL}/api/hostels/public/507f1f77bcf86cd799439011", timeout=15)
        assert r.status_code == 404

    def test_public_detail_malformed_id(self):
        r = requests.get(f"{BASE_URL}/api/hostels/public/not-a-valid-id", timeout=15)
        # Should not 500 — either 400 or 404
        assert r.status_code in (400, 404, 422), f"Got {r.status_code}: {r.text}"


# ----- Rooms -----
class TestRooms:
    def test_list_rooms(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/rooms", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ----- Residents -----
class TestResidents:
    def test_list_residents(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/residents", timeout=15)
        assert r.status_code == 200
        residents = r.json()
        assert isinstance(residents, list)
        assert len(residents) > 0, "Expected seeded residents"

    def test_list_residents_scoped(self, hostel_session, super_session):
        # super sees all
        rs = super_session.get(f"{BASE_URL}/api/residents", timeout=15).json()
        rh = hostel_session.get(f"{BASE_URL}/api/residents", timeout=15)
        assert rh.status_code == 200
        residents_h = rh.json()
        # hostel admin should see fewer (only their hostel)
        assert len(residents_h) <= len(rs)


# ----- Dashboard -----
class TestDashboard:
    def test_dashboard_stats(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/dashboard/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        # Expected structure - stat cards
        for k in ["total_hostels", "total_rooms", "total_beds", "total_residents"]:
            assert k in d, f"Missing dashboard field: {k}. Got: {list(d.keys())}"


# ----- Rent Tracker (CORE) -----
class TestRentTracker:
    def test_get_rent_tracker(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/rent/tracker", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "entries" in d
        assert "summary" in d
        assert isinstance(d["entries"], list)
        assert len(d["entries"]) > 0
        # verify structure
        e = d["entries"][0]
        for k in ["resident_id", "name", "status", "monthly_rent"]:
            assert k in e
        assert e["status"] in ["paid", "pending", "overdue"]

    def test_mark_paid_and_undo(self, super_session):
        """CORE flow: mark paid → verify → undo → verify"""
        tracker = super_session.get(f"{BASE_URL}/api/rent/tracker", timeout=15).json()
        # find a pending resident (or any)
        entries = tracker["entries"]
        target = next((e for e in entries if e["status"] != "paid"), entries[0])
        rid = target["resident_id"]

        # Mark paid
        r = super_session.post(
            f"{BASE_URL}/api/rent/mark-paid/{rid}",
            json={"payment_mode": "cash", "notes": "TEST_payment"},
            timeout=15,
        )
        assert r.status_code == 200, f"mark-paid failed: {r.status_code} {r.text}"
        d = r.json()
        assert d.get("receipt_number", "").startswith("SH-")
        assert d.get("resident_name")

        # Verify status is paid
        tracker2 = super_session.get(f"{BASE_URL}/api/rent/tracker", timeout=15).json()
        target2 = next(e for e in tracker2["entries"] if e["resident_id"] == rid)
        assert target2["status"] == "paid"
        assert target2["receipt_number"] is not None

        # Undo
        r = super_session.post(f"{BASE_URL}/api/rent/mark-unpaid/{rid}", timeout=15)
        assert r.status_code == 200

        # Verify reverted
        tracker3 = super_session.get(f"{BASE_URL}/api/rent/tracker", timeout=15).json()
        target3 = next(e for e in tracker3["entries"] if e["resident_id"] == rid)
        assert target3["status"] in ["pending", "overdue"]


# ----- Automation -----
class TestAutomation:
    def test_list_workflows(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/automation/workflows", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_trigger_reminders(self, super_session):
        r = super_session.post(f"{BASE_URL}/api/automation/trigger-reminders", timeout=20)
        assert r.status_code in (200, 201), f"trigger-reminders failed: {r.status_code} {r.text}"


# ----- Access control -----
class TestAccessControl:
    def test_no_auth_blocked(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/stats", timeout=15)
        assert r.status_code in (401, 403)

    def test_hostel_admin_cannot_register(self, hostel_session):
        r = hostel_session.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": "TEST_x@x.com", "password": "abc12345", "name": "X"},
            timeout=15,
        )
        assert r.status_code == 403

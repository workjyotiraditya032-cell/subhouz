"""
Tests for iteration 4:
- Enquiry management (list, stats, get, update status, notes, delete)
- Admin user management (list, create, update, toggle, reset, delete)
- Electricity billing (list, create, update, mark-paid, generate-monthly, stats)
- Resident documents (PUT /api/residents/:id/documents)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://rent-track-hub.preview.emergentagent.com").rstrip("/")
SUPER_ADMIN = {"email": "admin@subhouz.com", "password": "SubhouzAdmin@2026"}
HOSTEL_ADMIN = {"email": "jogmaya.admin@subhouz.com", "password": "hostel@123"}


@pytest.fixture(scope="module")
def super_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s


@pytest.fixture(scope="module")
def hostel_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=HOSTEL_ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s


# ------------------- Enquiries -------------------
class TestEnquiries:
    def test_list_enquiries_super(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/enquiries", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # store first enquiry id for downstream tests
        pytest.enquiry_id = data[0]["id"] if data else None

    def test_enquiry_stats(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/enquiries/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("total", "new", "contacted", "follow_up", "converted", "closed"):
            assert k in d, f"missing key {k}"
            assert isinstance(d[k], int)

    def test_list_enquiries_hostel_admin_scoped(self, hostel_session):
        r = hostel_session.get(f"{BASE_URL}/api/enquiries", timeout=15)
        assert r.status_code == 200
        # hostel admin should only see own hostel's enquiries (may be empty, must not 500)

    def test_get_enquiry_detail(self, super_session):
        if not getattr(pytest, "enquiry_id", None):
            pytest.skip("No enquiries available")
        r = super_session.get(f"{BASE_URL}/api/enquiries/{pytest.enquiry_id}", timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == pytest.enquiry_id

    def test_update_enquiry_status(self, super_session):
        if not getattr(pytest, "enquiry_id", None):
            pytest.skip("No enquiries available")
        r = super_session.put(f"{BASE_URL}/api/enquiries/{pytest.enquiry_id}",
                              json={"status": "contacted"}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "contacted"

        # verify persistence via GET
        g = super_session.get(f"{BASE_URL}/api/enquiries/{pytest.enquiry_id}", timeout=15)
        assert g.status_code == 200 and g.json()["status"] == "contacted"

    def test_add_enquiry_note(self, super_session):
        if not getattr(pytest, "enquiry_id", None):
            pytest.skip("No enquiries available")
        r = super_session.post(f"{BASE_URL}/api/enquiries/{pytest.enquiry_id}/notes",
                               json={"text": "TEST_ note from iteration4"}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("note", {}).get("text") == "TEST_ note from iteration4"

    def test_hostel_admin_cannot_delete_enquiry(self, hostel_session, super_session):
        if not getattr(pytest, "enquiry_id", None):
            pytest.skip("No enquiries available")
        r = hostel_session.delete(f"{BASE_URL}/api/enquiries/{pytest.enquiry_id}", timeout=15)
        assert r.status_code == 403

    def test_enquiry_invalid_id_returns_404(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/enquiries/not-a-valid-id", timeout=15)
        assert r.status_code == 404


# ------------------- Admin Users -------------------
class TestAdminUsers:
    def test_list_admin_users(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/admin/users", timeout=15)
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list)
        assert any(u["email"] == "admin@subhouz.com" for u in users)
        # ensure password_hash not leaked
        for u in users:
            assert "password_hash" not in u

    def test_hostel_admin_cannot_list_admins(self, hostel_session):
        r = hostel_session.get(f"{BASE_URL}/api/admin/users", timeout=15)
        assert r.status_code == 403

    def test_create_update_toggle_reset_delete_admin(self, super_session):
        # CREATE
        payload = {
            "email": "TEST_iter4@subhouz.com",
            "password": "Test@1234",
            "name": "TEST Iter4",
            "role": "hostel_admin"
        }
        r = super_session.post(f"{BASE_URL}/api/admin/users", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        user_id = r.json()["id"]
        assert r.json()["email"] == "test_iter4@subhouz.com"

        # UPDATE
        u = super_session.put(f"{BASE_URL}/api/admin/users/{user_id}",
                              json={"name": "TEST Iter4 Updated", "phone": "9990001111"}, timeout=15)
        assert u.status_code == 200
        assert u.json()["name"] == "TEST Iter4 Updated"

        # TOGGLE disable
        t = super_session.put(f"{BASE_URL}/api/admin/users/{user_id}/toggle-status", timeout=15)
        assert t.status_code == 200
        assert t.json()["disabled"] is True

        # TOGGLE re-enable
        t2 = super_session.put(f"{BASE_URL}/api/admin/users/{user_id}/toggle-status", timeout=15)
        assert t2.status_code == 200 and t2.json()["disabled"] is False

        # RESET password
        rp = super_session.put(f"{BASE_URL}/api/admin/users/{user_id}/reset-password", timeout=15)
        assert rp.status_code == 200
        assert "new_password" in rp.json() and len(rp.json()["new_password"]) >= 8

        # DELETE (cleanup)
        d = super_session.delete(f"{BASE_URL}/api/admin/users/{user_id}", timeout=15)
        assert d.status_code == 200

        # verify GET returns not-found via re-delete
        d2 = super_session.delete(f"{BASE_URL}/api/admin/users/{user_id}", timeout=15)
        assert d2.status_code == 404

    def test_create_admin_duplicate_email(self, super_session):
        r = super_session.post(f"{BASE_URL}/api/admin/users",
                               json={"email": "admin@subhouz.com", "password": "x", "name": "dup"}, timeout=15)
        assert r.status_code == 400


# ------------------- Electricity -------------------
class TestElectricity:
    def test_list_bills(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/electricity/bills", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_electricity_stats(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/electricity/stats?month=7&year=2026", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_bills", "paid", "pending", "total_amount", "collected", "outstanding", "total_units"):
            assert k in d

    def test_generate_monthly_and_pay(self, super_session):
        # Generate for a specific month/year
        g = super_session.post(f"{BASE_URL}/api/electricity/generate-monthly?month=7&year=2026", timeout=30)
        assert g.status_code == 200, g.text
        assert "count" in g.json()

        # List bills for that month
        lb = super_session.get(f"{BASE_URL}/api/electricity/bills?month=7&year=2026", timeout=15)
        assert lb.status_code == 200
        bills = lb.json()
        if not bills:
            pytest.skip("No bills generated (no active residents)")
        bill_id = bills[0]["id"]

        # Update current_reading to trigger auto-calc
        prev = bills[0]["previous_reading"]
        upd = super_session.put(f"{BASE_URL}/api/electricity/bills/{bill_id}",
                                json={"current_reading": prev + 50}, timeout=15)
        assert upd.status_code == 200
        assert upd.json()["units_consumed"] == 50
        assert upd.json()["total_amount"] > 0

        # Mark as paid
        p = super_session.post(f"{BASE_URL}/api/electricity/bills/{bill_id}/mark-paid", timeout=15)
        assert p.status_code == 200

        # Verify via list
        lb2 = super_session.get(f"{BASE_URL}/api/electricity/bills?month=7&year=2026", timeout=15)
        matched = [b for b in lb2.json() if b["id"] == bill_id]
        assert matched and matched[0]["payment_status"] == "paid"

    def test_generate_monthly_idempotent(self, super_session):
        # Running again should generate 0 more
        g2 = super_session.post(f"{BASE_URL}/api/electricity/generate-monthly?month=7&year=2026", timeout=30)
        assert g2.status_code == 200
        assert g2.json()["count"] == 0

    def test_create_manual_bill(self, super_session):
        # Get a resident
        residents = super_session.get(f"{BASE_URL}/api/residents", timeout=15).json()
        if not residents:
            pytest.skip("No residents")
        r0 = residents[0]
        payload = {
            "resident_id": r0["id"],
            "hostel_id": r0["hostel_id"],
            "previous_reading": 100,
            "current_reading": 175,
            "rate_per_unit": 8,
            "additional_charges": 50,
            "billing_month": 6,
            "billing_year": 2026,
        }
        r = super_session.post(f"{BASE_URL}/api/electricity/bills", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["units_consumed"] == 75
        assert b["total_amount"] == 75 * 8 + 50  # 650
        # cleanup: mark-paid to move it out of pending (no delete endpoint)


# ------------------- Resident Documents -------------------
class TestResidentDocuments:
    def test_update_resident_documents(self, super_session):
        residents = super_session.get(f"{BASE_URL}/api/residents", timeout=15).json()
        if not residents:
            pytest.skip("No residents to test docs")
        rid = residents[0]["id"]
        payload = {
            "photo_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
            "aadhaar_number": "1234 5678 9012",
            "aadhaar_front": "data:image/png;base64,AAA==",
            "aadhaar_back": "data:image/png;base64,BBB==",
            "emergency_contact_name": "TEST_EM_Contact",
            "emergency_contact_phone": "9998887777",
            "emergency_contact_relation": "Father",
        }
        r = super_session.put(f"{BASE_URL}/api/residents/{rid}/documents", json=payload, timeout=15)
        assert r.status_code == 200

        # Verify persistence via GET
        g = super_session.get(f"{BASE_URL}/api/residents/{rid}", timeout=15)
        assert g.status_code == 200
        d = g.json()
        assert d.get("aadhaar_number") == "1234 5678 9012"
        assert d.get("emergency_contact_name") == "TEST_EM_Contact"
        assert d.get("emergency_contact_phone") == "9998887777"


# ------------------- Sanity: existing endpoints intact -------------------
class TestExistingIntact:
    def test_hostels(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/hostels", timeout=15)
        assert r.status_code == 200 and len(r.json()) >= 3

    def test_dashboard_stats(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/dashboard/stats", timeout=15)
        assert r.status_code == 200

    def test_rent_tracker(self, super_session):
        r = super_session.get(f"{BASE_URL}/api/rent/tracker", timeout=15)
        assert r.status_code == 200

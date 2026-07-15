import os
import pytest
import requests
import time
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
SUPER_ADMIN = {"email": "admin@subhouz.com", "password": "SubhouzAdmin@2026"}

@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.text}"
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s

def poll_logs(admin_session, check_fn, timeout=10, interval=0.5):
    """Helper to poll logs until a condition is met, to handle async EventBus latency."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        r = admin_session.get(f"{BASE_URL}/api/automation/logs", timeout=15)
        assert r.status_code == 200
        logs = r.json()
        if check_fn(logs):
            return logs
        time.sleep(interval)
    # Return whatever logs are currently present
    r = admin_session.get(f"{BASE_URL}/api/automation/logs", timeout=15)
    return r.json()

class TestAutomationModule:
    def test_list_workflows(self, admin_session):
        """Test listing workflows returns the 7 seeded automations."""
        r = admin_session.get(f"{BASE_URL}/api/automation/workflows", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 7
        
        names = [w["name"] for w in data]
        assert "Welcome WhatsApp" in names
        assert "Booking Confirmation" in names
        assert "Digital KYC Request" in names
        assert "Automatic Document Storage" in names
        assert "Payment Storage" in names
        assert "Rent Reminder" in names
        assert "Vacancy Update" in names

    def test_public_enquiry_trigger_welcome_whatsapp(self, admin_session):
        """Test public enquiry submission triggers Welcome WhatsApp automation."""
        # 1. Get initial log count
        r_logs = admin_session.get(f"{BASE_URL}/api/automation/logs", timeout=15)
        initial_log_count = len(r_logs.json())

        # 2. Submit enquiry
        payload = {
            "name": "Auto Tester",
            "phone": "+919999999999",
            "email": "autotester@example.com",
            "preferred_hostel": "Jogmaya Mansion",
            "message": "Testing Welcome WhatsApp automation"
        }
        r = requests.post(f"{BASE_URL}/api/automation/enquiries", json=payload, timeout=15)
        assert r.status_code == 200
        
        # 3. Poll logs until the Welcome WhatsApp log is recorded
        new_logs = poll_logs(
            admin_session,
            lambda logs: len(logs) > initial_log_count and any(l["automation_name"] == "Welcome WhatsApp" for l in logs)
        )
        assert len(new_logs) > initial_log_count
        
        welcome_logs = [l for l in new_logs if l["automation_name"] == "Welcome WhatsApp"]
        assert len(welcome_logs) > 0
        assert welcome_logs[0]["status"] in ("success", "failed")

    def test_create_resident_booking_and_kyc_triggers(self, admin_session):
        """Test that creating a resident triggers Booking Confirmation and Digital KYC Request."""
        # Get hostels list to assign the resident
        r_h = admin_session.get(f"{BASE_URL}/api/hostels", timeout=15)
        hostels = r_h.json()
        assert len(hostels) > 0
        hostel = hostels[0]
        
        # Create resident
        payload = {
            "hostel_id": hostel["id"],
            "name": "Booking Guest",
            "phone": "+919876543211",
            "whatsapp": "+919876543211",
            "gender": "male",
            "monthly_rent": 6000.0,
            "security_deposit": 2000.0,
            "check_in_date": "2026-07-10"
        }
        r = admin_session.post(f"{BASE_URL}/api/residents", json=payload, timeout=15)
        assert r.status_code == 200
        resident = r.json()
        pytest.test_resident_id = resident["id"]
        
        # Poll logs until both Booking Confirmation and KYC logs are generated
        logs = poll_logs(
            admin_session,
            lambda logs: any(l["automation_name"] == "Booking Confirmation" and l["resident_id"] == resident["id"] for l in logs) and
                         any(l["automation_name"] == "Digital KYC Request" and l["resident_id"] == resident["id"] for l in logs)
        )
        
        conf_logs = [l for l in logs if l["automation_name"] == "Booking Confirmation" and l["resident_id"] == resident["id"]]
        kyc_logs = [l for l in logs if l["automation_name"] == "Digital KYC Request" and l["resident_id"] == resident["id"]]
        
        assert len(conf_logs) > 0
        assert len(kyc_logs) > 0

    def test_aadhaar_submission_document_storage_trigger(self, admin_session):
        """Test Aadhaar URL update triggers Automatic Document Storage and sets id_verified to False."""
        res_id = getattr(pytest, "test_resident_id", None)
        if not res_id:
            pytest.skip("No test resident available")
            
        payload = {
            "aadhaar_url": "https://supabase.co/storage/v1/object/public/kyc/aadhaar.pdf"
        }
        r = admin_session.put(f"{BASE_URL}/api/residents/{res_id}/documents", json=payload, timeout=15)
        assert r.status_code == 200
        
        # Verify resident state id_verified is False (Pending)
        r_res = admin_session.get(f"{BASE_URL}/api/residents/{res_id}", timeout=15)
        resident = r_res.json()
        assert resident["id_verified"] is False
        
        # Poll logs until document storage log is generated
        logs = poll_logs(
            admin_session,
            lambda logs: any(l["automation_name"] == "Automatic Document Storage" and l["resident_id"] == res_id for l in logs)
        )
        
        storage_logs = [l for l in logs if l["automation_name"] == "Automatic Document Storage" and l["resident_id"] == res_id]
        assert len(storage_logs) > 0

    def test_payment_storage_trigger(self, admin_session):
        """Test recording a rent payment triggers Payment Storage automation."""
        res_id = getattr(pytest, "test_resident_id", None)
        if not res_id:
            pytest.skip("No test resident available")
            
        payload = {
            "payment_mode": "online",
            "notes": "Testing payment storage trigger",
            "transaction_id": "TXN999999999",
            "balance": 0.0
        }
        r = admin_session.post(f"{BASE_URL}/api/rent/mark-paid/{res_id}?month=7&year=2026", json=payload, timeout=15)
        assert r.status_code == 200
        
        # Poll logs until payment storage log is generated
        logs = poll_logs(
            admin_session,
            lambda logs: any(l["automation_name"] == "Payment Storage" and l["resident_id"] == res_id for l in logs)
        )
        
        pay_logs = [l for l in logs if l["automation_name"] == "Payment Storage" and l["resident_id"] == res_id]
        assert len(pay_logs) > 0

    def test_checkout_vacancy_trigger(self, admin_session):
        """Test checking out a resident triggers Vacancy Update automation."""
        res_id = getattr(pytest, "test_resident_id", None)
        if not res_id:
            pytest.skip("No test resident available")
            
        r = admin_session.post(f"{BASE_URL}/api/residents/{res_id}/checkout", timeout=15)
        assert r.status_code == 200
        
        # Poll logs until vacancy update log is generated
        logs = poll_logs(
            admin_session,
            lambda logs: any(l["automation_name"] == "Vacancy Update" and l["resident_id"] == res_id for l in logs)
        )
        
        vacancy_logs = [l for l in logs if l["automation_name"] == "Vacancy Update" and l["resident_id"] == res_id]
        assert len(vacancy_logs) > 0

import logging
import os
from datetime import datetime, timezone
from database import get_db, parse_uuid
from services.notification_service import NotificationService

logger = logging.getLogger(__name__)

async def get_manager_for_hostel(db, hostel_id):
    """Query manager details for a hostel. Falls back to super admin if not found."""
    if not hostel_id:
        return {"name": "Super Admin", "phone": "+91 9876543210"}
    try:
        res = await db.table("users").select("*").eq("hostel_id", parse_uuid(hostel_id)).eq("role", "hostel_admin").execute()
        if res.data:
            return res.data[0]
        res_sa = await db.table("users").select("*").eq("role", "super_admin").execute()
        if res_sa.data:
            return res_sa.data[0]
    except Exception as e:
        logger.warning(f"Error fetching manager: {e}")
    return {"name": "System Admin", "phone": "+91 9876543210"}


class AutomationDispatcher:
    @staticmethod
    def is_globally_enabled() -> bool:
        return os.getenv("AUTOMATION_ENABLED", "true").lower() == "true"

    @classmethod
    async def handle_new_enquiry(cls, enquiry_data):
        if not cls.is_globally_enabled():
            logger.info("Automation is globally disabled.")
            return

        db = get_db()
        try:
            res_auto = await db.table("automations").select("*").eq("trigger_type", "new_enquiry").eq("enabled", True).execute()
            automation = res_auto.data[0] if res_auto.data else None
            if not automation:
                logger.info("Welcome/New Enquiry automation not enabled")
                return

            hostel_id = enquiry_data.get("hostel_id")
            hostel_name = enquiry_data.get("preferred_hostel") or "our properties"
            
            if not hostel_id and enquiry_data.get("preferred_hostel"):
                res_h = await db.table("hostels").select("id", "name").eq("name", enquiry_data["preferred_hostel"]).execute()
                if res_h.data:
                    hostel_id = res_h.data[0]["id"]
                    hostel_name = res_h.data[0]["name"]
                    
            manager = await get_manager_for_hostel(db, hostel_id)
            
            payload = {
                "enquiry": enquiry_data,
                "manager": manager,
                "preferred_hostel_name": hostel_name
            }
            
            await NotificationService.dispatch_to_webhook(
                automation=automation,
                trigger_type="new_enquiry",
                payload=payload,
                resident_id=None,
                hostel_id=hostel_id,
                resident_name=enquiry_data.get("name")
            )
        except Exception as e:
            logger.error(f"Error handling new enquiry event: {str(e)}")

    @classmethod
    async def handle_booking_confirmed(cls, resident_data):
        if not cls.is_globally_enabled():
            return

        db = get_db()
        try:
            res_auto = await db.table("automations").select("*").eq("trigger_type", "booking_confirmed").eq("enabled", True).execute()
            automation = res_auto.data[0] if res_auto.data else None
            if not automation:
                return

            hostel_id = resident_data.get("hostel_id")
            res_h = await db.table("hostels").select("*").eq("id", parse_uuid(hostel_id)).execute()
            hostel = res_h.data[0] if res_h.data else {}
            manager = await get_manager_for_hostel(db, hostel_id)
            
            payload = {
                "resident": resident_data,
                "hostel": hostel,
                "manager": manager
            }
            
            await NotificationService.dispatch_to_webhook(
                automation=automation,
                trigger_type="booking_confirmed",
                payload=payload,
                resident_id=resident_data.get("id"),
                hostel_id=hostel_id,
                resident_name=resident_data.get("name")
            )
        except Exception as e:
            logger.error(f"Error handling booking confirmed event: {str(e)}")

    @classmethod
    async def handle_kyc_request(cls, resident_data):
        if not cls.is_globally_enabled():
            return

        db = get_db()
        try:
            res_auto = await db.table("automations").select("*").eq("trigger_type", "kyc_request").eq("enabled", True).execute()
            automation = res_auto.data[0] if res_auto.data else None
            if not automation:
                return

            hostel_id = resident_data.get("hostel_id")
            res_h = await db.table("hostels").select("name").eq("id", parse_uuid(hostel_id)).execute()
            hostel_name = res_h.data[0].get("name") if res_h.data else "hostel"
            
            payload = {
                "resident": resident_data,
                "hostel_name": hostel_name
            }
            
            await NotificationService.dispatch_to_webhook(
                automation=automation,
                trigger_type="kyc_request",
                payload=payload,
                resident_id=resident_data.get("id"),
                hostel_id=hostel_id,
                resident_name=resident_data.get("name")
            )
        except Exception as e:
            logger.error(f"Error handling KYC request event: {str(e)}")

    @classmethod
    async def handle_document_submitted(cls, resident_data, aadhaar_url):
        if not cls.is_globally_enabled():
            return

        db = get_db()
        try:
            res_auto = await db.table("automations").select("*").eq("trigger_type", "document_submitted").eq("enabled", True).execute()
            automation = res_auto.data[0] if res_auto.data else None
            if not automation:
                return

            hostel_id = resident_data.get("hostel_id")
            manager = await get_manager_for_hostel(db, hostel_id)
            
            payload = {
                "resident": resident_data,
                "aadhaar_url": aadhaar_url,
                "manager": manager
            }
            
            await NotificationService.dispatch_to_webhook(
                automation=automation,
                trigger_type="document_submitted",
                payload=payload,
                resident_id=resident_data.get("id"),
                hostel_id=hostel_id,
                resident_name=resident_data.get("name")
            )
        except Exception as e:
            logger.error(f"Error handling document submitted event: {str(e)}")

    @classmethod
    async def handle_payment_recorded(cls, payment_data):
        if not cls.is_globally_enabled():
            return

        db = get_db()
        try:
            res_auto = await db.table("automations").select("*").eq("trigger_type", "payment_recorded").eq("enabled", True).execute()
            automation = res_auto.data[0] if res_auto.data else None
            if not automation:
                return

            hostel_id = payment_data.get("hostel_id")
            
            await NotificationService.dispatch_to_webhook(
                automation=automation,
                trigger_type="payment_recorded",
                payload=payment_data,
                resident_id=payment_data.get("resident_id"),
                hostel_id=hostel_id,
                resident_name=payment_data.get("resident_name")
            )
        except Exception as e:
            logger.error(f"Error handling payment recorded event: {str(e)}")

    @classmethod
    async def handle_vacancy_update(cls, resident_data, event_type):
        db = get_db()
        try:
            hostel_id = resident_data.get("hostel_id")
            room_id = resident_data.get("room_id")
            bed_id = resident_data.get("bed_id")
            
            res_h = await db.table("hostels").select("name").eq("id", parse_uuid(hostel_id)).execute()
            hostel_name = res_h.data[0].get("name") if res_h.data else "hostel"
            
            # 1. Update Bed Status to available if checked out or cancelled
            if event_type in ("checkout", "cancelled") and bed_id:
                await db.table("beds").update({"status": "available", "resident_id": None}).eq("id", parse_uuid(bed_id)).execute()

            # 2. Re-calculate Room Occupancy
            if room_id:
                res_beds = await db.table("beds").select("id").eq("room_id", parse_uuid(room_id)).eq("status", "occupied").execute()
                occupied_count = len(res_beds.data)
                
                res_room = await db.table("rooms").select("capacity").eq("id", parse_uuid(room_id)).execute()
                capacity = res_room.data[0].get("capacity", 1) if res_room.data else 1
                
                room_status = "occupied" if occupied_count >= capacity else "available"
                await db.table("rooms").update({
                    "occupied": occupied_count,
                    "status": room_status
                }).eq("id", parse_uuid(room_id)).execute()

            # 3. Update Hostel Occupancy
            if hostel_id:
                res_h_beds = await db.table("beds").select("id").eq("hostel_id", parse_uuid(hostel_id)).eq("status", "occupied").execute()
                occupied_beds_count = len(res_h_beds.data)
                
                await db.table("hostels").update({
                    "occupied_beds": occupied_beds_count,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", parse_uuid(hostel_id)).execute()

            if not cls.is_globally_enabled():
                return

            # Check if automation is enabled
            res_auto = await db.table("automations").select("*").eq("trigger_type", "vacancy_update").eq("enabled", True).execute()
            automation = res_auto.data[0] if res_auto.data else None
            if not automation:
                return

            manager = await get_manager_for_hostel(db, hostel_id)
            
            payload = {
                "resident": resident_data,
                "event_type": event_type,
                "hostel_name": hostel_name,
                "manager": manager
            }
            
            await NotificationService.dispatch_to_webhook(
                automation=automation,
                trigger_type="vacancy_update",
                payload=payload,
                resident_id=resident_data.get("id"),
                hostel_id=hostel_id,
                resident_name=resident_data.get("name")
            )
        except Exception as e:
            logger.error(f"Error handling vacancy update event: {str(e)}")

    @classmethod
    async def handle_rent_due(cls):
        """Placeholder for RENT_DUE trigger (cron offloaded directly to external webhooks)."""
        logger.info("RENT_DUE event emitted. Cron triggers are offloaded directly to external webhooks.")
        return

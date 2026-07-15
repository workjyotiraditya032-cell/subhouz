import logging
import os
import httpx
from datetime import datetime, timezone
from database import get_db, parse_uuid

logger = logging.getLogger(__name__)

class NotificationService:
    @classmethod
    async def dispatch_to_webhook(
        cls,
        automation: dict,
        trigger_type: str,
        payload: dict,
        resident_id=None,
        hostel_id=None,
        resident_name=None,
    ) -> bool:
        """
        Sends event data to external webhook URL.
        Logs execution status in the database.
        """
        db = get_db()

        config = automation.get("config") or {}
        webhook_url = config.get("webhook_url")

        base_url = (
            os.getenv("AUTOMATION_WEBHOOK_BASE_URL")
            or os.getenv("N8N_BASE_URL")
            or ""
        ).rstrip("/")

        if not webhook_url and base_url:
            webhook_url = f"{base_url}/webhook/{trigger_type}"

        if not webhook_url:
            logger.warning(
                f"No webhook URL configured for automation '{automation.get('name')}'."
            )

            await cls.log_automation_execution(
                automation_id=automation.get("id"),
                name=automation.get("name"),
                trigger_type=trigger_type,
                resident_id=resident_id,
                resident_name=resident_name,
                hostel_id=hostel_id,
                status="success",
                message="Simulated success (no webhook configured).",
            )

            return True

        headers = {
            "Content-Type": "application/json",
        }

        api_key = (
            os.getenv("AUTOMATION_WEBHOOK_API_KEY")
            or os.getenv("N8N_API_KEY")
            or ""
        )

        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
            headers["X-Automation-API-Key"] = api_key

        data = {
            "event": trigger_type,
            "automation_id": str(automation.get("id")),
            "automation_name": automation.get("name"),
            "payload": payload,
            "config": config,
        }

        status = "failed"
        message = ""
        error = None

        logger.info("=" * 70)
        logger.info(f"WEBHOOK URL : {webhook_url}")
        logger.info(f"EVENT       : {trigger_type}")
        logger.info(f"PAYLOAD     : {data}")
        logger.info("=" * 70)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    webhook_url,
                    json=data,
                    headers=headers,
                )

            logger.info("=" * 70)
            logger.info(f"STATUS CODE : {response.status_code}")
            logger.info(f"RESPONSE    : {response.text}")
            logger.info("=" * 70)

            if response.status_code in (200, 201, 202):
                status = "success"
                message = (
                    f"Successfully dispatched event '{trigger_type}' to webhook."
                )
                logger.info(message)
            else:
                status = "failed"
                message = (
                    f"Failed to dispatch webhook. Status: {response.status_code}"
                )
                error = response.text
                logger.error(f"{message}\n{error}")

        except Exception as exc:
            status = "failed"
            message = f"Exception dispatching webhook: {exc}"
            error = str(exc)
            logger.exception(message)

        await cls.log_automation_execution(
            automation_id=automation.get("id"),
            name=automation.get("name"),
            trigger_type=trigger_type,
            resident_id=resident_id,
            resident_name=resident_name,
            hostel_id=hostel_id,
            status=status,
            message=message,
            error=error,
            details=f"Target URL: {webhook_url}. Payload: {data}",
        )

        return status == "success"

    @staticmethod
    async def log_automation_execution(automation_id, name, trigger_type, resident_id, resident_name, hostel_id, status, message, error=None, details=""):
        """Save execution log to automation_logs table and update automation stats."""
        db = get_db()
        now = datetime.now(timezone.utc)
        try:
            # Fetch hostel name for logs
            hostel_name = "Global"
            if hostel_id:
                res_h = await db.table("hostels").select("name").eq("id", parse_uuid(hostel_id)).execute()
                if res_h.data:
                    hostel_name = res_h.data[0].get("name", "Hostel")
            
            # Fetch resident details if missing
            res_phone = None
            if resident_id:
                res_r = await db.table("residents").select("name", "phone", "whatsapp").eq("id", parse_uuid(resident_id)).execute()
                if res_r.data:
                    res_phone = res_r.data[0].get("whatsapp") or res_r.data[0].get("phone")
                    if not resident_name:
                        resident_name = res_r.data[0].get("name")
            
            # Log execution
            await db.table("automation_logs").insert({
                "automation_id": parse_uuid(automation_id) if automation_id else None,
                "automation_name": name,
                "trigger": trigger_type,
                "status": status,
                "resident_id": parse_uuid(resident_id) if resident_id else None,
                "resident_name": resident_name,
                "hostel_id": parse_uuid(hostel_id) if hostel_id else None,
                "hostel_name": hostel_name,
                "whatsapp_number": res_phone,
                "message": message,
                "error": error,
                "details": details or message,
                "timestamp": now.isoformat(),
                "time": now.isoformat()
            }).execute()

            # Update automation statistics
            if automation_id:
                res_auto = await db.table("automations").select("run_count").eq("id", parse_uuid(automation_id)).execute()
                current_count = res_auto.data[0].get("run_count", 0) if res_auto.data else 0
                
                await db.table("automations").update({
                    "last_run": now.isoformat(),
                    "run_count": current_count + 1,
                    "execution_status": status,
                    "updated_at": now.isoformat()
                }).eq("id", parse_uuid(automation_id)).execute()
        except Exception as e:
            logger.error(f"Failed to log automation execution: {str(e)}")

    @staticmethod
    async def send_whatsapp(recipient: str, message: str, resident_id=None, hostel_id=None):
        logger.warning("NotificationService.send_whatsapp is deprecated. Deliveries must be handled by external webhooks.")
        return False, "Deprecated: direct WhatsApp Meta API calls are removed in favor of external webhooks."

    @staticmethod
    async def send_email(recipient: str, subject: str, body: str, resident_id=None, hostel_id=None):
        logger.warning("NotificationService.send_email is deprecated. Deliveries must be handled by external webhooks.")
        return False, "Deprecated: direct Email calls are removed in favor of external webhooks."

    @staticmethod
    async def send_sms(recipient: str, message: str, resident_id=None, hostel_id=None):
        logger.warning("NotificationService.send_sms is deprecated. Deliveries must be handled by external webhooks.")
        return False, "Deprecated: direct SMS calls are removed in favor of external webhooks."

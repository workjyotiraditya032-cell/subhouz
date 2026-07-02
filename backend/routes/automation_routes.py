from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from database import get_db
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/automation", tags=["automation"])

class WorkflowUpdate(BaseModel):
    enabled: Optional[bool] = None
    config: Optional[dict] = None

class WhatsAppConfigUpdate(BaseModel):
    phone_number_id: Optional[str] = None
    business_account_id: Optional[str] = None
    access_token: Optional[str] = None
    enabled: bool = False

@router.get("/workflows")
async def list_workflows(request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    workflows = await db.automation_workflows.find().to_list(100)
    for w in workflows:
        w["_id"] = str(w["_id"])
        w["id"] = w["_id"]
        if w.get("last_run") and hasattr(w["last_run"], 'isoformat'):
            w["last_run"] = w["last_run"].isoformat()
        if w.get("created_at") and hasattr(w["created_at"], 'isoformat'):
            w["created_at"] = w["created_at"].isoformat()
    return workflows

@router.put("/workflows/{workflow_id}")
async def update_workflow(workflow_id: str, req: WorkflowUpdate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    updates = {}
    if req.enabled is not None:
        updates["enabled"] = req.enabled
    if req.config is not None:
        updates["config"] = req.config
    
    result = await db.automation_workflows.update_one(
        {"_id": ObjectId(workflow_id)}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow = await db.automation_workflows.find_one({"_id": ObjectId(workflow_id)})
    workflow["_id"] = str(workflow["_id"])
    workflow["id"] = workflow["_id"]
    
    await db.activity_logs.insert_one({
        "user_id": user["_id"], "user_name": user.get("name", ""),
        "action": "workflow_updated",
        "entity_type": "automation_workflow", "entity_id": workflow_id,
        "details": f"Updated workflow: {workflow.get('name', '')} - Enabled: {req.enabled}",
        "timestamp": datetime.now(timezone.utc)
    })
    return workflow

@router.get("/logs")
async def get_automation_logs(request: Request, limit: int = Query(50)):
    db = get_db()
    user = await get_current_user(request, db)
    
    query = {}
    if user["role"] == "hostel_admin":
        query["hostel_id"] = user.get("hostel_id")
    
    logs = await db.automation_logs.find(query).sort("timestamp", -1).to_list(limit)
    for l in logs:
        l["_id"] = str(l["_id"])
        l["id"] = l["_id"]
        if l.get("timestamp") and hasattr(l["timestamp"], 'isoformat'):
            l["timestamp"] = l["timestamp"].isoformat()
    return logs

@router.get("/whatsapp-config")
async def get_whatsapp_config(request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    config = await db.settings.find_one({"key": "whatsapp_config"})
    if not config:
        return {"phone_number_id": "", "business_account_id": "", "access_token": "", "enabled": False}
    config.pop("_id", None)
    # Mask the access token
    if config.get("value", {}).get("access_token"):
        token = config["value"]["access_token"]
        config["value"]["access_token_masked"] = token[:8] + "..." + token[-4:] if len(token) > 12 else "***"
    return config.get("value", {})

@router.put("/whatsapp-config")
async def update_whatsapp_config(req: WhatsAppConfigUpdate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can update WhatsApp config")
    
    config_data = req.model_dump()
    await db.settings.update_one(
        {"key": "whatsapp_config"},
        {"$set": {"key": "whatsapp_config", "value": config_data, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    
    await db.activity_logs.insert_one({
        "user_id": user["_id"], "user_name": user.get("name", ""),
        "action": "whatsapp_config_updated",
        "details": f"WhatsApp configuration updated - Enabled: {req.enabled}",
        "timestamp": datetime.now(timezone.utc)
    })
    return {"message": "WhatsApp configuration updated"}

@router.post("/trigger-reminders")
async def trigger_rent_reminders(request: Request):
    """Manually trigger rent reminders for overdue residents."""
    db = get_db()
    user = await get_current_user(request, db)
    
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year
    
    # Get all hostels
    hostel_query = {}
    if user["role"] == "hostel_admin":
        hostel_query["_id"] = ObjectId(user.get("hostel_id"))
    
    hostels = await db.hostels.find(hostel_query).to_list(100)
    reminders_sent = 0
    
    for hostel in hostels:
        h_id = str(hostel["_id"])
        due_date = hostel.get("monthly_due_date", 5)
        
        if now.day < due_date:
            continue
        
        # Get active residents
        residents = await db.residents.find({"hostel_id": h_id, "status": "active"}).to_list(1000)
        
        for resident in residents:
            r_id = str(resident["_id"])
            # Check if already paid
            payment = await db.rent_payments.find_one({
                "resident_id": r_id, "month": current_month, "year": current_year, "status": "paid"
            })
            if payment:
                continue
            
            # Check if reminder already sent
            existing_reminder = await db.rent_payments.find_one({
                "resident_id": r_id, "month": current_month, "year": current_year, "reminder_sent_at": {"$ne": None}
            })
            if existing_reminder:
                continue
            
            # Send reminder
            await db.automation_logs.insert_one({
                "workflow_name": "Rent Reminder",
                "trigger": "due_date_reached",
                "status": "triggered",
                "resident_id": r_id,
                "resident_name": resident.get("name"),
                "hostel_id": h_id,
                "whatsapp_number": resident.get("whatsapp", resident.get("phone")),
                "message_template": "rent_reminder",
                "details": f"Rent reminder sent to {resident.get('name')} for {current_month}/{current_year}",
                "timestamp": now
            })
            
            # Update or create payment record
            await db.rent_payments.update_one(
                {"resident_id": r_id, "month": current_month, "year": current_year},
                {"$set": {"reminder_sent_at": now, "status": "overdue"}, "$setOnInsert": {
                    "resident_id": r_id, "hostel_id": h_id,
                    "resident_name": resident.get("name"),
                    "room_number": resident.get("room_number"),
                    "amount": resident.get("monthly_rent", 0),
                    "month": current_month, "year": current_year,
                    "created_at": now
                }},
                upsert=True
            )
            reminders_sent += 1
    
    return {"message": f"Rent reminders triggered for {reminders_sent} residents", "count": reminders_sent}

# Enquiry routes
@router.get("/enquiries")
async def list_enquiries(request: Request, status: Optional[str] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    query = {}
    if user["role"] == "hostel_admin":
        query["hostel_id"] = user.get("hostel_id")
    if status:
        query["status"] = status
    
    enquiries = await db.enquiries.find(query).sort("created_at", -1).to_list(500)
    for e in enquiries:
        e["_id"] = str(e["_id"])
        e["id"] = e["_id"]
        if e.get("created_at") and hasattr(e["created_at"], 'isoformat'):
            e["created_at"] = e["created_at"].isoformat()
    return enquiries

@router.post("/enquiries")
async def create_enquiry(request: Request):
    db = get_db()
    body = await request.json()
    body["status"] = "new"
    body["created_at"] = datetime.now(timezone.utc)
    result = await db.enquiries.insert_one(body)
    body["_id"] = str(result.inserted_id)
    body["id"] = body["_id"]
    return body

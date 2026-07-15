from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from database import get_db, parse_uuid
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

class PublicEnquirySubmit(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    preferred_hostel: Optional[str] = None
    message: Optional[str] = None

@router.get("/workflows")
async def list_workflows(request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    res_w = await db.table("automations").select("*").execute()
    workflows = res_w.data
    for w in workflows:
        w["_id"] = str(w["id"])
        w["id"] = w["_id"]
        if w.get("last_run"):
            w["last_run"] = str(w["last_run"])
        if w.get("next_run"):
            w["next_run"] = str(w["next_run"])
        if w.get("created_at"):
            w["created_at"] = str(w["created_at"])
    return workflows

@router.put("/workflows/{workflow_id}")
async def update_workflow(workflow_id: str, req: WorkflowUpdate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    wf_uuid = parse_uuid(workflow_id)
    updates = {}
    if req.enabled is not None:
        updates["enabled"] = req.enabled
    if req.config is not None:
        updates["config"] = req.config
        
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
    res_update = await db.table("automations").update(updates).eq("id", wf_uuid).execute()
    if not res_update.data:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    workflow = res_update.data[0]
    workflow["_id"] = str(workflow["id"])
    workflow["id"] = workflow["_id"]
    
    await db.table("activity_logs").insert({
        "user_id": str(user["id"]),
        "user_name": user.get("name", ""),
        "action": "workflow_updated",
        "entity_type": "automation",
        "entity_id": workflow_id,
        "details": f"Updated workflow: {workflow.get('name', '')} - Enabled: {req.enabled}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }).execute()
    return workflow

@router.get("/logs")
async def get_automation_logs(request: Request, limit: int = Query(50)):
    db = get_db()
    user = await get_current_user(request, db)
    
    q = db.table("automation_logs").select("*")
    if user["role"] == "hostel_admin":
        q = q.eq("hostel_id", parse_uuid(user.get("hostel_id")))
        
    res_logs = await q.order("time", desc=True).limit(limit).execute()
    logs = res_logs.data
    for l in logs:
        l["_id"] = str(l["id"])
        l["id"] = l["_id"]
        if l.get("time"):
            l["time"] = str(l["time"])
            l["timestamp"] = l["time"]
    return logs

@router.get("/whatsapp-config")
async def get_whatsapp_config(request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    res_config = await db.table("settings").select("*").eq("key", "whatsapp_config").execute()
    config = res_config.data[0] if res_config.data else None
    
    if not config:
        return {"phone_number_id": "", "business_account_id": "", "access_token": "", "enabled": False}
        
    config_val = config.get("value", {})
    if config_val.get("access_token"):
        token = config_val["access_token"]
        config_val["access_token_masked"] = token[:8] + "..." + token[-4:] if len(token) > 12 else "***"
    return config_val

@router.put("/whatsapp-config")
async def update_whatsapp_config(req: WhatsAppConfigUpdate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can update WhatsApp config")
        
    config_data = req.model_dump()
    await db.table("settings").upsert({
        "key": "whatsapp_config",
        "value": config_data,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }, on_conflict="key").execute()
    
    await db.table("activity_logs").insert({
        "user_id": str(user["id"]),
        "user_name": user.get("name", ""),
        "action": "whatsapp_config_updated",
        "details": f"WhatsApp configuration updated - Enabled: {req.enabled}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }).execute()
    return {"message": "WhatsApp configuration updated"}

@router.post("/enquiries")
async def submit_public_enquiry(req: PublicEnquirySubmit):
    db = get_db()
    # Resolve hostel_id
    hostel_id = None
    if req.preferred_hostel:
        res_h = await db.table("hostels").select("id").eq("name", req.preferred_hostel).execute()
        if res_h.data:
            hostel_id = res_h.data[0]["id"]
            
    enq_doc = {
        "name": req.name,
        "phone": req.phone,
        "email": req.email,
        "preferred_hostel": req.preferred_hostel,
        "hostel_id": hostel_id,
        "message": req.message,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    res_insert = await db.table("enquiries").insert(enq_doc).execute()
    if not res_insert.data:
        raise HTTPException(status_code=500, detail="Failed to record enquiry")
        
    inserted = res_insert.data[0]
    
    # Trigger Welcome WhatsApp Automation
    from services.event_bus import EventBus, NEW_ENQUIRY
    await EventBus.emit(NEW_ENQUIRY, inserted)
    return {"message": "Enquiry submitted successfully", "id": str(inserted["id"])}

@router.post("/trigger-reminders")
async def trigger_reminders(request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    from services.event_bus import EventBus, RENT_DUE
    await EventBus.emit(RENT_DUE)
    return {"message": "Rent reminders triggered"}


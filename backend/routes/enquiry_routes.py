from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from database import get_db, parse_uuid
from auth import get_current_user
from services.event_bus import EventBus, NEW_ENQUIRY
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/enquiries", tags=["enquiries"])

class EnquiryCreate(BaseModel):
    hostel_id: str
    name: str
    phone: str
    email: Optional[str] = None
    message: Optional[str] = None
    preferred_hostel: Optional[str] = None

class EnquiryUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    hostel_id: Optional[str] = None
    notes: Optional[str] = None

class EnquiryNote(BaseModel):
    text: str

@router.post("")
async def create_enquiry(req: EnquiryCreate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] == "hostel_admin" and user.get("hostel_id") != req.hostel_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    enq_doc = {
        "hostel_id": parse_uuid(req.hostel_id),
        "name": req.name,
        "phone": req.phone,
        "email": req.email,
        "message": req.message,
        "preferred_hostel": req.preferred_hostel,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    res_insert = await db.table("enquiries").insert(enq_doc).execute()
    if not res_insert.data:
        raise HTTPException(status_code=500, detail="Failed to create enquiry")
        
    inserted = res_insert.data[0]
    inserted["_id"] = str(inserted["id"])
    inserted["id"] = inserted["_id"]
    
    # Emit NEW_ENQUIRY event → automation engine handles the rest
    await EventBus.emit(NEW_ENQUIRY, inserted)
    return inserted

@router.get("")
async def list_enquiries(request: Request, hostel_id: Optional[str] = Query(None), status: Optional[str] = Query(None), source: Optional[str] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    
    q = db.table("enquiries").select("*")
    if user["role"] == "hostel_admin":
        q = q.eq("hostel_id", parse_uuid(user.get("hostel_id")))
    elif hostel_id:
        q = q.eq("hostel_id", parse_uuid(hostel_id))
    if status:
        q = q.eq("status", status)
    if source:
        q = q.eq("source", source)
        
    res_enq = await q.order("created_at", desc=True).execute()
    enquiries = res_enq.data
    for e in enquiries:
        e["_id"] = str(e["id"])
        e["id"] = e["_id"]
        if e.get("created_at"):
            e["created_at"] = str(e["created_at"])
        if e.get("updated_at"):
            e["updated_at"] = str(e["updated_at"])
    return enquiries

@router.get("/stats")
async def enquiry_stats(request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    h_uuid = None
    if user["role"] == "hostel_admin":
        h_uuid = parse_uuid(user.get("hostel_id"))
        
    def build_query(status_val=None):
        q = db.table("enquiries").select("id", count="exact")
        if h_uuid:
            q = q.eq("hostel_id", h_uuid)
        if status_val:
            q = q.eq("status", status_val)
        return q
        
    res_tot = await build_query().execute()
    total = res_tot.count or 0
    
    res_new = await build_query("new").execute()
    new = res_new.count or 0
    
    res_contacted = await build_query("contacted").execute()
    contacted = res_contacted.count or 0
    
    res_followup = await build_query("follow-up").execute()
    followup = res_followup.count or 0
    
    res_converted = await build_query("converted").execute()
    converted = res_converted.count or 0
    
    res_closed = await build_query("closed").execute()
    closed = res_closed.count or 0
    
    return {"total": total, "new": new, "contacted": contacted, "follow_up": followup, "converted": converted, "closed": closed}

@router.get("/{enquiry_id}")
async def get_enquiry(enquiry_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    e_uuid = parse_uuid(enquiry_id)
    res_e = await db.table("enquiries").select("*").eq("id", e_uuid).execute()
    e = res_e.data[0] if res_e.data else None
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")
        
    if user["role"] == "hostel_admin" and e.get("hostel_id") != user.get("hostel_id"):
        raise HTTPException(status_code=403, detail="Access denied")
        
    e["_id"] = str(e["id"])
    e["id"] = e["_id"]
    return e

@router.put("/{enquiry_id}")
async def update_enquiry(enquiry_id: str, req: EnquiryUpdate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    e_uuid = parse_uuid(enquiry_id)
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    
    if "hostel_id" in updates and updates["hostel_id"]:
        updates["hostel_id"] = parse_uuid(updates["hostel_id"])
    if "assigned_to" in updates and updates["assigned_to"]:
        updates["assigned_to"] = parse_uuid(updates["assigned_to"])
        
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    res_update = await db.table("enquiries").update(updates).eq("id", e_uuid).execute()
    if not res_update.data:
        raise HTTPException(status_code=404, detail="Enquiry not found")
        
    await db.table("activity_logs").insert({
        "user_id": str(user["id"]),
        "user_name": user.get("name", ""),
        "action": "enquiry_updated",
        "entity_type": "enquiry",
        "entity_id": enquiry_id,
        "details": f"Updated enquiry status to {req.status}" if req.status else "Updated enquiry",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    e = res_update.data[0]
    e["_id"] = str(e["id"])
    e["id"] = e["_id"]
    
    if req.status == "confirmed":
        from services.event_bus import EventBus, BOOKING_CONFIRMED
        resident_mock = {
            "id": str(e["id"]),
            "hostel_id": str(e.get("hostel_id", "") or ""),
            "name": e.get("name"),
            "phone": e.get("phone"),
            "whatsapp": e.get("phone"),
            "room_number": "TBD",
            "check_in_date": e.get("move_in_date", "TBD")
        }
        await EventBus.emit(BOOKING_CONFIRMED, resident_mock)
        
    return e

@router.delete("/{enquiry_id}")
async def delete_enquiry(enquiry_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can delete enquiries")
        
    e_uuid = parse_uuid(enquiry_id)
    res_del = await db.table("enquiries").delete().eq("id", e_uuid).execute()
    if not res_del.data:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return {"message": "Enquiry deleted"}

@router.post("/{enquiry_id}/notes")
async def add_enquiry_note(enquiry_id: str, req: EnquiryNote, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    e_uuid = parse_uuid(enquiry_id)
    res_e = await db.table("enquiries").select("follow_up_notes").eq("id", e_uuid).execute()
    e = res_e.data[0] if res_e.data else None
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")
        
    note = {
        "text": req.text,
        "by": user.get("name", ""),
        "user_id": str(user["id"]),
        "at": datetime.now(timezone.utc).isoformat()
    }
    
    current_notes = e.get("follow_up_notes") or []
    if not isinstance(current_notes, list):
        current_notes = []
    current_notes.append(note)
    
    await db.table("enquiries").update({
        "follow_up_notes": current_notes,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", e_uuid).execute()
    
    return {"message": "Note added", "note": note}

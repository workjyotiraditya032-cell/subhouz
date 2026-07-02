from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId
from database import get_db
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/enquiries", tags=["enquiries"])

def parse_oid(v):
    try: return ObjectId(v)
    except: raise HTTPException(status_code=404, detail="Not found")

class EnquiryUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    hostel_id: Optional[str] = None
    notes: Optional[str] = None

class EnquiryNote(BaseModel):
    text: str

@router.get("")
async def list_enquiries(request: Request, hostel_id: Optional[str] = Query(None), status: Optional[str] = Query(None), source: Optional[str] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    query = {}
    if user["role"] == "hostel_admin":
        query["hostel_id"] = user.get("hostel_id")
    elif hostel_id:
        query["hostel_id"] = hostel_id
    if status:
        query["status"] = status
    if source:
        query["source"] = source

    enquiries = await db.enquiries.find(query).sort("created_at", -1).to_list(500)
    for e in enquiries:
        e["_id"] = str(e["_id"])
        e["id"] = e["_id"]
        for k in ("created_at", "updated_at"):
            if e.get(k) and hasattr(e[k], 'isoformat'):
                e[k] = e[k].isoformat()
    return enquiries

@router.get("/stats")
async def enquiry_stats(request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    query = {}
    if user["role"] == "hostel_admin":
        query["hostel_id"] = user.get("hostel_id")
    total = await db.enquiries.count_documents(query)
    new = await db.enquiries.count_documents({**query, "status": "new"})
    contacted = await db.enquiries.count_documents({**query, "status": "contacted"})
    followup = await db.enquiries.count_documents({**query, "status": "follow-up"})
    converted = await db.enquiries.count_documents({**query, "status": "converted"})
    closed = await db.enquiries.count_documents({**query, "status": "closed"})
    return {"total": total, "new": new, "contacted": contacted, "follow_up": followup, "converted": converted, "closed": closed}

@router.get("/{enquiry_id}")
async def get_enquiry(enquiry_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    e = await db.enquiries.find_one({"_id": parse_oid(enquiry_id)})
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    if user["role"] == "hostel_admin" and e.get("hostel_id") != user.get("hostel_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    e["_id"] = str(e["_id"])
    e["id"] = e["_id"]
    return e

@router.put("/{enquiry_id}")
async def update_enquiry(enquiry_id: str, req: EnquiryUpdate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.enquiries.update_one({"_id": parse_oid(enquiry_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    await db.activity_logs.insert_one({
        "user_id": user["_id"], "user_name": user.get("name", ""),
        "action": "enquiry_updated", "entity_type": "enquiry", "entity_id": enquiry_id,
        "details": f"Updated enquiry status to {req.status}" if req.status else "Updated enquiry",
        "timestamp": datetime.now(timezone.utc)
    })
    e = await db.enquiries.find_one({"_id": parse_oid(enquiry_id)})
    e["_id"] = str(e["_id"])
    e["id"] = e["_id"]
    return e

@router.delete("/{enquiry_id}")
async def delete_enquiry(enquiry_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can delete enquiries")
    result = await db.enquiries.delete_one({"_id": parse_oid(enquiry_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return {"message": "Enquiry deleted"}

@router.post("/{enquiry_id}/notes")
async def add_enquiry_note(enquiry_id: str, req: EnquiryNote, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    note = {"text": req.text, "by": user.get("name", ""), "user_id": user["_id"], "at": datetime.now(timezone.utc).isoformat()}
    await db.enquiries.update_one({"_id": parse_oid(enquiry_id)}, {"$push": {"follow_up_notes": note}, "$set": {"updated_at": datetime.now(timezone.utc)}})
    return {"message": "Note added", "note": note}

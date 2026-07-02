from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from database import get_db
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/hostels", tags=["hostels"])

class HostelCreate(BaseModel):
    name: str
    code: str
    address: str
    city: str = "Bhubaneswar"
    state: str = "Odisha"
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    hostel_type: str = "mixed"
    monthly_due_date: int = 5
    reminder_grace_days: int = 3
    follow_up_days: int = 7

class HostelUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    hostel_type: Optional[str] = None
    monthly_due_date: Optional[int] = None
    reminder_grace_days: Optional[int] = None
    follow_up_days: Optional[int] = None

@router.get("")
async def list_hostels(request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] == "super_admin":
        hostels = await db.hostels.find().to_list(100)
    else:
        hostels = await db.hostels.find({"_id": ObjectId(user.get("hostel_id"))}).to_list(1)
    
    for h in hostels:
        h["_id"] = str(h["_id"])
        h["id"] = h["_id"]
        # Compute live stats
        h["total_rooms"] = await db.rooms.count_documents({"hostel_id": h["id"]})
        h["total_beds"] = await db.beds.count_documents({"hostel_id": h["id"]})
        h["occupied_beds"] = await db.beds.count_documents({"hostel_id": h["id"], "status": "occupied"})
        h["total_residents"] = await db.residents.count_documents({"hostel_id": h["id"], "status": "active"})
    return hostels

@router.get("/{hostel_id}")
async def get_hostel(hostel_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] == "hostel_admin" and user.get("hostel_id") != hostel_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    hostel = await db.hostels.find_one({"_id": ObjectId(hostel_id)})
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    hostel["_id"] = str(hostel["_id"])
    hostel["id"] = hostel["_id"]
    hostel["total_rooms"] = await db.rooms.count_documents({"hostel_id": hostel_id})
    hostel["total_beds"] = await db.beds.count_documents({"hostel_id": hostel_id})
    hostel["occupied_beds"] = await db.beds.count_documents({"hostel_id": hostel_id, "status": "occupied"})
    hostel["total_residents"] = await db.residents.count_documents({"hostel_id": hostel_id, "status": "active"})
    return hostel

@router.post("")
async def create_hostel(req: HostelCreate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can create hostels")
    
    doc = req.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    doc["updated_at"] = datetime.now(timezone.utc)
    doc["images"] = []
    result = await db.hostels.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    
    await db.activity_logs.insert_one({
        "user_id": user["_id"], "user_name": user.get("name", ""),
        "hostel_id": doc["id"], "action": "hostel_created",
        "entity_type": "hostel", "entity_id": doc["id"],
        "details": f"Created hostel: {req.name}",
        "timestamp": datetime.now(timezone.utc)
    })
    return doc

@router.put("/{hostel_id}")
async def update_hostel(hostel_id: str, req: HostelUpdate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can update hostels")
    
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.hostels.update_one({"_id": ObjectId(hostel_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hostel not found")
    
    hostel = await db.hostels.find_one({"_id": ObjectId(hostel_id)})
    hostel["_id"] = str(hostel["_id"])
    hostel["id"] = hostel["_id"]
    return hostel

@router.delete("/{hostel_id}")
async def delete_hostel(hostel_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can delete hostels")
    result = await db.hostels.delete_one({"_id": ObjectId(hostel_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hostel not found")
    return {"message": "Hostel deleted"}

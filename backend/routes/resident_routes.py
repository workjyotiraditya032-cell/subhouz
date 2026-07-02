from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/residents", tags=["residents"])

class ResidentCreate(BaseModel):
    hostel_id: str
    room_id: Optional[str] = None
    bed_id: Optional[str] = None
    name: str
    phone: str
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    gender: str = "male"
    date_of_birth: Optional[str] = None
    occupation: Optional[str] = None
    workplace: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    guardian_relation: Optional[str] = None
    permanent_address: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    monthly_rent: float = 0
    security_deposit: float = 0
    due_date_override: Optional[int] = None
    check_in_date: Optional[str] = None
    agreement_start: Optional[str] = None
    agreement_end: Optional[str] = None

class ResidentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None
    workplace: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    monthly_rent: Optional[float] = None
    security_deposit: Optional[float] = None
    due_date_override: Optional[int] = None
    status: Optional[str] = None
    room_id: Optional[str] = None
    bed_id: Optional[str] = None

@router.get("")
async def list_residents(request: Request, hostel_id: Optional[str] = Query(None), status: Optional[str] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    query = {}
    if user["role"] == "hostel_admin":
        query["hostel_id"] = user.get("hostel_id")
    elif hostel_id:
        query["hostel_id"] = hostel_id
    if status:
        query["status"] = status
    
    residents = await db.residents.find(query).sort("name", 1).to_list(1000)
    for r in residents:
        r["_id"] = str(r["_id"])
        r["id"] = r["_id"]
    return residents

@router.get("/{resident_id}")
async def get_resident(resident_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    resident = await db.residents.find_one({"_id": ObjectId(resident_id)})
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    if user["role"] == "hostel_admin" and user.get("hostel_id") != resident.get("hostel_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    resident["_id"] = str(resident["_id"])
    resident["id"] = resident["_id"]
    
    # Get payment history
    payments = await db.rent_payments.find({"resident_id": resident_id}).sort([("year", -1), ("month", -1)]).to_list(100)
    for p in payments:
        p["_id"] = str(p["_id"])
        p["id"] = p["_id"]
        if p.get("paid_on"):
            p["paid_on"] = p["paid_on"].isoformat() if hasattr(p["paid_on"], 'isoformat') else p["paid_on"]
    resident["payment_history"] = payments
    return resident

@router.post("")
async def create_resident(req: ResidentCreate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] == "hostel_admin" and user.get("hostel_id") != req.hostel_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    doc = req.model_dump()
    doc["status"] = "active"
    doc["created_at"] = datetime.now(timezone.utc)
    doc["updated_at"] = datetime.now(timezone.utc)
    
    # Resolve room/bed numbers
    if req.room_id:
        room = await db.rooms.find_one({"_id": ObjectId(req.room_id)})
        if room:
            doc["room_number"] = room.get("room_number", "")
    if req.bed_id:
        bed = await db.beds.find_one({"_id": ObjectId(req.bed_id)})
        if bed:
            doc["bed_number"] = bed.get("bed_number", "")
    
    if not doc.get("whatsapp"):
        doc["whatsapp"] = doc.get("phone")
    
    result = await db.residents.insert_one(doc)
    resident_id = str(result.inserted_id)
    doc["_id"] = resident_id
    doc["id"] = resident_id
    
    # Update bed status
    if req.bed_id:
        await db.beds.update_one({"_id": ObjectId(req.bed_id)}, {"$set": {"status": "occupied", "resident_id": resident_id}})
    
    # Log activity
    await db.activity_logs.insert_one({
        "user_id": user["_id"], "user_name": user.get("name", ""),
        "hostel_id": req.hostel_id, "action": "resident_added",
        "entity_type": "resident", "entity_id": resident_id,
        "details": f"Added resident: {req.name}",
        "timestamp": datetime.now(timezone.utc)
    })
    
    return doc

@router.put("/{resident_id}")
async def update_resident(resident_id: str, req: ResidentUpdate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc)
    
    # Handle bed change
    if "bed_id" in updates:
        old_resident = await db.residents.find_one({"_id": ObjectId(resident_id)})
        if old_resident and old_resident.get("bed_id"):
            await db.beds.update_one({"_id": ObjectId(old_resident["bed_id"])}, {"$set": {"status": "available", "resident_id": None}})
        if updates["bed_id"]:
            await db.beds.update_one({"_id": ObjectId(updates["bed_id"])}, {"$set": {"status": "occupied", "resident_id": resident_id}})
            bed = await db.beds.find_one({"_id": ObjectId(updates["bed_id"])})
            if bed:
                updates["bed_number"] = bed.get("bed_number", "")
    
    if "room_id" in updates and updates["room_id"]:
        room = await db.rooms.find_one({"_id": ObjectId(updates["room_id"])})
        if room:
            updates["room_number"] = room.get("room_number", "")
    
    result = await db.residents.update_one({"_id": ObjectId(resident_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Resident not found")
    resident = await db.residents.find_one({"_id": ObjectId(resident_id)})
    resident["_id"] = str(resident["_id"])
    resident["id"] = resident["_id"]
    return resident

@router.delete("/{resident_id}")
async def delete_resident(resident_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    resident = await db.residents.find_one({"_id": ObjectId(resident_id)})
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    
    # Free the bed
    if resident.get("bed_id"):
        await db.beds.update_one({"_id": ObjectId(resident["bed_id"])}, {"$set": {"status": "available", "resident_id": None}})
    
    await db.residents.delete_one({"_id": ObjectId(resident_id)})
    return {"message": "Resident deleted"}

@router.post("/{resident_id}/checkout")
async def checkout_resident(resident_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    resident = await db.residents.find_one({"_id": ObjectId(resident_id)})
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    
    # Free the bed
    if resident.get("bed_id"):
        await db.beds.update_one({"_id": ObjectId(resident["bed_id"])}, {"$set": {"status": "available", "resident_id": None}})
    
    await db.residents.update_one({"_id": ObjectId(resident_id)}, {"$set": {
        "status": "checked_out",
        "check_out_date": datetime.now(timezone.utc).isoformat(),
        "bed_id": None,
        "room_id": None,
        "updated_at": datetime.now(timezone.utc)
    }})
    
    await db.activity_logs.insert_one({
        "user_id": user["_id"], "user_name": user.get("name", ""),
        "hostel_id": resident.get("hostel_id"), "action": "resident_checkout",
        "entity_type": "resident", "entity_id": resident_id,
        "details": f"Checked out resident: {resident.get('name', '')}",
        "timestamp": datetime.now(timezone.utc)
    })
    return {"message": "Resident checked out"}


@router.put("/{resident_id}/documents")
async def update_resident_documents(resident_id: str, request: Request):
    """Upload/update resident documents (photo, Aadhaar, etc.) as base64."""
    db = get_db()
    user = await get_current_user(request, db)
    body = await request.json()
    
    resident = await db.residents.find_one({"_id": ObjectId(resident_id)})
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    if user["role"] == "hostel_admin" and user.get("hostel_id") != resident.get("hostel_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    updates = {}
    for field in ("photo_url", "aadhaar_number", "aadhaar_front", "aadhaar_back", "id_type", "id_number", "id_verified", "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation"):
        if field in body:
            updates[field] = body[field]
    
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc)
        await db.residents.update_one({"_id": ObjectId(resident_id)}, {"$set": updates})
    
    await db.activity_logs.insert_one({
        "user_id": user["_id"], "user_name": user.get("name", ""),
        "hostel_id": resident.get("hostel_id"), "action": "resident_documents_updated",
        "entity_type": "resident", "entity_id": resident_id,
        "details": f"Updated documents for: {resident.get('name', '')}",
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"message": "Documents updated"}

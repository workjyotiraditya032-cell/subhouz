from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime, timezone
import re
from database import get_db, parse_uuid
from auth import get_current_user
from services.event_bus import EventBus, BOOKING_CONFIRMED, DOCUMENT_SUBMITTED, VACANCY_UPDATE

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
    aadhaar_url: Optional[str] = None
    monthly_rent: float = 0
    security_deposit: float = 0
    due_date_override: Optional[int] = None
    check_in_date: Optional[str] = None
    agreement_start: Optional[str] = None
    agreement_end: Optional[str] = None

    @field_validator("aadhaar_url")
    @classmethod
    def validate_aadhaar_url(cls, v):
        if not v:
            return v
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Aadhaar URL must be a valid URL starting with http:// or https://")
        return v

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
    aadhaar_url: Optional[str] = None

    @field_validator("aadhaar_url")
    @classmethod
    def validate_aadhaar_url(cls, v):
        if not v:
            return v
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Aadhaar URL must be a valid URL starting with http:// or https://")
        return v

@router.get("")
async def list_residents(request: Request, hostel_id: Optional[str] = Query(None), status: Optional[str] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    
    q = db.table("residents").select("*")
    if user["role"] == "hostel_admin":
        q = q.eq("hostel_id", parse_uuid(user.get("hostel_id")))
    elif hostel_id:
        q = q.eq("hostel_id", parse_uuid(hostel_id))
    if status:
        q = q.eq("status", status)
        
    q = q.order("name", desc=False)
    res_res = await q.execute()
    residents = res_res.data
    
    for r in residents:
        r["_id"] = str(r["id"])
        r["id"] = r["_id"]
    return residents

@router.get("/{resident_id}")
async def get_resident(resident_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    res_uuid = parse_uuid(resident_id)
    res_resident = await db.table("residents").select("*").eq("id", res_uuid).execute()
    resident = res_resident.data[0] if res_resident.data else None
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
        
    if user["role"] == "hostel_admin" and user.get("hostel_id") != resident.get("hostel_id"):
        raise HTTPException(status_code=403, detail="Access denied")
        
    resident["_id"] = str(resident["id"])
    resident["id"] = resident["_id"]
    
    # Get payment history
    res_payments = await db.table("rent_payments").select("*").eq("resident_id", res_uuid).order("year", desc=True).order("month", desc=True).execute()
    payments = res_payments.data
    for p in payments:
        p["_id"] = str(p["id"])
        p["id"] = p["_id"]
        if p.get("paid_on"):
            p["paid_on"] = str(p["paid_on"])
            
    resident["payment_history"] = payments
    return resident

@router.post("")
async def create_resident(req: ResidentCreate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] == "hostel_admin" and user.get("hostel_id") != req.hostel_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    doc = req.model_dump()
    doc["hostel_id"] = parse_uuid(req.hostel_id)
    doc["room_id"] = parse_uuid(req.room_id) if req.room_id else None
    doc["bed_id"] = parse_uuid(req.bed_id) if req.bed_id else None
    doc["status"] = "active"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Resolve room/bed numbers
    if req.room_id:
        room_uuid = parse_uuid(req.room_id)
        res_room = await db.table("rooms").select("room_number").eq("id", room_uuid).execute()
        room = res_room.data[0] if res_room.data else None
        if room:
            doc["room_number"] = room.get("room_number", "")
            
    if req.bed_id:
        bed_uuid = parse_uuid(req.bed_id)
        res_bed = await db.table("beds").select("bed_number").eq("id", bed_uuid).execute()
        bed = res_bed.data[0] if res_bed.data else None
        if bed:
            doc["bed_number"] = bed.get("bed_number", "")
            
    if not doc.get("whatsapp"):
        doc["whatsapp"] = doc.get("phone")
        
    res_insert = await db.table("residents").insert(doc).execute()
    if not res_insert.data:
        raise HTTPException(status_code=500, detail="Failed to create resident")
        
    inserted_doc = res_insert.data[0]
    resident_id = str(inserted_doc["id"])
    inserted_doc["_id"] = resident_id
    inserted_doc["id"] = resident_id
    
    # Update bed status
    if req.bed_id:
        bed_uuid = parse_uuid(req.bed_id)
        await db.table("beds").update({
            "status": "occupied",
            "resident_id": parse_uuid(resident_id)
        }).eq("id", bed_uuid).execute()
        
    # Log activity
    await db.table("activity_logs").insert({
        "user_id": str(user["id"]),
        "user_name": user.get("name", ""),
        "hostel_id": inserted_doc["hostel_id"],
        "action": "resident_added",
        "entity_type": "resident",
        "entity_id": resident_id,
        "details": f"Added resident: {req.name}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    # Emit BOOKING_CONFIRMED → triggers Booking Confirmation + KYC Request automations
    await EventBus.emit(BOOKING_CONFIRMED, inserted_doc)

    return inserted_doc

@router.put("/{resident_id}")
async def update_resident(resident_id: str, req: ResidentUpdate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    res_uuid = parse_uuid(resident_id)
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Handle bed/room references conversion to UUID
    if "room_id" in updates and updates["room_id"]:
        updates["room_id"] = parse_uuid(updates["room_id"])
    if "bed_id" in updates and updates["bed_id"]:
        updates["bed_id"] = parse_uuid(updates["bed_id"])
        
    # Handle bed change
    if "bed_id" in updates:
        res_old = await db.table("residents").select("*").eq("id", res_uuid).execute()
        old_resident = res_old.data[0] if res_old.data else None
        
        if old_resident and old_resident.get("bed_id"):
            old_bed_uuid = parse_uuid(old_resident["bed_id"])
            await db.table("beds").update({"status": "available", "resident_id": None}).eq("id", old_bed_uuid).execute()

            # Emit VACANCY_UPDATE event for bed transfer
            await EventBus.emit(VACANCY_UPDATE, old_resident, 'transferred')
            
        if updates["bed_id"]:
            new_bed_uuid = parse_uuid(updates["bed_id"])
            await db.table("beds").update({
                "status": "occupied",
                "resident_id": res_uuid
            }).eq("id", new_bed_uuid).execute()
            
            res_bed = await db.table("beds").select("bed_number").eq("id", new_bed_uuid).execute()
            bed = res_bed.data[0] if res_bed.data else None
            if bed:
                updates["bed_number"] = bed.get("bed_number", "")
                
    if "room_id" in updates and updates["room_id"]:
        room_uuid = parse_uuid(updates["room_id"])
        res_room = await db.table("rooms").select("room_number").eq("id", room_uuid).execute()
        room = res_room.data[0] if res_room.data else None
        if room:
            updates["room_number"] = room.get("room_number", "")
            
    res_update = await db.table("residents").update(updates).eq("id", res_uuid).execute()
    if not res_update.data:
        raise HTTPException(status_code=404, detail="Resident not found")
        
    resident = res_update.data[0]
    resident["_id"] = str(resident["id"])
    resident["id"] = resident["_id"]
    return resident

@router.delete("/{resident_id}")
async def delete_resident(resident_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    res_uuid = parse_uuid(resident_id)
    res_resident = await db.table("residents").select("*").eq("id", res_uuid).execute()
    resident = res_resident.data[0] if res_resident.data else None
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
        
    # Free the bed
    if resident.get("bed_id"):
        bed_uuid = parse_uuid(resident["bed_id"])
        await db.table("beds").update({"status": "available", "resident_id": None}).eq("id", bed_uuid).execute()

    # Emit VACANCY_UPDATE event (booking cancelled)
    await EventBus.emit(VACANCY_UPDATE, resident, 'cancelled')

    await db.table("residents").delete().eq("id", res_uuid).execute()
    return {"message": "Resident deleted"}

@router.post("/{resident_id}/checkout")
async def checkout_resident(resident_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    res_uuid = parse_uuid(resident_id)
    res_resident = await db.table("residents").select("*").eq("id", res_uuid).execute()
    resident = res_resident.data[0] if res_resident.data else None
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
        
    # Free the bed
    if resident.get("bed_id"):
        bed_uuid = parse_uuid(resident["bed_id"])
        await db.table("beds").update({"status": "available", "resident_id": None}).eq("id", bed_uuid).execute()

    # Emit VACANCY_UPDATE event (resident checkout)
    await EventBus.emit(VACANCY_UPDATE, resident, 'checkout')
        
    await db.table("residents").update({
        "status": "checked_out",
        "check_out_date": datetime.now(timezone.utc).isoformat(),
        "bed_id": None,
        "room_id": None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", res_uuid).execute()
    
    await db.table("activity_logs").insert({
        "user_id": str(user["id"]),
        "user_name": user.get("name", ""),
        "hostel_id": resident.get("hostel_id"),
        "action": "resident_checkout",
        "entity_type": "resident",
        "entity_id": resident_id,
        "details": f"Checked out resident: {resident.get('name', '')}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    return {"message": "Resident checked out"}

@router.put("/{resident_id}/documents")
async def update_resident_documents(resident_id: str, request: Request):
    """Upload/update resident documents (photo, Aadhaar, etc.) as base64."""
    db = get_db()
    user = await get_current_user(request, db)
    body = await request.json()
    
    res_uuid = parse_uuid(resident_id)
    res_resident = await db.table("residents").select("*").eq("id", res_uuid).execute()
    resident = res_resident.data[0] if res_resident.data else None
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
        
    if user["role"] == "hostel_admin" and user.get("hostel_id") != resident.get("hostel_id"):
        raise HTTPException(status_code=403, detail="Access denied")
        
    updates = {}
    for field in ("aadhaar_url", "id_type", "id_number", "id_verified", "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation"):
        if field in body:
            updates[field] = body[field]
            
    if "aadhaar_url" in updates and updates["aadhaar_url"]:
        url = updates["aadhaar_url"]
        if not (url.startswith("http://") or url.startswith("https://")):
            raise HTTPException(status_code=400, detail="Aadhaar URL must be a valid URL starting with http:// or https://")
            
        # Emit DOCUMENT_SUBMITTED event → Document Storage automation
        updates["id_verified"] = False
        await EventBus.emit(DOCUMENT_SUBMITTED, resident, url)
            
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.table("residents").update(updates).eq("id", res_uuid).execute()
        
    await db.table("activity_logs").insert({
        "user_id": str(user["id"]),
        "user_name": user.get("name", ""),
        "hostel_id": resident.get("hostel_id"),
        "action": "resident_documents_updated",
        "entity_type": "resident",
        "entity_id": resident_id,
        "details": f"Updated documents for: {resident.get('name', '')}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    return {"message": "Documents updated"}

import logging
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel, field_validator, model_validator
from typing import Optional
from datetime import datetime, timezone
import re
from dateutil import parser as date_parser
from database import get_db, parse_uuid
from auth import get_current_user
from services.event_bus import EventBus, BOOKING_CONFIRMED, DOCUMENT_SUBMITTED, VACANCY_UPDATE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/residents", tags=["residents"])

def clean_and_validate_aadhaar_number(v: Optional[str]) -> Optional[str]:
    if not v or not str(v).strip():
        return None
    cleaned = re.sub(r"\s+", "", str(v).strip())
    if not re.match(r"^\d{12}$", cleaned):
        raise ValueError("Aadhaar Number must be exactly 12 digits")
    return cleaned

def normalize_date_string(v: Optional[str]) -> Optional[str]:
    if not v or not str(v).strip():
        return None
    s = str(v).strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s
    try:
        parsed = date_parser.parse(s)
        return parsed.strftime("%Y-%m-%d")
    except Exception:
        raise ValueError(f"Invalid date format: '{v}'. Expected YYYY-MM-DD or standard date.")

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
    aadhaar_number: Optional[str] = None
    aadhaar_url: Optional[str] = None
    monthly_rent: float = 0
    security_deposit: float = 0
    due_date_override: Optional[int] = None
    check_in_date: Optional[str] = None
    agreement_start: Optional[str] = None
    agreement_end: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if not v or not str(v).strip():
            raise ValueError("Resident name is required")
        return str(v).strip()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if not v or not str(v).strip():
            raise ValueError("Phone number is required")
        cleaned = re.sub(r"[^\d+]", "", str(v).strip())
        digits_only = re.sub(r"\D", "", cleaned)
        if len(digits_only) < 10:
            raise ValueError("Phone number must contain at least 10 digits")
        return cleaned

    @field_validator("check_in_date", "agreement_start", "agreement_end")
    @classmethod
    def validate_dates(cls, v):
        return normalize_date_string(v)

    @field_validator("aadhaar_number")
    @classmethod
    def validate_aadhaar_number(cls, v):
        return clean_and_validate_aadhaar_number(v)

    @field_validator("aadhaar_url")
    @classmethod
    def validate_aadhaar_url(cls, v):
        if not v or not str(v).strip():
            return None
        v = str(v).strip()
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Aadhaar URL must be a valid URL starting with http:// or https://")
        return v

    @model_validator(mode="after")
    def validate_agreement_range(self):
        if self.agreement_start and self.agreement_end:
            if self.agreement_end < self.agreement_start:
                raise ValueError("Agreement End date cannot be earlier than Agreement Start date")
        return self

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
    guardian_relation: Optional[str] = None
    permanent_address: Optional[str] = None
    monthly_rent: Optional[float] = None
    security_deposit: Optional[float] = None
    due_date_override: Optional[int] = None
    status: Optional[str] = None
    room_id: Optional[str] = None
    bed_id: Optional[str] = None
    check_in_date: Optional[str] = None
    agreement_start: Optional[str] = None
    agreement_end: Optional[str] = None
    aadhaar_number: Optional[str] = None
    aadhaar_url: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if v is not None and not str(v).strip():
            raise ValueError("Resident name cannot be empty")
        return str(v).strip() if v is not None else None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v is not None:
            cleaned = re.sub(r"[^\d+]", "", str(v).strip())
            digits_only = re.sub(r"\D", "", cleaned)
            if len(digits_only) < 10:
                raise ValueError("Phone number must contain at least 10 digits")
            return cleaned
        return None

    @field_validator("check_in_date", "agreement_start", "agreement_end")
    @classmethod
    def validate_dates(cls, v):
        return normalize_date_string(v)

    @field_validator("aadhaar_number")
    @classmethod
    def validate_aadhaar_number(cls, v):
        return clean_and_validate_aadhaar_number(v)

    @field_validator("aadhaar_url")
    @classmethod
    def validate_aadhaar_url(cls, v):
        if not v or not str(v).strip():
            return None
        v = str(v).strip()
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Aadhaar URL must be a valid URL starting with http:// or https://")
        return v

    @model_validator(mode="after")
    def validate_agreement_range(self):
        if self.agreement_start and self.agreement_end:
            if self.agreement_end < self.agreement_start:
                raise ValueError("Agreement End date cannot be earlier than Agreement Start date")
        return self

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
        r["aadhaar_number"] = r.get("aadhaar_number") or r.get("id_number") or None
        r["aadhaar_url"] = r.get("aadhaar_url") or None
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
    resident["aadhaar_number"] = resident.get("aadhaar_number") or resident.get("id_number") or None
    resident["aadhaar_url"] = resident.get("aadhaar_url") or None
    
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
    room_id = req.room_id.strip() if req.room_id and str(req.room_id).strip() else None
    bed_id = req.bed_id.strip() if req.bed_id and str(req.bed_id).strip() else None
    doc["room_id"] = parse_uuid(room_id) if room_id else None
    doc["bed_id"] = parse_uuid(bed_id) if bed_id else None
    doc["status"] = "active"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # aadhaar_number was dropped from residents schema in favor of id_number/id_type.
    # Pop it from doc so PostgREST doesn't fail with schema cache error PGRST204.
    aadhaar_num = doc.pop("aadhaar_number", None)
    if aadhaar_num and str(aadhaar_num).strip():
        doc["id_number"] = str(aadhaar_num).strip()
        doc["id_type"] = "aadhaar"
    
    # Resolve room/bed numbers
    if doc["room_id"]:
        res_room = await db.table("rooms").select("room_number").eq("id", doc["room_id"]).execute()
        room = res_room.data[0] if res_room.data else None
        if room:
            doc["room_number"] = room.get("room_number", "")
            
    if doc["bed_id"]:
        res_bed = await db.table("beds").select("bed_number").eq("id", doc["bed_id"]).execute()
        bed = res_bed.data[0] if res_bed.data else None
        if bed:
            doc["bed_number"] = bed.get("bed_number", "")
            
    if not doc.get("whatsapp"):
        doc["whatsapp"] = doc.get("phone")
        
    try:
        res_insert = await db.table("residents").insert(doc).execute()
        if not res_insert.data:
            raise HTTPException(status_code=500, detail="Failed to save resident to database")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error creating resident in Supabase")
        err_str = str(e)
        if "duplicate key" in err_str.lower() or "unique constraint" in err_str.lower():
            raise HTTPException(status_code=409, detail="A resident with this phone number or ID already exists.")
        raise HTTPException(status_code=400, detail=f"Database error while saving resident: {err_str.splitlines()[0] if err_str else 'Unknown error'}")
        
    inserted_doc = res_insert.data[0]
    resident_id = str(inserted_doc["id"])
    inserted_doc["_id"] = resident_id
    inserted_doc["id"] = resident_id
    inserted_doc["aadhaar_number"] = inserted_doc.get("aadhaar_number") or inserted_doc.get("id_number") or None
    
    # Update bed status
    if doc["bed_id"]:
        await db.table("beds").update({
            "status": "occupied",
            "resident_id": parse_uuid(resident_id)
        }).eq("id", doc["bed_id"]).execute()
        
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
    
    # aadhaar_number was dropped from residents schema in favor of id_number/id_type
    if "aadhaar_number" in updates:
        aadhaar_val = updates.pop("aadhaar_number", None)
        if aadhaar_val and str(aadhaar_val).strip():
            updates["id_number"] = str(aadhaar_val).strip()
            updates["id_type"] = "aadhaar"
        elif aadhaar_val is not None:
            updates["id_number"] = None
            updates["id_type"] = None
    
    # Handle bed/room references conversion to UUID
    if "room_id" in updates:
        r_id = updates["room_id"].strip() if updates["room_id"] and str(updates["room_id"]).strip() else None
        updates["room_id"] = parse_uuid(r_id) if r_id else None
    if "bed_id" in updates:
        b_id = updates["bed_id"].strip() if updates["bed_id"] and str(updates["bed_id"]).strip() else None
        updates["bed_id"] = parse_uuid(b_id) if b_id else None
        
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
            new_bed_uuid = updates["bed_id"]
            await db.table("beds").update({
                "status": "occupied",
                "resident_id": res_uuid
            }).eq("id", new_bed_uuid).execute()
            
            res_bed = await db.table("beds").select("bed_number").eq("id", new_bed_uuid).execute()
            bed = res_bed.data[0] if res_bed.data else None
            if bed:
                updates["bed_number"] = bed.get("bed_number", "")
        else:
            updates["bed_number"] = None
                
    if "room_id" in updates and updates["room_id"]:
        room_uuid = updates["room_id"]
        res_room = await db.table("rooms").select("room_number").eq("id", room_uuid).execute()
        room = res_room.data[0] if res_room.data else None
        if room:
            updates["room_number"] = room.get("room_number", "")
    elif "room_id" in updates and not updates["room_id"]:
        updates["room_number"] = None
            
    try:
        res_update = await db.table("residents").update(updates).eq("id", res_uuid).execute()
    except Exception as e:
        logger.exception("Failed to update resident in database")
        error_msg = str(e)
        if "duplicate key" in error_msg.lower() or "unique constraint" in error_msg.lower():
            raise HTTPException(status_code=409, detail="A resident with this phone number or ID already exists.")
        raise HTTPException(status_code=400, detail=f"Database error while updating resident: {error_msg.splitlines()[0] if error_msg else 'Unknown error'}")

    if not res_update.data:
        raise HTTPException(status_code=404, detail="Resident not found")
        
    resident = res_update.data[0]
    resident["_id"] = str(resident["id"])
    resident["id"] = resident["_id"]
    resident["aadhaar_number"] = resident.get("aadhaar_number") or resident.get("id_number") or None
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
    for field in ("aadhaar_number", "aadhaar_url", "id_type", "id_number", "id_verified", "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation"):
        if field in body:
            updates[field] = body[field]

    if "aadhaar_number" in updates:
        val = updates.pop("aadhaar_number", None)
        if val and str(val).strip():
            try:
                clean_num = clean_and_validate_aadhaar_number(val)
                updates["id_number"] = clean_num
                updates["id_type"] = "aadhaar"
            except ValueError as ve:
                raise HTTPException(status_code=400, detail=str(ve))
        else:
            updates["id_number"] = None
            updates["id_type"] = None

    if "aadhaar_url" in updates and updates["aadhaar_url"]:
        url = updates["aadhaar_url"]
        if not (url.startswith("http://") or url.startswith("https://")):
            raise HTTPException(status_code=400, detail="Aadhaar URL must be a valid URL starting with http:// or https://")
            
        # Emit DOCUMENT_SUBMITTED event → Document Storage automation
        updates["id_verified"] = False
        await EventBus.emit(DOCUMENT_SUBMITTED, resident, url)
            
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        try:
            await db.table("residents").update(updates).eq("id", res_uuid).execute()
        except Exception as e:
            logger.exception("Failed to update resident documents in database")
            raise HTTPException(status_code=400, detail=f"Database error while saving documents: {str(e).splitlines()[0]}")
        
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

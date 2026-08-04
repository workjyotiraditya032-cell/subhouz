from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from database import get_db, parse_uuid
from auth import get_current_user

router = APIRouter(prefix="/api/rooms", tags=["rooms"])

class RoomCreate(BaseModel):
    hostel_id: str
    building_name: str = "Main Building"
    floor_number: int = 0
    room_number: str
    room_type: str = "bachelor"
    ac_type: str = "non_ac"
    capacity: int = 1
    rent: float = 0
    electricity_rate: float = 8.0
    has_bathroom: bool = False
    has_attached_bathroom: bool = False
    hasAttachedBathroom: Optional[bool] = None
    has_balcony: bool = False
    amenities: list = []

class RoomUpdate(BaseModel):
    building_name: Optional[str] = None
    floor_number: Optional[int] = None
    room_number: Optional[str] = None
    room_type: Optional[str] = None
    ac_type: Optional[str] = None
    capacity: Optional[int] = None
    rent: Optional[float] = None
    electricity_rate: Optional[float] = None
    has_bathroom: Optional[bool] = None
    has_attached_bathroom: Optional[bool] = None
    hasAttachedBathroom: Optional[bool] = None
    has_balcony: Optional[bool] = None
    status: Optional[str] = None
    amenities: Optional[list] = None

def compute_room_status(occupied: int, total_beds: int) -> str:
    if total_beds == 0:
        return "unavailable"
    if occupied == 0:
        return "available"
    if 0 < occupied < total_beds:
        return "partially_occupied"
    if occupied >= total_beds:
        return "occupied"
    return "available"

def format_room(r: dict) -> dict:
    r["_id"] = str(r["id"])
    r["id"] = r["_id"]
    attached = bool(r.get("has_attached_bathroom") if r.get("has_attached_bathroom") is not None else r.get("has_bathroom"))
    r["has_attached_bathroom"] = attached
    r["hasAttachedBathroom"] = attached
    r["has_bathroom"] = attached
    return r

@router.get("")
async def list_rooms(request: Request, hostel_id: Optional[str] = Query(None), has_attached_bathroom: Optional[bool] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    
    q = db.table("rooms").select("*")
    if user["role"] == "hostel_admin":
        q = q.eq("hostel_id", parse_uuid(user.get("hostel_id")))
    elif hostel_id:
        q = q.eq("hostel_id", parse_uuid(hostel_id))
        
    res_rooms = await q.execute()
    rooms = res_rooms.data
    
    formatted_rooms = []
    for r in rooms:
        format_room(r)
        
        # Count occupied beds
        res_occ = await db.table("beds").select("id", count="exact").eq("room_id", r["id"]).eq("status", "occupied").execute()
        r["occupied"] = res_occ.count or 0
        
        # Count total beds
        res_tb = await db.table("beds").select("id", count="exact").eq("room_id", r["id"]).execute()
        r["total_beds"] = res_tb.count or 0
        r["available_beds"] = max(0, r["total_beds"] - r["occupied"])
        
        # Compute dynamic status
        r["status"] = compute_room_status(r["occupied"], r["total_beds"])
        
        if has_attached_bathroom is not None:
            if r["has_attached_bathroom"] == has_attached_bathroom:
                formatted_rooms.append(r)
        else:
            formatted_rooms.append(r)
        
    return formatted_rooms

@router.get("/{room_id}")
async def get_room(room_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    room_uuid = parse_uuid(room_id)
    res_room = await db.table("rooms").select("*").eq("id", room_uuid).execute()
    room = res_room.data[0] if res_room.data else None
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    if user["role"] == "hostel_admin" and user.get("hostel_id") != room.get("hostel_id"):
        raise HTTPException(status_code=403, detail="Access denied")
        
    format_room(room)
    
    res_beds = await db.table("beds").select("*").eq("room_id", room_uuid).execute()
    beds = res_beds.data
    for b in beds:
        b["_id"] = str(b["id"])
        b["id"] = b["_id"]
        
    room["beds"] = beds

    res_occ = await db.table("beds").select("id", count="exact").eq("room_id", room_uuid).eq("status", "occupied").execute()
    room["occupied"] = res_occ.count or 0
    room["total_beds"] = len(beds)
    room["available_beds"] = max(0, room["total_beds"] - room["occupied"])
    room["status"] = compute_room_status(room["occupied"], room["total_beds"])

    return room

@router.post("")
async def create_room(req: RoomCreate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] == "hostel_admin" and user.get("hostel_id") != req.hostel_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    attached_val = req.hasAttachedBathroom if req.hasAttachedBathroom is not None else (req.has_attached_bathroom or req.has_bathroom or False)
    doc = req.model_dump()
    doc.pop("hasAttachedBathroom", None)
    doc.pop("has_attached_bathroom", None)
    doc["has_bathroom"] = attached_val
    doc["hostel_id"] = parse_uuid(req.hostel_id)
    doc["status"] = "available"
    doc["occupied"] = 0
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    res_insert = await db.table("rooms").insert(doc).execute()
    if not res_insert.data:
        raise HTTPException(status_code=500, detail="Failed to create room")
        
    inserted_doc = res_insert.data[0]
    room_id = str(inserted_doc["id"])
    format_room(inserted_doc)
    
    # Auto-create beds
    for i in range(1, req.capacity + 1):
        bed_doc = {
            "hostel_id": parse_uuid(req.hostel_id),
            "room_id": parse_uuid(room_id),
            "bed_number": f"B{i}",
            "status": "available",
            "resident_id": None,
            "monthly_rent": req.rent,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.table("beds").insert(bed_doc).execute()
        
    inserted_doc["total_beds"] = req.capacity
    return inserted_doc

@router.put("/{room_id}")
async def update_room(room_id: str, req: RoomUpdate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    room_uuid = parse_uuid(room_id)
    attached_val = req.hasAttachedBathroom if req.hasAttachedBathroom is not None else (req.has_attached_bathroom if req.has_attached_bathroom is not None else req.has_bathroom)
    
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updates.pop("hasAttachedBathroom", None)
    updates.pop("has_attached_bathroom", None)
    if attached_val is not None:
        updates["has_bathroom"] = attached_val
    
    res_update = await db.table("rooms").update(updates).eq("id", room_uuid).execute()
    if not res_update.data:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room = res_update.data[0]
    format_room(room)

    # Sync beds table if capacity or rent changed
    if req.capacity is not None or req.rent is not None:
        res_beds = await db.table("beds").select("*").eq("room_id", room_uuid).execute()
        existing_beds = res_beds.data or []
        current_count = len(existing_beds)

        if req.rent is not None:
            await db.table("beds").update({"monthly_rent": req.rent}).eq("room_id", room_uuid).eq("status", "available").execute()

        if req.capacity is not None:
            new_capacity = req.capacity
            if new_capacity > current_count:
                hostel_id = room.get("hostel_id")
                for i in range(current_count + 1, new_capacity + 1):
                    bed_doc = {
                        "hostel_id": parse_uuid(str(hostel_id)) if hostel_id else None,
                        "room_id": room_uuid,
                        "bed_number": f"B{i}",
                        "status": "available",
                        "resident_id": None,
                        "monthly_rent": req.rent if req.rent is not None else room.get("rent", 0),
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.table("beds").insert(bed_doc).execute()
            elif new_capacity < current_count:
                excess = current_count - new_capacity
                available_beds = [b for b in existing_beds if b.get("status") == "available"]
                available_beds.sort(key=lambda b: b.get("bed_number", ""), reverse=True)
                to_delete = available_beds[:excess]
                for b in to_delete:
                    b_uuid = parse_uuid(str(b["id"]))
                    await db.table("beds").delete().eq("id", b_uuid).execute()

    # Recalculate occupied & total_beds counts
    res_occ = await db.table("beds").select("id", count="exact").eq("room_id", room_uuid).eq("status", "occupied").execute()
    res_tb = await db.table("beds").select("id", count="exact").eq("room_id", room_uuid).execute()
    room["occupied"] = res_occ.count or 0
    room["total_beds"] = res_tb.count or 0
    room["available_beds"] = max(0, room["total_beds"] - room["occupied"])
    room["status"] = compute_room_status(room["occupied"], room["total_beds"])

    return room

@router.delete("/{room_id}")
async def delete_room(room_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    room_uuid = parse_uuid(room_id)
    res_del = await db.table("rooms").delete().eq("id", room_uuid).execute()
    if not res_del.data:
        raise HTTPException(status_code=404, detail="Room not found")
        
    # Beds are deleted cascade by foreign key, but we also run delete on beds table to make sure
    await db.table("beds").delete().eq("room_id", room_uuid).execute()
    return {"message": "Room and beds deleted"}

# Bed endpoints
@router.get("/beds/all")
async def list_beds(request: Request, hostel_id: Optional[str] = Query(None), room_id: Optional[str] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    
    q = db.table("beds").select("*")
    if user["role"] == "hostel_admin":
        q = q.eq("hostel_id", parse_uuid(user.get("hostel_id")))
    elif hostel_id:
        q = q.eq("hostel_id", parse_uuid(hostel_id))
    if room_id:
        q = q.eq("room_id", parse_uuid(room_id))
        
    res_beds = await q.execute()
    beds = res_beds.data
    for b in beds:
        b["_id"] = str(b["id"])
        b["id"] = b["_id"]
    return beds

@router.put("/beds/{bed_id}")
async def update_bed(bed_id: str, request: Request):
    db = get_db()
    body = await request.json()
    
    bed_uuid = parse_uuid(bed_id)
    updates = {k: v for k, v in body.items() if k != "_id" and k != "id"}
    if "hostel_id" in updates and updates["hostel_id"]:
        updates["hostel_id"] = parse_uuid(updates["hostel_id"])
    if "room_id" in updates and updates["room_id"]:
        updates["room_id"] = parse_uuid(updates["room_id"])
    if "resident_id" in updates and updates["resident_id"]:
        updates["resident_id"] = parse_uuid(updates["resident_id"])
        
    res_update = await db.table("beds").update(updates).eq("id", bed_uuid).execute()
    if not res_update.data:
        raise HTTPException(status_code=404, detail="Bed not found")
        
    bed = res_update.data[0]
    bed["_id"] = str(bed["id"])
    bed["id"] = bed["_id"]
    return bed

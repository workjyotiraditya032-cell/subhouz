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
    has_bathroom: bool = True
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
    has_balcony: Optional[bool] = None
    status: Optional[str] = None
    amenities: Optional[list] = None

@router.get("")
async def list_rooms(request: Request, hostel_id: Optional[str] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    
    q = db.table("rooms").select("*")
    if user["role"] == "hostel_admin":
        q = q.eq("hostel_id", parse_uuid(user.get("hostel_id")))
    elif hostel_id:
        q = q.eq("hostel_id", parse_uuid(hostel_id))
        
    res_rooms = await q.execute()
    rooms = res_rooms.data
    
    for r in rooms:
        r["_id"] = str(r["id"])
        r["id"] = r["_id"]
        
        # Count occupied beds
        res_occ = await db.table("beds").select("id", count="exact").eq("room_id", r["id"]).eq("status", "occupied").execute()
        r["occupied"] = res_occ.count or 0
        
        # Count total beds
        res_tb = await db.table("beds").select("id", count="exact").eq("room_id", r["id"]).execute()
        r["total_beds"] = res_tb.count or 0
        
    return rooms

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
        
    room["_id"] = str(room["id"])
    room["id"] = room["_id"]
    
    res_beds = await db.table("beds").select("*").eq("room_id", room_uuid).execute()
    beds = res_beds.data
    for b in beds:
        b["_id"] = str(b["id"])
        b["id"] = b["_id"]
        
    room["beds"] = beds
    return room

@router.post("")
async def create_room(req: RoomCreate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] == "hostel_admin" and user.get("hostel_id") != req.hostel_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    doc = req.model_dump()
    doc["hostel_id"] = parse_uuid(req.hostel_id)
    doc["status"] = "available"
    doc["occupied"] = 0
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    res_insert = await db.table("rooms").insert(doc).execute()
    if not res_insert.data:
        raise HTTPException(status_code=500, detail="Failed to create room")
        
    inserted_doc = res_insert.data[0]
    room_id = str(inserted_doc["id"])
    inserted_doc["_id"] = room_id
    inserted_doc["id"] = room_id
    
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
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    
    res_update = await db.table("rooms").update(updates).eq("id", room_uuid).execute()
    if not res_update.data:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room = res_update.data[0]
    room["_id"] = str(room["id"])
    room["id"] = room["_id"]
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

from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from database import get_db
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
    query = {}
    if user["role"] == "hostel_admin":
        query["hostel_id"] = user.get("hostel_id")
    elif hostel_id:
        query["hostel_id"] = hostel_id
    
    rooms = await db.rooms.find(query).to_list(500)
    for r in rooms:
        r["_id"] = str(r["_id"])
        r["id"] = r["_id"]
        r["occupied"] = await db.beds.count_documents({"room_id": r["id"], "status": "occupied"})
        total_beds = await db.beds.count_documents({"room_id": r["id"]})
        r["total_beds"] = total_beds
    return rooms

@router.get("/{room_id}")
async def get_room(room_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    room = await db.rooms.find_one({"_id": ObjectId(room_id)})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if user["role"] == "hostel_admin" and user.get("hostel_id") != room.get("hostel_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    room["_id"] = str(room["_id"])
    room["id"] = room["_id"]
    beds = await db.beds.find({"room_id": room_id}).to_list(50)
    for b in beds:
        b["_id"] = str(b["_id"])
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
    doc["status"] = "available"
    doc["occupied"] = 0
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.rooms.insert_one(doc)
    room_id = str(result.inserted_id)
    doc["_id"] = room_id
    doc["id"] = room_id
    
    # Auto-create beds
    for i in range(1, req.capacity + 1):
        bed_doc = {
            "hostel_id": req.hostel_id,
            "room_id": room_id,
            "bed_number": f"B{i}",
            "status": "available",
            "resident_id": None,
            "monthly_rent": req.rent,
            "created_at": datetime.now(timezone.utc)
        }
        await db.beds.insert_one(bed_doc)
    
    doc["total_beds"] = req.capacity
    return doc

@router.put("/{room_id}")
async def update_room(room_id: str, req: RoomUpdate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.rooms.update_one({"_id": ObjectId(room_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Room not found")
    room = await db.rooms.find_one({"_id": ObjectId(room_id)})
    room["_id"] = str(room["_id"])
    room["id"] = room["_id"]
    return room

@router.delete("/{room_id}")
async def delete_room(room_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    result = await db.rooms.delete_one({"_id": ObjectId(room_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Room not found")
    await db.beds.delete_many({"room_id": room_id})
    return {"message": "Room and beds deleted"}

# Bed endpoints
@router.get("/beds/all")
async def list_beds(request: Request, hostel_id: Optional[str] = Query(None), room_id: Optional[str] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    query = {}
    if user["role"] == "hostel_admin":
        query["hostel_id"] = user.get("hostel_id")
    elif hostel_id:
        query["hostel_id"] = hostel_id
    if room_id:
        query["room_id"] = room_id
    
    beds = await db.beds.find(query).to_list(1000)
    for b in beds:
        b["_id"] = str(b["_id"])
        b["id"] = b["_id"]
    return beds

@router.put("/beds/{bed_id}")
async def update_bed(bed_id: str, request: Request):
    db = get_db()
    body = await request.json()
    updates = {k: v for k, v in body.items() if k != "_id" and k != "id"}
    result = await db.beds.update_one({"_id": ObjectId(bed_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bed not found")
    bed = await db.beds.find_one({"_id": ObjectId(bed_id)})
    bed["_id"] = str(bed["_id"])
    bed["id"] = bed["_id"]
    return bed

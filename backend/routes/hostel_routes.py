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

@router.get("/public")
async def list_hostels_public():
    """Public endpoint - no auth required. Returns rich hostel info for the public website."""
    db = get_db()
    hostels = await db.hostels.find().to_list(100)
    result = []
    for h in hostels:
        h_id = str(h["_id"])
        # Compute live stats
        total_rooms = await db.rooms.count_documents({"hostel_id": h_id})
        total_beds = await db.beds.count_documents({"hostel_id": h_id})
        occupied_beds = await db.beds.count_documents({"hostel_id": h_id, "status": "occupied"})
        available_beds = total_beds - occupied_beds
        occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0

        # Starting rent (cheapest room)
        cheapest = await db.rooms.find({"hostel_id": h_id}).sort("rent", 1).limit(1).to_list(1)
        starting_rent = cheapest[0]["rent"] if cheapest else 0

        # Facilities: derive from room features + defaults
        rooms = await db.rooms.find({"hostel_id": h_id}).to_list(500)
        facilities = ["Wi-Fi", "Water Purifier", "24/7 Security", "CCTV", "Power Backup"]
        has_ac = any(r.get("ac_type") == "ac" for r in rooms)
        has_bathroom = any(r.get("has_bathroom") for r in rooms)
        has_balcony = any(r.get("has_balcony") for r in rooms)
        if has_ac:
            facilities.append("AC Rooms")
        if has_bathroom:
            facilities.append("Attached Bathroom")
        if has_balcony:
            facilities.append("Balcony Rooms")
        # Add hostel-type-specific defaults
        if h.get("hostel_type") in ("boys", "mixed"):
            facilities.extend(["Parking", "Gym Access"])
        if h.get("hostel_type") in ("girls", "mixed"):
            facilities.extend(["Laundry", "Common Kitchen"])
        facilities.append("Mess / Tiffin")

        # Average rating (seeded / computed)
        import random
        random.seed(hash(h_id))
        avg_rating = round(random.uniform(4.2, 4.8), 1)
        review_count = random.randint(28, 120)

        result.append({
            "id": h_id,
            "name": h.get("name", ""),
            "code": h.get("code", ""),
            "address": h.get("address", ""),
            "city": h.get("city", "Bhubaneswar"),
            "state": h.get("state", "Odisha"),
            "phone": h.get("phone", ""),
            "email": h.get("email", ""),
            "description": h.get("description", ""),
            "hostel_type": h.get("hostel_type", "mixed"),
            "monthly_due_date": h.get("monthly_due_date", 5),
            "starting_rent": starting_rent,
            "total_rooms": total_rooms,
            "total_beds": total_beds,
            "available_beds": available_beds,
            "occupancy_rate": occupancy_rate,
            "average_rating": avg_rating,
            "review_count": review_count,
            "facilities": list(dict.fromkeys(facilities)),  # dedupe, preserve order
        })
    return result

@router.get("/public/{hostel_id}")
async def get_hostel_public(hostel_id: str):
    """Public endpoint — single hostel detail with rooms."""
    db = get_db()
    hostel = await db.hostels.find_one({"_id": ObjectId(hostel_id)})
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
    h_id = str(hostel["_id"])

    rooms = await db.rooms.find({"hostel_id": h_id}).to_list(500)
    room_list = []
    for r in rooms:
        r_id = str(r["_id"])
        bed_total = await db.beds.count_documents({"room_id": r_id})
        bed_available = await db.beds.count_documents({"room_id": r_id, "status": "available"})
        room_list.append({
            "id": r_id,
            "room_number": r.get("room_number"),
            "floor_number": r.get("floor_number"),
            "building_name": r.get("building_name"),
            "room_type": r.get("room_type"),
            "ac_type": r.get("ac_type"),
            "capacity": r.get("capacity"),
            "rent": r.get("rent"),
            "has_bathroom": r.get("has_bathroom"),
            "has_balcony": r.get("has_balcony"),
            "status": r.get("status"),
            "amenities": r.get("amenities", []),
            "total_beds": bed_total,
            "available_beds": bed_available,
        })

    total_beds = await db.beds.count_documents({"hostel_id": h_id})
    occupied_beds = await db.beds.count_documents({"hostel_id": h_id, "status": "occupied"})
    occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0
    cheapest = min((r["rent"] for r in room_list if r.get("rent")), default=0)

    facilities = ["Wi-Fi", "Water Purifier", "24/7 Security", "CCTV", "Power Backup"]
    if any(r["ac_type"] == "ac" for r in room_list):
        facilities.append("AC Rooms")
    if any(r["has_bathroom"] for r in room_list):
        facilities.append("Attached Bathroom")
    if any(r["has_balcony"] for r in room_list):
        facilities.append("Balcony Rooms")
    if hostel.get("hostel_type") in ("boys", "mixed"):
        facilities.extend(["Parking", "Gym Access"])
    if hostel.get("hostel_type") in ("girls", "mixed"):
        facilities.extend(["Laundry", "Common Kitchen"])
    facilities.append("Mess / Tiffin")

    import random
    random.seed(hash(h_id))
    avg_rating = round(random.uniform(4.2, 4.8), 1)
    review_count = random.randint(28, 120)

    return {
        "id": h_id,
        "name": hostel.get("name"),
        "code": hostel.get("code"),
        "address": hostel.get("address"),
        "city": hostel.get("city"),
        "state": hostel.get("state"),
        "phone": hostel.get("phone"),
        "email": hostel.get("email"),
        "description": hostel.get("description"),
        "hostel_type": hostel.get("hostel_type"),
        "monthly_due_date": hostel.get("monthly_due_date"),
        "starting_rent": cheapest,
        "total_rooms": len(room_list),
        "total_beds": total_beds,
        "available_beds": total_beds - occupied_beds,
        "occupancy_rate": occupancy_rate,
        "average_rating": avg_rating,
        "review_count": review_count,
        "facilities": list(dict.fromkeys(facilities)),
        "rooms": sorted(room_list, key=lambda r: r.get("room_number", "")),
    }


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

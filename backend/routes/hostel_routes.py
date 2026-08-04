from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from database import get_db, parse_uuid
from auth import get_current_user
from services.search_db import get_property_metadata, save_or_update_property_metadata
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/hostels", tags=["hostels"])

class HostelCreate(BaseModel):
    name: str
    code: str
    address: str
    city: str = "Bengaluru"
    state: str = "Karnataka"
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    hostel_type: str = "mixed"
    monthly_due_date: int = 5
    reminder_grace_days: int = 3
    follow_up_days: int = 7
    
    # Advanced metadata fields
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    nearby_colleges: Optional[List[str]] = None
    nearby_schools: Optional[List[str]] = None
    nearby_landmarks: Optional[List[str]] = None
    nearby_metro: Optional[List[str]] = None
    nearby_bus_stop: Optional[List[str]] = None
    aliases: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    property_type: Optional[str] = None
    gender: Optional[str] = None
    facilities: Optional[List[str]] = None
    area: Optional[str] = None
    country: Optional[str] = None

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
    
    # Advanced metadata fields
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    nearby_colleges: Optional[List[str]] = None
    nearby_schools: Optional[List[str]] = None
    nearby_landmarks: Optional[List[str]] = None
    nearby_metro: Optional[List[str]] = None
    nearby_bus_stop: Optional[List[str]] = None
    aliases: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    property_type: Optional[str] = None
    gender: Optional[str] = None
    facilities: Optional[List[str]] = None
    area: Optional[str] = None
    country: Optional[str] = None

@router.get("/public")
async def list_hostels_public():
    """Public endpoint - no auth required. Returns rich hostel info for the public website."""
    db = get_db()
    res_hostels = await db.table("hostels").select("*").execute()
    hostels = res_hostels.data
    result = []
    
    for h in hostels:
        h_id = str(h["id"])
        
        # Compute live stats
        res_total_rooms = await db.table("rooms").select("id", count="exact").eq("hostel_id", h_id).execute()
        total_rooms = res_total_rooms.count or 0
        
        res_total_beds = await db.table("beds").select("id", count="exact").eq("hostel_id", h_id).execute()
        total_beds = res_total_beds.count or 0
        
        res_occ_beds = await db.table("beds").select("id", count="exact").eq("hostel_id", h_id).eq("status", "occupied").execute()
        occupied_beds = res_occ_beds.count or 0
        
        available_beds = total_beds - occupied_beds
        occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0

        # Starting rent (cheapest room)
        res_cheapest = await db.table("rooms").select("rent").eq("hostel_id", h_id).gt("rent", 0).order("rent", desc=False).limit(1).execute()
        starting_rent = res_cheapest.data[0]["rent"] if res_cheapest.data else 0

        # Facilities: derive from room features + defaults
        res_rooms = await db.table("rooms").select("*").eq("hostel_id", h_id).execute()
        rooms = res_rooms.data
        
        facilities = ["Wi-Fi", "Water Purifier", "24/7 Security", "CCTV", "Power Backup"]
        has_ac = any(r.get("ac_type") == "ac" for r in rooms)
        has_bathroom = any(r.get("has_attached_bathroom") or r.get("hasAttachedBathroom") or r.get("has_bathroom") for r in rooms)
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
        avg_rating = float(h.get("average_rating") or 0.0)
        review_count = int(h.get("review_count") or 0)

        meta = get_property_metadata(h_id) or {}
        lat = meta.get("latitude") if meta.get("latitude") is not None else 20.5937
        lng = meta.get("longitude") if meta.get("longitude") is not None else 78.9629
        area = meta.get("area") or "Central"
        landmark = meta.get("nearby_landmarks") or meta.get("landmark") or ""
        college = meta.get("nearby_colleges") or meta.get("college") or ""

        result.append({
            "id": h_id,
            "name": h.get("name", ""),
            "code": h.get("code", ""),
            "address": h.get("address", ""),
            "city": h.get("city", "Bengaluru"),
            "state": h.get("state", "Karnataka"),
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
            "latitude": lat,
            "longitude": lng,
            "area": area,
            "landmark": landmark,
            "college": college
        })
    return result

@router.get("/public/{hostel_id}")
async def get_hostel_public(hostel_id: str):
    """Public endpoint — single hostel detail with rooms."""
    db = get_db()
    h_uuid = parse_uuid(hostel_id)
    
    res_hostel = await db.table("hostels").select("*").eq("id", h_uuid).execute()
    hostel = res_hostel.data[0] if res_hostel.data else None
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
        
    h_id = str(hostel["id"])

    res_rooms = await db.table("rooms").select("*").eq("hostel_id", h_id).execute()
    rooms = res_rooms.data
    room_list = []
    
    for r in rooms:
        r_id = str(r["id"])
        res_bed_total = await db.table("beds").select("id", count="exact").eq("room_id", r_id).execute()
        bed_total = res_bed_total.count or 0
        
        res_bed_avail = await db.table("beds").select("id", count="exact").eq("room_id", r_id).eq("status", "available").execute()
        bed_available = res_bed_avail.count or 0
        bed_occupied = max(0, bed_total - bed_available)
        
        if bed_total == 0:
            computed_status = "unavailable"
        elif bed_occupied == 0:
            computed_status = "available"
        elif 0 < bed_occupied < bed_total:
            computed_status = "partially_occupied"
        else:
            computed_status = "occupied"

        room_list.append({
            "id": r_id,
            "room_number": r.get("room_number"),
            "floor_number": r.get("floor_number"),
            "building_name": r.get("building_name"),
            "room_type": r.get("room_type"),
            "ac_type": r.get("ac_type"),
            "capacity": r.get("capacity"),
            "rent": r.get("rent"),
            "has_bathroom": bool(r.get("has_attached_bathroom") if r.get("has_attached_bathroom") is not None else r.get("has_bathroom", False)),
            "has_attached_bathroom": bool(r.get("has_attached_bathroom") or r.get("hasAttachedBathroom") or r.get("has_bathroom") or False),
            "hasAttachedBathroom": bool(r.get("has_attached_bathroom") or r.get("hasAttachedBathroom") or r.get("has_bathroom") or False),
            "has_balcony": r.get("has_balcony"),
            "status": computed_status,
            "amenities": r.get("amenities", []),
            "total_beds": bed_total,
            "occupied_beds": bed_occupied,
            "available_beds": bed_available,
        })

    res_total_beds = await db.table("beds").select("id", count="exact").eq("hostel_id", h_id).execute()
    total_beds = res_total_beds.count or 0
    
    res_occ_beds = await db.table("beds").select("id", count="exact").eq("hostel_id", h_id).eq("status", "occupied").execute()
    occupied_beds = res_occ_beds.count or 0
    
    occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0
    cheapest = min((r["rent"] for r in room_list if r.get("rent") and r["rent"] > 0), default=0)

    facilities = ["Wi-Fi", "Water Purifier", "24/7 Security", "CCTV", "Power Backup"]
    if any(r["ac_type"] == "ac" for r in room_list):
        facilities.append("AC Rooms")
    if any(r.get("has_attached_bathroom") or r.get("hasAttachedBathroom") or r.get("has_bathroom") for r in room_list):
        facilities.append("Attached Bathroom")
    if any(r["has_balcony"] for r in room_list):
        facilities.append("Balcony Rooms")
    if hostel.get("hostel_type") in ("boys", "mixed"):
        facilities.extend(["Parking", "Gym Access"])
    if hostel.get("hostel_type") in ("girls", "mixed"):
        facilities.extend(["Laundry", "Common Kitchen"])
    facilities.append("Mess / Tiffin")

    avg_rating = float(hostel.get("average_rating") or 0.0)
    review_count = int(hostel.get("review_count") or 0)

    meta = get_property_metadata(h_id) or {}
    lat = meta.get("latitude") if meta.get("latitude") is not None else 20.5937
    lng = meta.get("longitude") if meta.get("longitude") is not None else 78.9629
    area = meta.get("area") or "Central"
    landmark = meta.get("nearby_landmarks") or meta.get("landmark") or ""
    college = meta.get("nearby_colleges") or meta.get("college") or ""

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
        "latitude": lat,
        "longitude": lng,
        "area": area,
        "landmark": landmark,
        "college": college
    }

@router.get("")
async def list_hostels(request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] == "super_admin":
        res_hostels = await db.table("hostels").select("*").execute()
        hostels = res_hostels.data
    else:
        h_uuid = parse_uuid(user.get("hostel_id"))
        res_hostels = await db.table("hostels").select("*").eq("id", h_uuid).execute()
        hostels = res_hostels.data
    
    for h in hostels:
        h["_id"] = str(h["id"])
        h["id"] = h["_id"]
        
        # Compute live stats
        res_rooms_cnt = await db.table("rooms").select("id", count="exact").eq("hostel_id", h["id"]).execute()
        h["total_rooms"] = res_rooms_cnt.count or 0
        
        res_beds_cnt = await db.table("beds").select("id", count="exact").eq("hostel_id", h["id"]).execute()
        h["total_beds"] = res_beds_cnt.count or 0
        
        res_occ_cnt = await db.table("beds").select("id", count="exact").eq("hostel_id", h["id"]).eq("status", "occupied").execute()
        h["occupied_beds"] = res_occ_cnt.count or 0
        
        res_res_cnt = await db.table("residents").select("id", count="exact").eq("hostel_id", h["id"]).eq("status", "active").execute()
        h["total_residents"] = res_res_cnt.count or 0
        
    return hostels

@router.get("/{hostel_id}")
async def get_hostel(hostel_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] == "hostel_admin" and user.get("hostel_id") != hostel_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    h_uuid = parse_uuid(hostel_id)
    res_hostel = await db.table("hostels").select("*").eq("id", h_uuid).execute()
    hostel = res_hostel.data[0] if res_hostel.data else None
    if not hostel:
        raise HTTPException(status_code=404, detail="Hostel not found")
        
    hostel["_id"] = str(hostel["id"])
    hostel["id"] = hostel["_id"]
    
    res_rooms_cnt = await db.table("rooms").select("id", count="exact").eq("hostel_id", hostel_id).execute()
    hostel["total_rooms"] = res_rooms_cnt.count or 0
    
    res_beds_cnt = await db.table("beds").select("id", count="exact").eq("hostel_id", hostel_id).execute()
    hostel["total_beds"] = res_beds_cnt.count or 0
    
    res_occ_cnt = await db.table("beds").select("id", count="exact").eq("hostel_id", hostel_id).eq("status", "occupied").execute()
    hostel["occupied_beds"] = res_occ_cnt.count or 0
    
    res_res_cnt = await db.table("residents").select("id", count="exact").eq("hostel_id", hostel_id).eq("status", "active").execute()
    hostel["total_residents"] = res_res_cnt.count or 0
    
    return hostel

@router.post("")
async def create_hostel(req: HostelCreate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can create hostels")
    
    doc = req.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    doc["images"] = []
    
    # Extract advanced search metadata fields to prevent Supabase column mismatch
    advanced_keys = [
        "latitude", "longitude", "nearby_colleges", "nearby_schools", "nearby_landmarks",
        "nearby_metro", "nearby_bus_stop", "aliases", "keywords", "tags",
        "category", "property_type", "gender", "facilities", "area", "country"
    ]
    advanced_updates = {k: doc.pop(k) for k in list(doc.keys()) if k in advanced_keys}
    
    res_insert = await db.table("hostels").insert(doc).execute()
    if not res_insert.data:
        raise HTTPException(status_code=500, detail="Failed to create hostel")
        
    inserted_doc = res_insert.data[0]
    inserted_doc["_id"] = str(inserted_doc["id"])
    inserted_doc["id"] = inserted_doc["_id"]
    
    # Save search coordinates and metadata index in SQLite database
    save_or_update_property_metadata(
        inserted_doc["id"],
        inserted_doc["name"],
        inserted_doc["address"],
        inserted_doc["city"],
        inserted_doc["state"],
        advanced_updates
    )
    
    await db.table("activity_logs").insert({
        "user_id": str(user["id"]),
        "user_name": user.get("name", ""),
        "hostel_id": inserted_doc["id"],
        "action": "hostel_created",
        "entity_type": "hostel",
        "entity_id": inserted_doc["id"],
        "details": f"Created hostel: {req.name}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    return inserted_doc

@router.put("/{hostel_id}")
async def update_hostel(hostel_id: str, req: HostelUpdate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can update hostels")
    
    h_uuid = parse_uuid(hostel_id)
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Extract advanced search metadata fields to prevent Supabase column mismatch
    advanced_keys = [
        "latitude", "longitude", "nearby_colleges", "nearby_schools", "nearby_landmarks",
        "nearby_metro", "nearby_bus_stop", "aliases", "keywords", "tags",
        "category", "property_type", "gender", "facilities", "area", "country"
    ]
    advanced_updates = {k: updates.pop(k) for k in list(updates.keys()) if k in advanced_keys}
    
    res_update = await db.table("hostels").update(updates).eq("id", h_uuid).execute()
    if not res_update.data:
        raise HTTPException(status_code=404, detail="Hostel not found")
        
    hostel = res_update.data[0]
    hostel["_id"] = str(hostel["id"])
    hostel["id"] = hostel["_id"]
    
    # Update search coordinates and metadata index in SQLite database
    save_or_update_property_metadata(
        hostel["id"],
        hostel.get("name"),
        hostel.get("address"),
        hostel.get("city"),
        hostel.get("state"),
        advanced_updates
    )
    
    return hostel

@router.delete("/{hostel_id}")
async def delete_hostel(hostel_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can delete hostels")
        
    h_uuid = parse_uuid(hostel_id)
    res_del = await db.table("hostels").delete().eq("id", h_uuid).execute()
    if not res_del.data:
        raise HTTPException(status_code=404, detail="Hostel not found")
    return {"message": "Hostel deleted"}

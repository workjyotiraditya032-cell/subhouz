from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any
from database import get_db
from services.search_db import query_search_suggestions, get_all_property_metadata, match_score
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/search", tags=["search"])

@router.get("/suggestions")
async def get_search_suggestions(q: Optional[str] = Query("", description="Search term")):
    """
    Search suggestions API.
    Returns matching Locations, Colleges, Landmarks, and Properties.
    """
    query = q.strip().lower()
    
    # 1. Fetch suggestions from SQLite
    sq_suggestions = query_search_suggestions(query)
    
    # 2. Fetch matching properties based on ranking scores
    db = get_db()
    res_hostels = await db.table("hostels").select("id", "name", "code", "hostel_type").execute()
    hostels = res_hostels.data or []
    
    metadata_map = get_all_property_metadata()
    
    properties = []
    for h in hostels:
        h_id = str(h["id"])
        meta = metadata_map.get(h_id)
        if not meta:
            continue
            
        score = match_score(query, meta)
        if score > 0.0:
            properties.append({
                "id": h_id,
                "name": h["name"],
                "code": h["code"],
                "area": meta["area"],
                "gender": meta["gender"],
                "score": score
            })
            
    # Sort properties by score descending
    properties = sorted(properties, key=lambda x: x["score"], reverse=True)
    
    # Slice outputs for suggestions dropdown to keep payloads lightweight
    if not query:
        return {
            "locations": sq_suggestions["locations"][:3],
            "colleges": sq_suggestions["colleges"][:3],
            "landmarks": sq_suggestions["landmarks"][:3],
            "properties": properties[:3]
        }
        
    return {
        "locations": sq_suggestions["locations"],
        "colleges": sq_suggestions["colleges"],
        "landmarks": sq_suggestions["landmarks"],
        "properties": properties
    }

@router.get("")
async def execute_smart_search(q: Optional[str] = Query("", description="Search query")):
    """
    Performs tokenized, weighted, fuzzy, and intent-filtered search.
    Returns ranked properties list.
    """
    query = q.strip().lower()
    
    db = get_db()
    res_hostels = await db.table("hostels").select("*").execute()
    hostels = res_hostels.data or []
    
    metadata_map = get_all_property_metadata()
    
    results = []
    for h in hostels:
        h_id = str(h["id"])
        meta = metadata_map.get(h_id)
        if not meta:
            continue
            
        score = match_score(query, meta)
        if score > 0.0 or not query:
            # Query starting rent from rooms table
            res_cheapest = await db.table("rooms").select("rent").eq("hostel_id", h_id).gt("rent", 0).order("rent", desc=False).limit(1).execute()
            starting_rent = res_cheapest.data[0]["rent"] if res_cheapest.data else 0
            
            # Compute live bed stats
            res_total_rooms = await db.table("rooms").select("id", count="exact").eq("hostel_id", h_id).execute()
            total_rooms = res_total_rooms.count or 0
            
            res_total_beds = await db.table("beds").select("id", count="exact").eq("hostel_id", h_id).execute()
            total_beds = res_total_beds.count or 0
            
            res_occ_beds = await db.table("beds").select("id", count="exact").eq("hostel_id", h_id).eq("status", "occupied").execute()
            occupied_beds = res_occ_beds.count or 0
            
            available_beds = total_beds - occupied_beds
            occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0
            
            results.append({
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
                "average_rating": float(h.get("average_rating") or 0.0),
                "review_count": int(h.get("review_count") or 0),
                
                # Metadata columns
                "latitude": meta["latitude"],
                "longitude": meta["longitude"],
                "area": meta["area"],
                "landmark": meta["nearby_landmarks"], # returns nearby landmarks JSON
                "college": meta["nearby_colleges"], # returns nearby colleges JSON
                "facilities": meta["facilities"],
                "score": score
            })
            
    # Sort results by score descending (highest match rating first)
    if query:
        results = sorted(results, key=lambda x: x["score"], reverse=True)
        
    return results

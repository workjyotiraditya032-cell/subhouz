from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from database import get_db
from auth import get_current_user
import base64, logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/website-images", tags=["website-images"])

def parse_oid(v):
    try: return ObjectId(v)
    except: raise HTTPException(status_code=404, detail="Not found")

VALID_CATEGORIES = [
    "hero_banner", "homepage_banner", "hostel_gallery", "room_image",
    "facilities", "about_us", "amenities", "testimonial",
    "promotional", "offer_banner", "blog", "other"
]

@router.get("")
async def list_images(request: Request, category: Optional[str] = None, hostel_id: Optional[str] = None):
    db = get_db()
    user = await get_current_user(request, db)
    query = {}
    if category:
        query["category"] = category
    if user["role"] == "hostel_admin":
        query["$or"] = [{"hostel_id": user.get("hostel_id")}, {"hostel_id": None}, {"hostel_id": ""}]
    elif hostel_id:
        query["hostel_id"] = hostel_id

    images = await db.website_images.find(query).sort("order", 1).to_list(500)
    for img in images:
        img["_id"] = str(img["_id"])
        img["id"] = img["_id"]
        if img.get("created_at") and hasattr(img["created_at"], 'isoformat'):
            img["created_at"] = img["created_at"].isoformat()
    return images

@router.get("/public")
async def list_images_public(category: Optional[str] = None):
    """Public endpoint for fetching website images."""
    db = get_db()
    query = {"active": True}
    if category:
        query["category"] = category
    images = await db.website_images.find(query, {"data": 0}).sort("order", 1).to_list(200)
    for img in images:
        img["_id"] = str(img["_id"])
        img["id"] = img["_id"]
    return images

@router.post("")
async def upload_image(request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    body = await request.json()

    category = body.get("category", "other")
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Valid: {VALID_CATEGORIES}")

    hostel_id = body.get("hostel_id")
    if user["role"] == "hostel_admin":
        hostel_id = user.get("hostel_id")

    # Get highest order
    last = await db.website_images.find({"category": category}).sort("order", -1).limit(1).to_list(1)
    order = (last[0]["order"] + 1) if last else 0

    doc = {
        "title": body.get("title", ""),
        "alt_text": body.get("alt_text", ""),
        "category": category,
        "hostel_id": hostel_id,
        "url": body.get("url", ""),
        "data": body.get("data"),  # base64 image data
        "order": order,
        "active": True,
        "uploaded_by": user.get("name", ""),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.website_images.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    doc.pop("data", None)  # Don't return base64 in response
    return doc

@router.put("/{image_id}")
async def update_image(image_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    body = await request.json()

    img = await db.website_images.find_one({"_id": parse_oid(image_id)})
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    if user["role"] == "hostel_admin" and img.get("hostel_id") and img["hostel_id"] != user.get("hostel_id"):
        raise HTTPException(status_code=403, detail="Access denied")

    updates = {}
    for k in ("title", "alt_text", "url", "data", "order", "active", "category"):
        if k in body:
            updates[k] = body[k]
    updates["updated_at"] = datetime.now(timezone.utc)

    await db.website_images.update_one({"_id": parse_oid(image_id)}, {"$set": updates})
    return {"message": "Image updated"}

@router.delete("/{image_id}")
async def delete_image(image_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    img = await db.website_images.find_one({"_id": parse_oid(image_id)})
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    if user["role"] == "hostel_admin" and img.get("hostel_id") and img["hostel_id"] != user.get("hostel_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    await db.website_images.delete_one({"_id": parse_oid(image_id)})
    return {"message": "Image deleted"}

@router.put("/reorder/{category}")
async def reorder_images(category: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    body = await request.json()
    order_list = body.get("order", [])  # list of image IDs in new order
    for idx, img_id in enumerate(order_list):
        await db.website_images.update_one({"_id": parse_oid(img_id)}, {"$set": {"order": idx}})
    return {"message": f"Reordered {len(order_list)} images"}

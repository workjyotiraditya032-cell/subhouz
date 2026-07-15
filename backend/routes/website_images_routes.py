from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from typing import Optional
from datetime import datetime, timezone
from database import get_db, parse_uuid
from auth import get_current_user
import base64, logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/website-images", tags=["website-images"])

VALID_CATEGORIES = [
    # Website
    "website_logo",
    "footer_logo",
    "favicon",
    "hero_background",
    "hero_side_image",
    "about_image",
    "contact_banner",
    "gallery",
    "testimonial",
    "blog",
    "advertisement",

    # Hostel
    "hostel_cover",
    "hostel_gallery",

    # Room
    "room_cover",
    "room_gallery",

    # Default Images
    "default_property",
    "default_room",

    # Other
    "other"
]

@router.get("")
async def list_images(request: Request, category: Optional[str] = None, hostel_id: Optional[str] = None):
    db = get_db()
    user = await get_current_user(request, db)
    
    q = db.table("website_images").select("*")
    if category:
        q = q.eq("category", category)
        
    if user["role"] == "hostel_admin":
        h_id = user.get("hostel_id")
        if h_id:
            h_uuid = parse_uuid(h_id)
            q = q.or_(f"hostel_id.eq.{h_uuid},hostel_id.is.null")
        else:
            q = q.or_("hostel_id.is.null")
    elif hostel_id:
        q = q.eq("hostel_id", parse_uuid(hostel_id))
        
    res_img = await q.order("order", desc=False).execute()
    images = res_img.data
    
    for img in images:
        img["_id"] = str(img["id"])
        img["id"] = img["_id"]
        if img.get("created_at"):
            img["created_at"] = str(img["created_at"])
    return images

@router.get("/public")
async def list_images_public(
    category: Optional[str] = None,
    image_key: Optional[str] = None
):
    """
    Public endpoint for fetching website images.
    Can filter by category or image_key.
    """
    db = get_db()
    q = db.table("website_images").select("*").eq("active", True)

    if category:
        q = q.eq("category", category)
    if image_key:
        q = q.eq("image_key", image_key)

    res_img = await q.order("order", desc=False).limit(200).execute()
    images = res_img.data

    for img in images:
        img["_id"] = str(img["id"])
        img["id"] = img["_id"]
        if img.get("data"):
            img["image"] = img["data"]
        elif img.get("url"):
            img["image"] = img["url"]
        else:
            img["image"] = ""
        img.pop("data", None)

    return images

@router.get("/public/{image_key}")
async def get_public_image(image_key: str):
    """Fetch a single image by image_key."""
    db = get_db()
    try:
        res_img = await db.table("website_images").select("*").eq("image_key", image_key).eq("active", True).execute()
        image = res_img.data[0] if res_img.data else None
    except Exception:
        image = None

    if not image:
        fallbacks = {
            "website_logo": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=100&q=80",
            "footer_logo": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=100&q=80",
            "favicon": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=32&q=80",
            "hero_background": "https://images.unsplash.com/photo-1776763255235-046cd40f3093?auto=format&fit=crop&w=1600&q=80",
            "hero_side_image": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
            "about_image": "https://images.unsplash.com/photo-1552858725-693709cc17c7?auto=format&fit=crop&w=800&q=80",
            "contact_banner": "https://images.unsplash.com/photo-1552858725-2758b5fb1286?auto=format&fit=crop&w=1200&q=80",
            "default_property": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
            "default_room": "https://images.unsplash.com/photo-1656274274410-4a3f86a0fa6f?auto=format&fit=crop&w=600&q=80",
        }
        url = fallbacks.get(image_key, "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80")
        return {
            "id": "fallback-id",
            "title": image_key.replace("_", " ").title(),
            "category": "other",
            "image_key": image_key,
            "image": url,
            "alt_text": image_key.replace("_", " ").title(),
            "active": True
        }

    image["_id"] = str(image["id"])
    image["id"] = image["_id"]

    # If uploaded by file, use base64 data
    if image.get("data"):
        image["image"] = image["data"]
    # Otherwise use URL
    elif image.get("url"):
        image["image"] = image["url"]
    else:
        image["image"] = ""

    return {
        "id": image["id"],
        "title": image.get("title", ""),
        "category": image.get("category", ""),
        "image_key": image.get("image_key", ""),
        "image": image["image"],
        "alt_text": image.get("alt_text", ""),
        "active": image.get("active", True),
    }

@router.post("")
async def upload_image(request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    body = await request.json()

    category = body.get("category", "other")
    if category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Valid: {VALID_CATEGORIES}"
        )

    hostel_id = body.get("hostel_id") or None  # treat empty string as None
    if user["role"] == "hostel_admin":
        hostel_id = user.get("hostel_id") or None

    # Get highest order in this category
    try:
        res_last = await db.table("website_images").select("order").eq("category", category).order("order", desc=True).limit(1).execute()
        last = res_last.data
        order = (last[0]["order"] + 1) if last else 0
    except Exception:
        order = 0

    # Only include columns that exist in the website_images table schema
    doc = {
        "title": body.get("title", ""),
        "category": category,
        "image_key": body.get("image_key") or category,
        "hostel_id": parse_uuid(hostel_id) if hostel_id else None,
        "url": body.get("url") or "",
        "data": body.get("data") or None,
        "order": order,
        "active": True,
        "is_hero": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        res_insert = await db.table("website_images").insert(doc).execute()
    except Exception as e:
        logger.exception("Error inserting website image: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

    if not res_insert.data:
        raise HTTPException(status_code=500, detail="Failed to upload image – no data returned")

    inserted_doc = res_insert.data[0]
    inserted_doc["_id"] = str(inserted_doc["id"])
    inserted_doc["id"] = inserted_doc["_id"]
    inserted_doc.pop("data", None)
    return inserted_doc

@router.put("/{image_id}")
async def update_image(image_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    body = await request.json()

    img_uuid = parse_uuid(image_id)
    res_img = await db.table("website_images").select("*").eq("id", img_uuid).execute()
    img = res_img.data[0] if res_img.data else None
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    if user["role"] == "hostel_admin" and img.get("hostel_id") and img["hostel_id"] != user.get("hostel_id"):
        raise HTTPException(status_code=403, detail="Access denied")

    # Only update columns that exist in the website_images table schema
    allowed_cols = {"title", "url", "data", "order", "active", "category", "image_key", "is_hero"}
    updates = {k: v for k, v in body.items() if k in allowed_cols}

    # Safely handle hostel_id: treat empty string as None
    if "hostel_id" in body:
        h_id = body["hostel_id"] or None
        updates["hostel_id"] = parse_uuid(h_id) if h_id else None

    if not updates:
        return {"message": "Nothing to update"}

    try:
        res_update = await db.table("website_images").update(updates).eq("id", img_uuid).execute()
    except Exception as e:
        logger.exception("Error updating website image %s: %s", image_id, e)
        raise HTTPException(status_code=500, detail=f"Failed to update image: {str(e)}")

    return {"message": "Image updated"}

@router.delete("/{image_id}")
async def delete_image(image_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    
    img_uuid = parse_uuid(image_id)
    res_img = await db.table("website_images").select("*").eq("id", img_uuid).execute()
    img = res_img.data[0] if res_img.data else None
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    if user["role"] == "hostel_admin" and img.get("hostel_id") and img["hostel_id"] != user.get("hostel_id"):
        raise HTTPException(status_code=403, detail="Access denied")
        
    await db.table("website_images").delete().eq("id", img_uuid).execute()
    return {"message": "Image deleted"}

@router.put("/reorder/{category}")
async def reorder_images(category: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    body = await request.json()
    order_list = body.get("order", [])  # list of image IDs in new order
    
    for idx, img_id in enumerate(order_list):
        img_uuid = parse_uuid(img_id)
        await db.table("website_images").update({"order": idx}).eq("id", img_uuid).execute()
    return {"message": f"Reordered {len(order_list)} images"}

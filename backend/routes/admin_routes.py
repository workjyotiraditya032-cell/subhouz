from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId
from database import get_db
from auth import get_current_user, hash_password
import logging, secrets

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

def parse_oid(v):
    try: return ObjectId(v)
    except: raise HTTPException(status_code=404, detail="Not found")

class CreateAdminRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "hostel_admin"
    hostel_id: Optional[str] = None
    phone: Optional[str] = None

class UpdateAdminRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    hostel_id: Optional[str] = None
    role: Optional[str] = None

@router.get("/users")
async def list_admin_users(request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Access denied")
    users = await db.users.find({}, {"password_hash": 0}).to_list(500)
    for u in users:
        u["_id"] = str(u["_id"])
        u["id"] = u["_id"]
        for k in ("created_at", "updated_at", "last_login"):
            if u.get(k) and hasattr(u[k], 'isoformat'):
                u[k] = u[k].isoformat()
        # Get hostel name
        if u.get("hostel_id"):
            hostel = await db.hostels.find_one({"_id": ObjectId(u["hostel_id"])}, {"name": 1})
            u["hostel_name"] = hostel["name"] if hostel else "Unknown"
    return users

@router.post("/users")
async def create_admin_user(req: CreateAdminRequest, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can create users")
    email = req.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": req.role,
        "hostel_id": req.hostel_id,
        "phone": req.phone,
        "disabled": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(doc)
    await db.activity_logs.insert_one({
        "user_id": user["_id"], "user_name": user.get("name", ""),
        "action": "admin_created", "entity_type": "user", "entity_id": str(result.inserted_id),
        "details": f"Created {req.role}: {req.name} ({email})",
        "timestamp": datetime.now(timezone.utc)
    })
    return {"id": str(result.inserted_id), "email": email, "name": req.name, "role": req.role}

@router.put("/users/{user_id}")
async def update_admin_user(user_id: str, req: UpdateAdminRequest, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can update users")
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if "email" in updates:
        updates["email"] = updates["email"].strip().lower()
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.users.update_one({"_id": parse_oid(user_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    u = await db.users.find_one({"_id": parse_oid(user_id)}, {"password_hash": 0})
    u["_id"] = str(u["_id"])
    u["id"] = u["_id"]
    return u

@router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can toggle user status")
    target = await db.users.find_one({"_id": parse_oid(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    new_status = not target.get("disabled", False)
    await db.users.update_one({"_id": parse_oid(user_id)}, {"$set": {"disabled": new_status, "updated_at": datetime.now(timezone.utc)}})
    action = "disabled" if new_status else "enabled"
    await db.activity_logs.insert_one({
        "user_id": user["_id"], "user_name": user.get("name", ""),
        "action": f"admin_{action}", "entity_type": "user", "entity_id": user_id,
        "details": f"{action.capitalize()} user: {target.get('name', '')}",
        "timestamp": datetime.now(timezone.utc)
    })
    return {"message": f"User {action}", "disabled": new_status}

@router.put("/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can reset passwords")
    new_pass = secrets.token_urlsafe(10)
    await db.users.update_one({"_id": parse_oid(user_id)}, {"$set": {"password_hash": hash_password(new_pass), "updated_at": datetime.now(timezone.utc)}})
    return {"message": "Password reset", "new_password": new_pass}

@router.delete("/users/{user_id}")
async def delete_admin_user(user_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can delete users")
    if user_id == user["_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"_id": parse_oid(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

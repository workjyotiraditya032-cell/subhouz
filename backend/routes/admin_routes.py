from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from database import get_db, parse_uuid
from auth import get_current_user, hash_password
import logging, secrets

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

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
        
    res_users = await db.table("users").select("id,email,name,role,hostel_id,phone,disabled,created_at,updated_at").execute()
    users = res_users.data
    
    for u in users:
        u["_id"] = str(u["id"])
        u["id"] = u["_id"]
        for k in ("created_at", "updated_at", "last_login"):
            if u.get(k):
                u[k] = str(u[k])
        # Get hostel name
        if u.get("hostel_id"):
            h_uuid = parse_uuid(u["hostel_id"])
            res_h = await db.table("hostels").select("name").eq("id", h_uuid).execute()
            hostel = res_h.data[0] if res_h.data else None
            u["hostel_name"] = hostel["name"] if hostel else "Unknown"
        else:
            u["hostel_name"] = None
    return users

@router.post("/users")
async def create_admin_user(req: CreateAdminRequest, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can create users")
        
    email = req.email.strip().lower()
    res_existing = await db.table("users").select("*").eq("email", email).execute()
    existing = res_existing.data[0] if res_existing.data else None
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hostel_id = None
    if req.hostel_id:
        hostel_id = parse_uuid(req.hostel_id)
        
    doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": req.role,
        "hostel_id": hostel_id,
        "phone": req.phone,
        "disabled": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    res_insert = await db.table("users").insert(doc).execute()
    if not res_insert.data:
        raise HTTPException(status_code=500, detail="Failed to create user")
        
    inserted_id = str(res_insert.data[0]["id"])
    
    await db.table("activity_logs").insert({
        "user_id": str(user["id"]),
        "user_name": user.get("name", ""),
        "action": "admin_created",
        "entity_type": "user",
        "entity_id": inserted_id,
        "details": f"Created {req.role}: {req.name} ({email})",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    return {"id": inserted_id, "email": email, "name": req.name, "role": req.role}

@router.put("/users/{user_id}")
async def update_admin_user(user_id: str, req: UpdateAdminRequest, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can update users")
        
    user_uuid = parse_uuid(user_id)
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if "email" in updates:
        updates["email"] = updates["email"].strip().lower()
    if "hostel_id" in updates and updates["hostel_id"]:
        updates["hostel_id"] = parse_uuid(updates["hostel_id"])
        
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    res_update = await db.table("users").update(updates).eq("id", user_uuid).execute()
    if not res_update.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    u = res_update.data[0]
    u["_id"] = str(u["id"])
    u["id"] = u["_id"]
    u.pop("password_hash", None)
    return u

@router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can toggle user status")
        
    user_uuid = parse_uuid(user_id)
    res_target = await db.table("users").select("*").eq("id", user_uuid).execute()
    target = res_target.data[0] if res_target.data else None
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    new_status = not target.get("disabled", False)
    await db.table("users").update({
        "disabled": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", user_uuid).execute()
    
    action = "disabled" if new_status else "enabled"
    await db.table("activity_logs").insert({
        "user_id": str(user["id"]),
        "user_name": user.get("name", ""),
        "action": f"admin_{action}",
        "entity_type": "user",
        "entity_id": user_id,
        "details": f"{action.capitalize()} user: {target.get('name', '')}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    return {"message": f"User {action}", "disabled": new_status}

@router.put("/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can reset passwords")
        
    user_uuid = parse_uuid(user_id)
    new_pass = secrets.token_urlsafe(10)
    res_update = await db.table("users").update({
        "password_hash": hash_password(new_pass),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", user_uuid).execute()
    
    if not res_update.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"message": "Password reset", "new_password": new_pass}

@router.delete("/users/{user_id}")
async def delete_admin_user(user_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Access denied")
    if str(user["id"]) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
    user_uuid = parse_uuid(user_id)
    res_del = await db.table("users").delete().eq("id", user_uuid).execute()
    if not res_del.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

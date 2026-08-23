from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from database import get_db, parse_uuid
from auth import get_current_user, hash_password
import logging, secrets

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

from services.security_questions_store import set_user_security_answers, get_user_security_hashes_async, set_user_security_answers_async

class CreateAdminRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "hostel_admin"
    hostel_id: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    sec_school: Optional[str] = None
    sec_mother: Optional[str] = None
    sec_father: Optional[str] = None

class UpdateAdminRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    hostel_id: Optional[str] = None
    role: Optional[str] = None
    avatar: Optional[str] = None
    sec_school: Optional[str] = None
    sec_mother: Optional[str] = None
    sec_father: Optional[str] = None

class AdminResetPasswordRequest(BaseModel):
    new_password: str
    confirm_password: str

@router.get("/users")
async def list_admin_users(request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Access denied")
        
    res_users = await db.table("users").select("id,email,name,role,hostel_id,phone,avatar,disabled,created_at,updated_at").execute()
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

        # Include security questions configuration status
        hashes = await get_user_security_hashes_async(u["email"])
        if hashes and any(hashes.values()):
            u["sec_configured"] = True
            u["sec_school"] = "••••••••"
            u["sec_mother"] = "••••••••"
            u["sec_father"] = "••••••••"
        else:
            u["sec_configured"] = False
            u["sec_school"] = ""
            u["sec_mother"] = ""
            u["sec_father"] = ""

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
    if req.hostel_id and str(req.hostel_id).strip():
        hostel_id = parse_uuid(req.hostel_id)
        
    doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": req.role,
        "hostel_id": hostel_id,
        "phone": req.phone,
        "avatar": req.avatar,
        "disabled": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    res_insert = await db.table("users").insert(doc).execute()
    if not res_insert.data:
        raise HTTPException(status_code=500, detail="Failed to create user")
        
    inserted_id = str(res_insert.data[0]["id"])
    
    if req.sec_school or req.sec_mother or req.sec_father:
        set_user_security_answers(email, req.sec_school, req.sec_mother, req.sec_father)

    await db.table("activity_logs").insert({
        "user_id": str(user["id"]),
        "user_name": user.get("name", ""),
        "action": "admin_created",
        "entity_type": "user",
        "entity_id": inserted_id,
        "details": f"Created {req.role}: {req.name} ({email})",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    return {"id": inserted_id, "email": email, "name": req.name, "role": req.role, "avatar": req.avatar}

@router.put("/users/{user_id}")
async def update_admin_user(user_id: str, req: UpdateAdminRequest, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can update users")
        
    user_uuid = parse_uuid(user_id)
    raw_updates = req.model_dump()
    
    sec_school = raw_updates.pop("sec_school", None)
    sec_mother = raw_updates.pop("sec_mother", None)
    sec_father = raw_updates.pop("sec_father", None)
    
    updates = {k: v for k, v in raw_updates.items() if v is not None}
    if "email" in updates:
        updates["email"] = updates["email"].strip().lower()
    if "hostel_id" in updates:
        if updates["hostel_id"] and str(updates["hostel_id"]).strip():
            updates["hostel_id"] = parse_uuid(updates["hostel_id"])
        else:
            updates["hostel_id"] = None
        
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    res_update = await db.table("users").update(updates).eq("id", user_uuid).execute()
    if not res_update.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    u = res_update.data[0]
    u["_id"] = str(u["id"])
    u["id"] = u["_id"]
    u.pop("password_hash", None)
    
    if sec_school or sec_mother or sec_father:
        if sec_school != "••••••••" and sec_mother != "••••••••" and sec_father != "••••••••":
            await set_user_security_answers_async(u["email"], sec_school, sec_mother, sec_father)
        
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
async def reset_user_password(user_id: str, req: AdminResetPasswordRequest, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only Super Admin can reset passwords")
        
    if not req.new_password or len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirm password do not match")
        
    user_uuid = parse_uuid(user_id)
    res_target = await db.table("users").select("name, email").eq("id", user_uuid).execute()
    target = res_target.data[0] if res_target.data else None
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    new_hash = hash_password(req.new_password)
    res_update = await db.table("users").update({
        "password_hash": new_hash,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", user_uuid).execute()
    
    if not res_update.data:
        raise HTTPException(status_code=500, detail="Failed to update password")
        
    await db.table("activity_logs").insert({
        "user_id": str(user["id"]),
        "user_name": user.get("name", ""),
        "action": "admin_password_reset",
        "entity_type": "user",
        "entity_id": user_id,
        "details": f"Super Admin reset password for: {target.get('name', '')} ({target.get('email', '')})",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }).execute()

    return {"message": f"Password updated successfully for {target.get('name', 'user')}"}

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

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
from database import get_db, parse_uuid
from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    get_current_user, set_auth_cookies, clear_auth_cookies, generate_reset_token,
    get_jwt_secret, JWT_ALGORITHM
)
import jwt
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "hostel_admin"
    hostel_id: str = None

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/login")
async def login(req: LoginRequest, response: Response, request: Request):
    db = get_db()
    email = req.email.strip().lower()
    
    # Brute force check
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    
    res = await db.table("login_attempts").select("*").eq("identifier", identifier).execute()
    attempt = res.data[0] if res.data else None
    
    if attempt and attempt.get("attempts", 0) >= 5:
        locked_until_str = attempt.get("locked_until")
        if locked_until_str:
            locked_until = datetime.fromisoformat(locked_until_str.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) < locked_until:
                raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
            else:
                await db.table("login_attempts").delete().eq("identifier", identifier).execute()
    
    res_user = await db.table("users").select("*").eq("email", email).execute()
    user = res_user.data[0] if res_user.data else None
    
    if not user or user.get("disabled", False):
        await _increment_login_attempts(db, identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(req.password, user["password_hash"]):
        await _increment_login_attempts(db, identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Clear attempts on success
    await db.table("login_attempts").delete().eq("identifier", identifier).execute()
    
    user_id = str(user["id"])
    access_token = create_access_token(user_id, email, user["role"])
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    
    # Log activity
    await db.table("activity_logs").insert({
        "user_id": user_id,
        "user_name": user.get("name", ""),
        "action": "login",
        "entity_type": "user",
        "entity_id": user_id,
        "details": f"{user.get('name', '')} logged in",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    return {
        "id": user_id,
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user["role"],
        "hostel_id": user.get("hostel_id"),
        "phone": user.get("phone"),
        "avatar": user.get("avatar"),
        "token": access_token
    }

@router.post("/register")
async def register(req: RegisterRequest, response: Response, request: Request):
    db = get_db()
    email = req.email.strip().lower()
    
    # Check current user is super_admin
    try:
        current_user = await get_current_user(request, db)
        if current_user["role"] != "super_admin":
            raise HTTPException(status_code=403, detail="Only Super Admin can register new users")
    except HTTPException:
        # Allow first registration if no users exist
        res_count = await db.table("users").select("id", count="exact").limit(1).execute()
        count = res_count.count or 0
        if count > 0:
            raise HTTPException(status_code=403, detail="Only Super Admin can register new users")
    
    res_existing = await db.table("users").select("*").eq("email", email).execute()
    existing = res_existing.data[0] if res_existing.data else None
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hostel_id = None
    if req.hostel_id:
        hostel_id = parse_uuid(req.hostel_id)
        
    user_doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": req.role,
        "hostel_id": hostel_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    res_insert = await db.table("users").insert(user_doc).execute()
    if not res_insert.data:
        raise HTTPException(status_code=500, detail="Failed to register user")
        
    user_id = str(res_insert.data[0]["id"])
    
    return {"id": user_id, "email": email, "name": req.name, "role": req.role, "hostel_id": req.hostel_id}

@router.get("/me")
async def get_me(request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    return {
        "id": user["_id"], "email": user["email"], "name": user.get("name", ""),
        "role": user["role"], "hostel_id": user.get("hostel_id"),
        "phone": user.get("phone"), "avatar": user.get("avatar")
    }

@router.post("/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"message": "Logged out successfully"}

@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    db = get_db()
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_uuid = parse_uuid(payload["sub"])
        res_user = await db.table("users").select("*").eq("id", user_uuid).execute()
        user = res_user.data[0] if res_user.data else None
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        new_access = create_access_token(str(user["id"]), user["email"], user["role"])
        response.set_cookie(key="access_token", value=new_access, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
        return {"message": "Token refreshed", "token": new_access}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    db = get_db()
    res_user = await db.table("users").select("*").eq("email", req.email.strip().lower()).execute()
    user = res_user.data[0] if res_user.data else None
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}
    
    token = generate_reset_token()
    await db.table("password_reset_tokens").insert({
        "user_id": str(user["id"]),
        "token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "used": False
    }).execute()
    
    logger.info(f"Password reset token for {req.email}: {token}")
    return {"message": "If the email exists, a reset link has been sent", "reset_token": token}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    db = get_db()
    res_token = await db.table("password_reset_tokens").select("*").eq("token", req.token).eq("used", False).execute()
    token_doc = res_token.data[0] if res_token.data else None
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    expires_at = datetime.fromisoformat(token_doc["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired")
        
    await db.table("users").update({
        "password_hash": hash_password(req.new_password),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", token_doc["user_id"]).execute()
    
    await db.table("password_reset_tokens").update({"used": True}).eq("id", token_doc["id"]).execute()
    return {"message": "Password reset successfully"}

@router.get("/users")
async def list_users(request: Request):
    db = get_db()
    current_user = await get_current_user(request, db)
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Access denied")
        
    res_users = await db.table("users").select("id,email,name,role,hostel_id,phone,avatar,disabled,created_at,updated_at").execute()
    users = res_users.data
    for u in users:
        u["_id"] = str(u["id"])
        u["id"] = u["_id"]
    return users

async def _increment_login_attempts(db, identifier: str):
    res_attempt = await db.table("login_attempts").select("*").eq("identifier", identifier).execute()
    attempt = res_attempt.data[0] if res_attempt.data else None
    
    if attempt:
        new_count = attempt.get("attempts", 0) + 1
        update = {"attempts": new_count}
        if new_count >= 5:
            update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        await db.table("login_attempts").update(update).eq("identifier", identifier).execute()
    else:
        await db.table("login_attempts").insert({
            "identifier": identifier,
            "attempts": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()

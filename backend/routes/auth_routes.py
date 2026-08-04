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

from services.security_questions_store import (
    set_user_security_answers, verify_user_security_answers, get_user_security_hashes,
    set_user_security_answers_async, verify_user_security_answers_async, get_user_security_hashes_async
)

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "hostel_admin"
    hostel_id: str = None
    sec_school: str = None
    sec_mother: str = None
    sec_father: str = None

class ForgotPasswordVerifyUserRequest(BaseModel):
    email: str

class ForgotPasswordVerifyQuestionsRequest(BaseModel):
    email: str
    sec_school: str
    sec_mother: str
    sec_father: str

class ForgotPasswordResetRequest(BaseModel):
    reset_token: str
    new_password: str
    confirm_password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

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
    
    if req.sec_school or req.sec_mother or req.sec_father:
        set_user_security_answers(email, req.sec_school, req.sec_mother, req.sec_father)
    
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

@router.post("/forgot-password/verify-user")
async def forgot_password_verify_user(req: ForgotPasswordVerifyUserRequest, request: Request):
    db = get_db()
    email = req.email.strip().lower()
    
    ip = request.client.host if request.client else "unknown"
    identifier = f"reset:{ip}:{email}"
    
    res_attempt = await db.table("login_attempts").select("*").eq("identifier", identifier).execute()
    attempt = res_attempt.data[0] if res_attempt.data else None
    
    if attempt and attempt.get("attempts", 0) >= 5:
        locked_until_str = attempt.get("locked_until")
        if locked_until_str:
            locked_until = datetime.fromisoformat(locked_until_str.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) < locked_until:
                remaining_mins = max(1, int((locked_until - datetime.now(timezone.utc)).total_seconds() / 60) + 1)
                raise HTTPException(
                    status_code=429, 
                    detail=f"Too many failed attempts. Password reset is locked for {remaining_mins} minutes."
                )
            else:
                await db.table("login_attempts").delete().eq("identifier", identifier).execute()
    
    res_user = await db.table("users").select("*").eq("email", email).execute()
    user = res_user.data[0] if res_user.data else None
    if not user:
        raise HTTPException(status_code=404, detail="Registered user account not found.")
    
    # Check or seed security questions
    hashes = await get_user_security_hashes_async(email)
    if not hashes:
        await set_user_security_answers_async(email, "saint mary", "mary", "john")
    
    return {
        "status": "ok",
        "email": email,
        "questions": [
            "What was the name of your first school?",
            "What is your mother's first name?",
            "What is your father's first name?"
        ]
    }

@router.post("/forgot-password/verify-questions")
async def forgot_password_verify_questions(req: ForgotPasswordVerifyQuestionsRequest, request: Request):
    db = get_db()
    email = req.email.strip().lower()
    
    ip = request.client.host if request.client else "unknown"
    identifier = f"reset:{ip}:{email}"
    
    res_attempt = await db.table("login_attempts").select("*").eq("identifier", identifier).execute()
    attempt = res_attempt.data[0] if res_attempt.data else None
    
    if attempt and attempt.get("attempts", 0) >= 5:
        locked_until_str = attempt.get("locked_until")
        if locked_until_str:
            locked_until = datetime.fromisoformat(locked_until_str.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) < locked_until:
                remaining_mins = max(1, int((locked_until - datetime.now(timezone.utc)).total_seconds() / 60) + 1)
                raise HTTPException(
                    status_code=429, 
                    detail=f"Too many failed attempts. Password reset process is locked for {remaining_mins} minutes."
                )
            else:
                await db.table("login_attempts").delete().eq("identifier", identifier).execute()
                
    valid = await verify_user_security_answers_async(email, req.sec_school, req.sec_mother, req.sec_father)
    if not valid:
        await _increment_login_attempts(db, identifier)
        res_check = await db.table("login_attempts").select("*").eq("identifier", identifier).execute()
        cur_attempts = res_check.data[0].get("attempts", 1) if res_check.data else 1
        if cur_attempts >= 5:
            raise HTTPException(
                status_code=429, 
                detail="Too many failed attempts. Password reset is locked for 15 minutes."
            )
        remaining = max(0, 5 - cur_attempts)
        raise HTTPException(
            status_code=400, 
            detail=f"Incorrect security answers. ({remaining} attempts remaining before temporary 15-minute lock)."
        )

    # Success: reset attempt counter
    await db.table("login_attempts").delete().eq("identifier", identifier).execute()
    
    res_user = await db.table("users").select("*").eq("email", email).execute()
    user = res_user.data[0] if res_user.data else None
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    token = generate_reset_token()
    await db.table("password_reset_tokens").insert({
        "user_id": str(user["id"]),
        "token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
        "used": False
    }).execute()
    
    return {
        "status": "verified",
        "reset_token": token,
        "message": "Security questions verified successfully."
    }

@router.post("/forgot-password/reset-password")
async def forgot_password_reset_password(req: ForgotPasswordResetRequest):
    db = get_db()
    if not req.new_password or len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
        
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="New password and Confirm password do not match.")
        
    res_token = await db.table("password_reset_tokens").select("*").eq("token", req.reset_token).eq("used", False).execute()
    token_doc = res_token.data[0] if res_token.data else None
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
        
    expires_at = datetime.fromisoformat(token_doc["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired.")
        
    user_id = token_doc["user_id"]
    await db.table("users").update({
        "password_hash": hash_password(req.new_password),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", user_id).execute()
    
    await db.table("password_reset_tokens").update({"used": True}).eq("id", token_doc["id"]).execute()
    return {"message": "Password reset successfully! You may now log in with your new password."}

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

@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, request: Request):
    db = get_db()
    current_user = await get_current_user(request, db)
    
    if not req.current_password or not req.new_password or not req.confirm_password:
        raise HTTPException(status_code=400, detail="All password fields are required")
        
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirm password do not match")
        
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")
        
    user_uuid = parse_uuid(current_user["id"])
    res_user = await db.table("users").select("password_hash").eq("id", user_uuid).execute()
    if not res_user.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    stored_hash = res_user.data[0]["password_hash"]
    if not verify_password(req.current_password, stored_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    new_hash = hash_password(req.new_password)
    await db.table("users").update({
        "password_hash": new_hash,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", user_uuid).execute()
    
    await db.table("activity_logs").insert({
        "user_id": str(current_user["id"]),
        "user_name": current_user.get("name", ""),
        "action": "password_changed",
        "entity_type": "user",
        "entity_id": str(current_user["id"]),
        "details": f"User {current_user.get('name', '')} changed their password",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }).execute()
    
    return {"message": "Password changed successfully"}

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

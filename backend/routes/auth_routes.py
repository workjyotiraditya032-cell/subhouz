from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from database import get_db
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
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("attempts", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.now(timezone.utc) < locked_until:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})
    
    user = await db.users.find_one({"email": email})
    if not user:
        await _increment_login_attempts(db, identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(req.password, user["password_hash"]):
        await _increment_login_attempts(db, identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Clear attempts on success
    await db.login_attempts.delete_one({"identifier": identifier})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email, user["role"])
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    
    # Log activity
    await db.activity_logs.insert_one({
        "user_id": user_id, "user_name": user.get("name", ""),
        "action": "login", "entity_type": "user", "entity_id": user_id,
        "details": f"{user.get('name', '')} logged in",
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {
        "id": user_id, "email": user["email"], "name": user.get("name", ""),
        "role": user["role"], "hostel_id": user.get("hostel_id"),
        "phone": user.get("phone"), "avatar": user.get("avatar"),
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
        count = await db.users.count_documents({})
        if count > 0:
            raise HTTPException(status_code=403, detail="Only Super Admin can register new users")
    
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": req.role,
        "hostel_id": req.hostel_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
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
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        new_access = create_access_token(str(user["_id"]), user["email"], user["role"])
        response.set_cookie(key="access_token", value=new_access, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
        return {"message": "Token refreshed", "token": new_access}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    db = get_db()
    user = await db.users.find_one({"email": req.email.strip().lower()})
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}
    token = generate_reset_token()
    await db.password_reset_tokens.insert_one({
        "user_id": str(user["_id"]),
        "token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "used": False
    })
    logger.info(f"Password reset token for {req.email}: {token}")
    return {"message": "If the email exists, a reset link has been sent", "reset_token": token}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    db = get_db()
    token_doc = await db.password_reset_tokens.find_one({"token": req.token, "used": False})
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if datetime.now(timezone.utc) > token_doc["expires_at"]:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    await db.users.update_one(
        {"_id": ObjectId(token_doc["user_id"])},
        {"$set": {"password_hash": hash_password(req.new_password), "updated_at": datetime.now(timezone.utc)}}
    )
    await db.password_reset_tokens.update_one({"_id": token_doc["_id"]}, {"$set": {"used": True}})
    return {"message": "Password reset successfully"}

@router.get("/users")
async def list_users(request: Request):
    db = get_db()
    current_user = await get_current_user(request, db)
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Access denied")
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    for u in users:
        u["_id"] = str(u["_id"])
        u["id"] = u["_id"]
    return users

async def _increment_login_attempts(db, identifier: str):
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt:
        new_count = attempt.get("attempts", 0) + 1
        update = {"$set": {"attempts": new_count}}
        if new_count >= 5:
            update["$set"]["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=15)
        await db.login_attempts.update_one({"identifier": identifier}, update)
    else:
        await db.login_attempts.insert_one({"identifier": identifier, "attempts": 1, "created_at": datetime.now(timezone.utc)})

from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from database import get_db, get_client, init_db
from auth import hash_password, verify_password
from datetime import datetime, timezone
# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__) 
app = FastAPI(title="Subhouz API", description="Smart Hostel Management Platform", version="1.0.0")
@app.get("/")
async def root():
    return {
        "status": "success",
        "message": "SubHouz API is running",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}
# CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url.rstrip("/"))
cors_origins_env = os.environ.get("CORS_ORIGINS")
if cors_origins_env and cors_origins_env != "*":
    for o in cors_origins_env.split(","):
        origins.append(o.strip().rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from routes.auth_routes import router as auth_router
from routes.search_routes import router as search_router
from routes.hostel_routes import router as hostel_router
from routes.room_routes import router as room_router
from routes.resident_routes import router as resident_router
from routes.rent_routes import router as rent_router
from routes.dashboard_routes import router as dashboard_router
from routes.automation_routes import router as automation_router
from routes.enquiry_routes import router as enquiry_router
from routes.admin_routes import router as admin_router
from routes.electricity_routes import router as electricity_router
from routes.website_images_routes import router as website_images_router

app.include_router(auth_router)
app.include_router(hostel_router)
app.include_router(room_router)
app.include_router(resident_router)
app.include_router(rent_router)
app.include_router(dashboard_router)
app.include_router(automation_router)
app.include_router(enquiry_router)
app.include_router(admin_router)
app.include_router(electricity_router)
app.include_router(website_images_router)
app.include_router(search_router)


@app.get("/api")
async def root():
    return {"message": "Subhouz API is running", "version": "1.0.0"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    await init_db()
    db = get_db()
    from services.search_db import init_search_db
    await init_search_db(db)
    
    # Seed super admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@subhouz.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "SubhouzAdmin@2026")
    
    res = await db.table("users").select("*").eq("email", admin_email).execute()
    existing = res.data[0] if res.data else None
    
    if existing is None:
        hashed = hash_password(admin_password)
        await db.table("users").insert({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Super Admin",
            "role": "super_admin",
            "hostel_id": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        logger.info(f"Super Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.table("users").update({
            "password_hash": hash_password(admin_password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("email", admin_email).execute()
        logger.info(f"Super Admin password updated: {admin_email}")
    
    # Write test credentials
    creds_path = Path("/app/memory/test_credentials.md")
    try:
        creds_path.parent.mkdir(parents=True, exist_ok=True)
        creds_path.write_text(f"""# Test Credentials

## Super Admin
- Email: {admin_email}
- Password: {admin_password}
- Role: super_admin

## API Endpoints
- POST /api/auth/login
- POST /api/auth/register
- GET /api/auth/me
- POST /api/auth/logout
- GET /api/hostels
- GET /api/rooms
- GET /api/residents
- GET /api/rent/tracker
- POST /api/rent/mark-paid/{{resident_id}}
- GET /api/dashboard/stats
- GET /api/automation/workflows
""")
        logger.info("Test credentials written to /app/memory/test_credentials.md")
    except Exception as e:
        logger.warning(f"Could not write credentials to {creds_path}: {e}")


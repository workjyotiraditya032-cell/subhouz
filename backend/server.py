from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from database import get_db, get_client
from auth import hash_password, verify_password
from datetime import datetime, timezone

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Subhouz API", description="Smart Hostel Management Platform", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from routes.auth_routes import router as auth_router
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

@app.get("/api")
async def root():
    return {"message": "Subhouz API is running", "version": "1.0.0"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    db = get_db()
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.residents.create_index([("hostel_id", 1), ("status", 1)])
    await db.rooms.create_index("hostel_id")
    await db.beds.create_index([("hostel_id", 1), ("room_id", 1)])
    await db.rent_payments.create_index([("resident_id", 1), ("month", 1), ("year", 1)])
    await db.rent_payments.create_index([("hostel_id", 1), ("month", 1), ("year", 1)])
    await db.activity_logs.create_index([("timestamp", -1)])
    
    # Seed super admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@subhouz.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "SubhouzAdmin@2026")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Super Admin",
            "role": "super_admin",
            "hostel_id": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
        logger.info(f"Super Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Super Admin password updated: {admin_email}")
    
    # Seed initial data
    from seed import seed_database
    seeded = await seed_database(db)
    if seeded:
        logger.info("Database seeded with 3 hostels and sample data")
    
    # Write test credentials
    creds_path = Path("/app/memory/test_credentials.md")
    creds_path.parent.mkdir(parents=True, exist_ok=True)
    creds_path.write_text(f"""# Test Credentials

## Super Admin
- Email: {admin_email}
- Password: {admin_password}
- Role: super_admin

## Hostel Admins
- Jogmaya Admin: jogmaya.admin@subhouz.com / hostel@123
- Homely Havens Admin: homely.admin@subhouz.com / hostel@123
- GS Residency Admin: gs.admin@subhouz.com / hostel@123

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

@app.on_event("shutdown")
async def shutdown_event():
    client = get_client()
    if client:
        client.close()

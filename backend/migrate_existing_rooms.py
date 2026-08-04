"""
Migration script: Update all existing rooms in database to set has_bathroom=False by default.
"""
import asyncio
from database import init_db

async def migrate_rooms():
    db = await init_db()
    res = await db.table("rooms").select("id").execute()
    rooms = res.data or []
    print(f"Found {len(rooms)} existing rooms to migrate...")
    for r in rooms:
        await db.table("rooms").update({
            "has_bathroom": False
        }).eq("id", r["id"]).execute()
    print("Successfully updated existing rooms to default has_bathroom=False!")

if __name__ == "__main__":
    asyncio.run(migrate_rooms())

"""
Migration script: Populate default hashed security questions for existing admin users.
Defaults:
- School: "saint mary"
- Mother: "mary"
- Father: "john"
"""
import asyncio
from database import init_db
from auth import hash_password

async def migrate_security_questions():
    db = await init_db()
    res = await db.table("users").select("id, email").execute()
    users = res.data or []
    print(f"Migrating security questions for {len(users)} users...")

    school_hash = hash_password("saint mary")
    mother_hash = hash_password("mary")
    father_hash = hash_password("john")

    for u in users:
        await db.table("users").update({
            "sec_school_hash": school_hash,
            "sec_mother_hash": mother_hash,
            "sec_father_hash": father_hash
        }).eq("id", u["id"]).execute()

    print("Successfully updated security questions for all users!")

if __name__ == "__main__":
    asyncio.run(migrate_security_questions())

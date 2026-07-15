import os
import uuid
import re
from fastapi import HTTPException

# Monkey-patch the regex match check in the supabase async client module
# to support the new sb_publishable/sb_secret key formats.
import supabase._async.client
original_match = re.match
def custom_match(pattern, string, flags=0):
    if pattern == r"^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$":
        if string and (string.startswith("sb_publishable_") or string.startswith("sb_secret_")):
            class MockMatch:
                pass
            return MockMatch()
    return original_match(pattern, string, flags)
supabase._async.client.re.match = custom_match

from supabase import AClient, acreate_client
from typing import Optional

# Global Supabase client singleton
_supabase_client: Optional[AClient] = None

async def init_db() -> AClient:
    global _supabase_client
    if _supabase_client is None:
        url = os.environ.get("SUPABASE_URL") or "https://dekprtlfwyhtcunyuvuc.supabase.co"
        key = os.environ.get("SUPABASE_KEY") or "sb_publishable_J2CtXqm2J2HQ7VDuEOljEQ_43f1wFkJ"
        _supabase_client = await acreate_client(url, key)
    return _supabase_client

def get_db() -> AClient:
    global _supabase_client
    if _supabase_client is None:
        # Fallback if accessed before async startup
        url = os.environ.get("SUPABASE_URL") or "https://dekprtlfwyhtcunyuvuc.supabase.co"
        key = os.environ.get("SUPABASE_KEY") or "sb_publishable_J2CtXqm2J2HQ7VDuEOljEQ_43f1wFkJ"
        # We cannot await in sync get_db, so we raise or wait for startup
        raise RuntimeError("Database not initialized. Ensure init_db() was called on startup.")
    return _supabase_client

def get_client() -> AClient:

    return get_db()

def parse_uuid(val: str) -> str:
    """Helper to validate if a string is a valid UUID, returning the validated string.
    Raises 404 error on failure, to match the previous MongoDB ObjectId behavior."""
    if not val:
        raise HTTPException(status_code=404, detail="Invalid ID")
    try:
        return str(uuid.UUID(str(val)))
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid ID format or not found")

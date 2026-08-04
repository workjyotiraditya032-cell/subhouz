"""
Service for persisting and retrieving hashed security question answers in Supabase DB.
Answers are normalized (.strip().lower()) and bcrypt-hashed before saving.
"""
import json
import os
import asyncio
from pathlib import Path
from auth import hash_password, verify_password

DATA_FILE = Path(__file__).parent.parent / "security_questions_data.json"

DEFAULT_SECURITY_QUESTIONS = [
    "What was the name of your first school?",
    "What is your mother's first name?",
    "What is your father's first name?"
]

def _load_local_data() -> dict:
    if not DATA_FILE.exists():
        default_data = {
            "admin@subhouz.com": {
                "school_hash": hash_password("saint mary"),
                "mother_hash": hash_password("mary"),
                "father_hash": hash_password("john")
            },
            "jogmaya.admin@subhouz.com": {
                "school_hash": hash_password("saint mary"),
                "mother_hash": hash_password("mary"),
                "father_hash": hash_password("john")
            }
        }
        _save_local_data(default_data)
        return default_data

    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_local_data(data: dict):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


async def get_user_security_hashes_async(email: str) -> dict:
    """Retrieve security question hashes for a user from Supabase DB, fallback to local JSON."""
    email_key = email.strip().lower()

    try:
        from database import get_db
        db = get_db()
        res = await db.table("users").select("avatar").eq("email", email_key).execute()
        if res.data and res.data[0].get("avatar"):
            raw_avatar = res.data[0]["avatar"]
            if raw_avatar and (raw_avatar.startswith("{") or raw_avatar.startswith("sec_q:")):
                cleaned = raw_avatar.replace("sec_q:", "")
                parsed = json.loads(cleaned)
                if "school_hash" in parsed:
                    return parsed
    except Exception:
        pass

    # Fallback to local data
    data = _load_local_data()
    return data.get(email_key)


def _get_running_loop():
    try:
        return asyncio.get_running_loop()
    except RuntimeError:
        return None


def get_user_security_hashes(email: str) -> dict:
    """Synchronous helper for get_user_security_hashes_async."""
    loop = _get_running_loop()
    if loop and loop.is_running():
        return _load_local_data().get(email.strip().lower())
    try:
        return asyncio.run(get_user_security_hashes_async(email))
    except Exception:
        return _load_local_data().get(email.strip().lower())


async def set_user_security_answers_async(email: str, school_ans: str, mother_ans: str, father_ans: str):
    """Normalize, bcrypt-hash, and persist security answers in Supabase DB."""
    email_key = email.strip().lower()

    school_norm = (school_ans or "").strip().lower()
    mother_norm = (mother_ans or "").strip().lower()
    father_norm = (father_ans or "").strip().lower()

    sec_dict = {
        "school_hash": hash_password(school_norm) if school_norm else None,
        "mother_hash": hash_password(mother_norm) if mother_norm else None,
        "father_hash": hash_password(father_norm) if father_norm else None
    }

    # 1. Save to local JSON cache
    local_data = _load_local_data()
    local_data[email_key] = sec_dict
    _save_local_data(local_data)

    # 2. Update Supabase users table
    try:
        from database import get_db
        db = get_db()
        avatar_payload = json.dumps(sec_dict)
        await db.table("users").update({"avatar": avatar_payload}).eq("email", email_key).execute()
    except Exception as e:
        print(f"Supabase security questions save warning: {e}")


def set_user_security_answers(email: str, school_ans: str, mother_ans: str, father_ans: str):
    """Synchronous wrapper for set_user_security_answers_async."""
    email_key = email.strip().lower()
    school_norm = (school_ans or "").strip().lower()
    mother_norm = (mother_ans or "").strip().lower()
    father_norm = (father_ans or "").strip().lower()

    sec_dict = {
        "school_hash": hash_password(school_norm) if school_norm else None,
        "mother_hash": hash_password(mother_norm) if mother_norm else None,
        "father_hash": hash_password(father_norm) if father_norm else None
    }

    local_data = _load_local_data()
    local_data[email_key] = sec_dict
    _save_local_data(local_data)

    loop = _get_running_loop()
    if not (loop and loop.is_running()):
        try:
            asyncio.run(set_user_security_answers_async(email, school_ans, mother_ans, father_ans))
        except Exception:
            pass


async def verify_user_security_answers_async(email: str, school_ans: str, mother_ans: str, father_ans: str) -> bool:
    """Verify user security question answers against Supabase DB hashes."""
    hashes = await get_user_security_hashes_async(email)
    if not hashes:
        return False

    school_norm = (school_ans or "").strip().lower()
    mother_norm = (mother_ans or "").strip().lower()
    father_norm = (father_ans or "").strip().lower()

    if not school_norm or not mother_norm or not father_norm:
        return False

    school_ok = verify_password(school_norm, hashes.get("school_hash", "")) if hashes.get("school_hash") else False
    mother_ok = verify_password(mother_norm, hashes.get("mother_hash", "")) if hashes.get("mother_hash") else False
    father_ok = verify_password(father_norm, hashes.get("father_hash", "")) if hashes.get("father_hash") else False

    return school_ok and mother_ok and father_ok


def verify_user_security_answers(email: str, school_ans: str, mother_ans: str, father_ans: str) -> bool:
    """Synchronous wrapper for verify_user_security_answers_async."""
    hashes = get_user_security_hashes(email)
    if not hashes:
        return False

    school_norm = (school_ans or "").strip().lower()
    mother_norm = (mother_ans or "").strip().lower()
    father_norm = (father_ans or "").strip().lower()

    if not school_norm or not mother_norm or not father_norm:
        return False

    school_ok = verify_password(school_norm, hashes.get("school_hash", "")) if hashes.get("school_hash") else False
    mother_ok = verify_password(mother_norm, hashes.get("mother_hash", "")) if hashes.get("mother_hash") else False
    father_ok = verify_password(father_norm, hashes.get("father_hash", "")) if hashes.get("father_hash") else False

    return school_ok and mother_ok and father_ok

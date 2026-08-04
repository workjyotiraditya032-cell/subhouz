from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from database import get_db, parse_uuid
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/rent", tags=["rent"])

class MarkPaidRequest(BaseModel):
    payment_mode: Optional[str] = "cash"
    amount: Optional[float] = None
    notes: Optional[str] = None
    transaction_id: Optional[str] = None
    balance: Optional[float] = 0.0

@router.get("/tracker")
async def get_rent_tracker(request: Request, hostel_id: Optional[str] = Query(None), month: Optional[int] = Query(None), year: Optional[int] = Query(None)):
    """Get rent status for all residents for a given month."""
    db = get_db()
    user = await get_current_user(request, db)
    
    now = datetime.now(timezone.utc)
    target_month = month or now.month
    target_year = year or now.year
    
    # Get residents
    q = db.table("residents").select("*").eq("status", "active")
    if user["role"] == "hostel_admin":
        q = q.eq("hostel_id", parse_uuid(user.get("hostel_id")))
    elif hostel_id:
        q = q.eq("hostel_id", parse_uuid(hostel_id))
        
    q = q.order("name", desc=False)
    res_res = await q.execute()
    residents = res_res.data
    
    result = []
    for r in residents:
        r_uuid = parse_uuid(r["id"])
        r_id = str(r["id"])
        
        # Check for existing payment record
        res_p = await db.table("rent_payments").select("*").eq("resident_id", r_uuid).eq("month", target_month).eq("year", target_year).execute()
        payment = res_p.data[0] if res_p.data else None
        
        # Get hostel due date
        hostel = None
        if r.get("hostel_id"):
            h_uuid = parse_uuid(r["hostel_id"])
            res_h = await db.table("hostels").select("*").eq("id", h_uuid).execute()
            hostel = res_h.data[0] if res_h.data else None
            
        due_date = r.get("due_date_override") or (hostel.get("monthly_due_date", 5) if hostel else 5)
        
        status = "pending"
        if payment:
            status = payment.get("status", "pending")
        elif now.day > due_date and target_month == now.month and target_year == now.year:
            status = "overdue"
            
        paid_amount = float(payment.get("amount")) if (payment and payment.get("amount") is not None) else float(r.get("monthly_rent", 0))

        entry = {
            "resident_id": r_id,
            "name": r.get("name", ""),
            "phone": r.get("phone", ""),
            "whatsapp": r.get("whatsapp", r.get("phone", "")),
            "room_number": r.get("room_number", ""),
            "bed_number": r.get("bed_number", ""),
            "hostel_id": r.get("hostel_id", ""),
            "monthly_rent": float(r.get("monthly_rent", 0)),
            "paid_amount": paid_amount,
            "due_date": due_date,
            "month": target_month,
            "year": target_year,
            "status": status,
            "payment_id": str(payment["id"]) if payment else None,
            "paid_on": str(payment.get("paid_on")) if payment and payment.get("paid_on") else None,
            "payment_mode": payment.get("payment_mode") if payment else None,
            "receipt_number": payment.get("receipt_number") if payment else None,
            "challan_sent_at": str(payment.get("challan_sent_at")) if payment and payment.get("challan_sent_at") else None,
            "reminder_sent_at": str(payment.get("reminder_sent_at")) if payment and payment.get("reminder_sent_at") else None,
        }
        result.append(entry)
        
    return {
        "month": target_month,
        "year": target_year,
        "entries": result,
        "summary": {
            "total": len(result),
            "paid": sum(1 for e in result if e["status"] == "paid"),
            "pending": sum(1 for e in result if e["status"] == "pending"),
            "overdue": sum(1 for e in result if e["status"] == "overdue"),
            "total_expected": sum(e["monthly_rent"] for e in result),
            "total_collected": sum(e["paid_amount"] for e in result if e["status"] == "paid"),
        }
    }

@router.post("/mark-paid/{resident_id}")
async def mark_rent_paid(resident_id: str, request: Request, req: MarkPaidRequest, month: Optional[int] = Query(None), year: Optional[int] = Query(None)):
    """One-tap mark rent as paid for a resident."""
    db = get_db()
    user = await get_current_user(request, db)
    
    now = datetime.now(timezone.utc)
    target_month = month or now.month
    target_year = year or now.year
    
    res_uuid = parse_uuid(resident_id)
    res_resident = await db.table("residents").select("*").eq("id", res_uuid).execute()
    resident = res_resident.data[0] if res_resident.data else None
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
        
    if user["role"] == "hostel_admin" and user.get("hostel_id") != resident.get("hostel_id"):
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Generate receipt number
    hostel = None
    if resident.get("hostel_id"):
        res_h = await db.table("hostels").select("*").eq("id", parse_uuid(resident["hostel_id"])).execute()
        hostel = res_h.data[0] if res_h.data else None
        
    hostel_code = hostel.get("code", "SH") if hostel else "SH"
    
    res_cnt = await db.table("rent_payments").select("id", count="exact").eq("hostel_id", parse_uuid(resident["hostel_id"])).eq("year", target_year).eq("month", target_month).eq("status", "paid").execute()
    count = res_cnt.count or 0
    receipt_number = f"SH-{hostel_code}-{target_year}{target_month:02d}-{count + 1:04d}"
    
    # Check if payment already exists
    res_existing = await db.table("rent_payments").select("*").eq("resident_id", res_uuid).eq("month", target_month).eq("year", target_year).execute()
    existing = res_existing.data[0] if res_existing.data else None

    actual_amount = float(req.amount) if (req.amount is not None and req.amount > 0) else float(resident.get("monthly_rent", 0))

    payment_data = {
        "status": "paid",
        "paid_on": now.isoformat(),
        "payment_mode": req.payment_mode,
        "receipt_number": receipt_number,
        "notes": req.notes,
        "transaction_id": req.transaction_id,
        "balance": req.balance or 0.0,
        "amount": actual_amount,
        "marked_by": parse_uuid(user["id"]),
        "updated_at": now.isoformat()
    }
    
    if existing:
        await db.table("rent_payments").update(payment_data).eq("id", parse_uuid(existing["id"])).execute()
        payment_id = str(existing["id"])
    else:
        payment_data.update({
            "resident_id": res_uuid,
            "hostel_id": parse_uuid(resident.get("hostel_id")),
            "resident_name": resident.get("name"),
            "room_number": resident.get("room_number"),
            "bed_number": resident.get("bed_number"),
            "month": target_month,
            "year": target_year,
            "amount": actual_amount,
            "created_at": now.isoformat()
        })
        res_insert = await db.table("rent_payments").insert(payment_data).execute()
        payment_id = str(res_insert.data[0]["id"])
        
    # Log activity
    await db.table("activity_logs").insert({
        "user_id": str(user["id"]),
        "user_name": user.get("name", ""),
        "hostel_id": parse_uuid(resident.get("hostel_id")),
        "action": "rent_marked_paid",
        "entity_type": "rent_payment",
        "entity_id": payment_id,
        "details": f"Marked rent paid for {resident.get('name', '')} - {target_month}/{target_year} - Receipt: {receipt_number}",
        "metadata": {"resident_name": resident.get("name"), "amount": resident.get("monthly_rent", 0), "receipt_number": receipt_number},
        "timestamp": now.isoformat()
    }).execute()
    
    # Trigger Payment Storage/Challan automation via EventBus
    from services.event_bus import EventBus, PAYMENT_RECORDED
    payment_data_for_storage = {
        **payment_data,
        "id": payment_id,
        "resident_id": resident["id"],
        "resident_name": resident["name"],
        "hostel_id": resident["hostel_id"],
        "month": target_month,
        "year": target_year,
        "amount": resident.get("monthly_rent", 0)
    }
    await EventBus.emit(PAYMENT_RECORDED, payment_data_for_storage)
    
    return {
        "message": "Rent marked as paid",
        "payment_id": payment_id,
        "receipt_number": receipt_number,
        "resident_name": resident.get("name"),
        "amount": resident.get("monthly_rent", 0),
        "month": target_month,
        "year": target_year
    }

@router.post("/mark-unpaid/{resident_id}")
async def mark_rent_unpaid(resident_id: str, request: Request, month: Optional[int] = Query(None), year: Optional[int] = Query(None)):
    """Undo: mark rent as pending."""
    db = get_db()
    user = await get_current_user(request, db)
    
    now = datetime.now(timezone.utc)
    target_month = month or now.month
    target_year = year or now.year
    
    res_uuid = parse_uuid(resident_id)
    await db.table("rent_payments").update({
        "status": "pending",
        "paid_on": None,
        "receipt_number": None,
        "updated_at": now.isoformat()
    }).eq("resident_id", res_uuid).eq("month", target_month).eq("year", target_year).execute()
    
    return {"message": "Rent marked as unpaid"}

@router.get("/payments")
async def list_payments(request: Request, hostel_id: Optional[str] = Query(None), month: Optional[int] = Query(None), year: Optional[int] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    
    q = db.table("rent_payments").select("*")
    if user["role"] == "hostel_admin":
        q = q.eq("hostel_id", parse_uuid(user.get("hostel_id")))
    elif hostel_id:
        q = q.eq("hostel_id", parse_uuid(hostel_id))
    if month:
        q = q.eq("month", month)
    if year:
        q = q.eq("year", year)
        
    q = q.order("year", desc=True).order("month", desc=True).order("paid_on", desc=True)
    res_payments = await q.execute()
    payments = res_payments.data
    
    for p in payments:
        p["_id"] = str(p["id"])
        p["id"] = p["_id"]
        if p.get("paid_on"):
            p["paid_on"] = str(p["paid_on"])
        if p.get("created_at"):
            p["created_at"] = str(p["created_at"])
    return payments

@router.get("/receipt/{payment_id}")
async def get_receipt(payment_id: str, request: Request):
    db = get_db()
    p_uuid = parse_uuid(payment_id)
    
    res_pay = await db.table("rent_payments").select("*").eq("id", p_uuid).execute()
    payment = res_pay.data[0] if res_pay.data else None
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
        
    payment["_id"] = str(payment["id"])
    payment["id"] = payment["_id"]
    
    # Get hostel info
    hostel = None
    if payment.get("hostel_id"):
        res_h = await db.table("hostels").select("*").eq("id", parse_uuid(payment["hostel_id"])).execute()
        hostel = res_h.data[0] if res_h.data else None
        if hostel:
            hostel["_id"] = str(hostel["id"])
            
    resident = None
    if payment.get("resident_id"):
        res_res = await db.table("residents").select("*").eq("id", parse_uuid(payment["resident_id"])).execute()
        resident = res_res.data[0] if res_res.data else None
        if resident:
            resident["_id"] = str(resident["id"])
            
    if payment.get("paid_on"):
        payment["paid_on"] = str(payment["paid_on"])
        
    return {
        "payment": payment,
        "hostel": hostel,
        "resident": resident
    }



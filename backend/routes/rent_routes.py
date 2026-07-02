from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from database import get_db
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/rent", tags=["rent"])

class MarkPaidRequest(BaseModel):
    payment_mode: Optional[str] = "cash"
    notes: Optional[str] = None

@router.get("/tracker")
async def get_rent_tracker(request: Request, hostel_id: Optional[str] = Query(None), month: Optional[int] = Query(None), year: Optional[int] = Query(None)):
    """Get rent status for all residents for a given month."""
    db = get_db()
    user = await get_current_user(request, db)
    
    now = datetime.now(timezone.utc)
    target_month = month or now.month
    target_year = year or now.year
    
    # Get residents
    resident_query = {"status": "active"}
    if user["role"] == "hostel_admin":
        resident_query["hostel_id"] = user.get("hostel_id")
    elif hostel_id:
        resident_query["hostel_id"] = hostel_id
    
    residents = await db.residents.find(resident_query).sort("name", 1).to_list(1000)
    
    result = []
    for r in residents:
        r_id = str(r["_id"])
        # Check for existing payment record
        payment = await db.rent_payments.find_one({
            "resident_id": r_id,
            "month": target_month,
            "year": target_year
        })
        
        # Get hostel due date
        hostel = await db.hostels.find_one({"_id": ObjectId(r.get("hostel_id", ""))}) if r.get("hostel_id") else None
        due_date = r.get("due_date_override") or (hostel.get("monthly_due_date", 5) if hostel else 5)
        
        status = "pending"
        if payment:
            status = payment.get("status", "pending")
        elif now.day > due_date and target_month == now.month and target_year == now.year:
            status = "overdue"
        
        entry = {
            "resident_id": r_id,
            "name": r.get("name", ""),
            "phone": r.get("phone", ""),
            "whatsapp": r.get("whatsapp", r.get("phone", "")),
            "room_number": r.get("room_number", ""),
            "bed_number": r.get("bed_number", ""),
            "hostel_id": r.get("hostel_id", ""),
            "monthly_rent": r.get("monthly_rent", 0),
            "due_date": due_date,
            "month": target_month,
            "year": target_year,
            "status": status,
            "payment_id": str(payment["_id"]) if payment else None,
            "paid_on": payment.get("paid_on").isoformat() if payment and payment.get("paid_on") and hasattr(payment["paid_on"], 'isoformat') else payment.get("paid_on") if payment else None,
            "payment_mode": payment.get("payment_mode") if payment else None,
            "receipt_number": payment.get("receipt_number") if payment else None,
            "challan_sent_at": payment.get("challan_sent_at").isoformat() if payment and payment.get("challan_sent_at") and hasattr(payment["challan_sent_at"], 'isoformat') else None,
            "reminder_sent_at": payment.get("reminder_sent_at").isoformat() if payment and payment.get("reminder_sent_at") and hasattr(payment["reminder_sent_at"], 'isoformat') else None,
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
            "total_collected": sum(e["monthly_rent"] for e in result if e["status"] == "paid"),
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
    
    resident = await db.residents.find_one({"_id": ObjectId(resident_id)})
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    
    if user["role"] == "hostel_admin" and user.get("hostel_id") != resident.get("hostel_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate receipt number
    hostel = await db.hostels.find_one({"_id": ObjectId(resident.get("hostel_id", ""))}) if resident.get("hostel_id") else None
    hostel_code = hostel.get("code", "SH") if hostel else "SH"
    count = await db.rent_payments.count_documents({"hostel_id": resident.get("hostel_id"), "year": target_year, "month": target_month, "status": "paid"})
    receipt_number = f"SH-{hostel_code}-{target_year}{target_month:02d}-{count + 1:04d}"
    
    # Check if payment already exists
    existing = await db.rent_payments.find_one({
        "resident_id": resident_id,
        "month": target_month,
        "year": target_year
    })
    
    payment_data = {
        "status": "paid",
        "paid_on": now,
        "payment_mode": req.payment_mode,
        "receipt_number": receipt_number,
        "notes": req.notes,
        "marked_by": user.get("_id"),
        "updated_at": now
    }
    
    if existing:
        await db.rent_payments.update_one({"_id": existing["_id"]}, {"$set": payment_data})
        payment_id = str(existing["_id"])
    else:
        payment_data.update({
            "resident_id": resident_id,
            "hostel_id": resident.get("hostel_id"),
            "resident_name": resident.get("name"),
            "room_number": resident.get("room_number"),
            "bed_number": resident.get("bed_number"),
            "month": target_month,
            "year": target_year,
            "amount": resident.get("monthly_rent", 0),
            "created_at": now
        })
        result = await db.rent_payments.insert_one(payment_data)
        payment_id = str(result.inserted_id)
    
    # Log activity
    await db.activity_logs.insert_one({
        "user_id": user["_id"], "user_name": user.get("name", ""),
        "hostel_id": resident.get("hostel_id"),
        "action": "rent_marked_paid",
        "entity_type": "rent_payment", "entity_id": payment_id,
        "details": f"Marked rent paid for {resident.get('name', '')} - {target_month}/{target_year} - Receipt: {receipt_number}",
        "metadata": {"resident_name": resident.get("name"), "amount": resident.get("monthly_rent", 0), "receipt_number": receipt_number},
        "timestamp": now
    })
    
    # Trigger automation: send WhatsApp challan
    await _trigger_challan_automation(db, resident, payment_data, hostel)
    
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
    
    result = await db.rent_payments.update_one(
        {"resident_id": resident_id, "month": target_month, "year": target_year},
        {"$set": {"status": "pending", "paid_on": None, "receipt_number": None, "updated_at": now}}
    )
    return {"message": "Rent marked as unpaid"}

@router.get("/payments")
async def list_payments(request: Request, hostel_id: Optional[str] = Query(None), month: Optional[int] = Query(None), year: Optional[int] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    query = {}
    if user["role"] == "hostel_admin":
        query["hostel_id"] = user.get("hostel_id")
    elif hostel_id:
        query["hostel_id"] = hostel_id
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    
    payments = await db.rent_payments.find(query).sort([("year", -1), ("month", -1), ("paid_on", -1)]).to_list(1000)
    for p in payments:
        p["_id"] = str(p["_id"])
        p["id"] = p["_id"]
        if p.get("paid_on") and hasattr(p["paid_on"], 'isoformat'):
            p["paid_on"] = p["paid_on"].isoformat()
        if p.get("created_at") and hasattr(p["created_at"], 'isoformat'):
            p["created_at"] = p["created_at"].isoformat()
    return payments

@router.get("/receipt/{payment_id}")
async def get_receipt(payment_id: str, request: Request):
    db = get_db()
    payment = await db.rent_payments.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment["_id"] = str(payment["_id"])
    payment["id"] = payment["_id"]
    
    # Get hostel info
    hostel = None
    if payment.get("hostel_id"):
        hostel = await db.hostels.find_one({"_id": ObjectId(payment["hostel_id"])})
        if hostel:
            hostel["_id"] = str(hostel["_id"])
    
    resident = None
    if payment.get("resident_id"):
        resident = await db.residents.find_one({"_id": ObjectId(payment["resident_id"])})
        if resident:
            resident["_id"] = str(resident["_id"])
    
    if payment.get("paid_on") and hasattr(payment["paid_on"], 'isoformat'):
        payment["paid_on"] = payment["paid_on"].isoformat()
    
    return {
        "payment": payment,
        "hostel": hostel,
        "resident": resident
    }

async def _trigger_challan_automation(db, resident, payment_data, hostel):
    """Trigger WhatsApp challan automation after payment."""
    # Check if automation is enabled
    workflow = await db.automation_workflows.find_one({"trigger_type": "rent_paid", "enabled": True})
    if not workflow:
        logger.info("No rent_paid automation workflow enabled")
        return
    
    # Log the automation trigger
    await db.automation_logs.insert_one({
        "workflow_id": str(workflow["_id"]) if workflow else None,
        "workflow_name": "Rent Paid - Send Challan",
        "trigger": "rent_paid",
        "status": "triggered",
        "resident_id": str(resident["_id"]),
        "resident_name": resident.get("name"),
        "hostel_id": resident.get("hostel_id"),
        "details": f"Challan triggered for {resident.get('name')} - Receipt: {payment_data.get('receipt_number')}",
        "whatsapp_number": resident.get("whatsapp", resident.get("phone")),
        "message_template": "rent_challan",
        "timestamp": datetime.now(timezone.utc)
    })
    
    # Update payment with challan sent timestamp
    await db.rent_payments.update_one(
        {"resident_id": str(resident["_id"]), "month": payment_data.get("month"), "year": payment_data.get("year")},
        {"$set": {"challan_sent_at": datetime.now(timezone.utc)}}
    )
    
    logger.info(f"WhatsApp challan automation triggered for {resident.get('name')} - {resident.get('whatsapp', resident.get('phone'))}")

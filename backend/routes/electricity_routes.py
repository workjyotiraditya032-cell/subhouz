from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from database import get_db, parse_uuid
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/electricity", tags=["electricity"])

class BillCreate(BaseModel):
    resident_id: str
    hostel_id: str
    room_id: Optional[str] = None
    room_number: Optional[str] = None
    resident_name: Optional[str] = None
    previous_reading: float
    current_reading: float
    rate_per_unit: float = 8.0
    additional_charges: float = 0
    billing_month: int
    billing_year: int

class BillUpdate(BaseModel):
    previous_reading: Optional[float] = None
    current_reading: Optional[float] = None
    rate_per_unit: Optional[float] = None
    additional_charges: Optional[float] = None
    payment_status: Optional[str] = None
    payment_date: Optional[str] = None
    notes: Optional[str] = None

@router.get("/bills")
async def list_bills(request: Request, hostel_id: Optional[str] = Query(None), month: Optional[int] = Query(None), year: Optional[int] = Query(None), status: Optional[str] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    
    q = db.table("electricity_bills").select("*")
    if user["role"] == "hostel_admin":
        q = q.eq("hostel_id", parse_uuid(user.get("hostel_id")))
    elif hostel_id:
        q = q.eq("hostel_id", parse_uuid(hostel_id))
    if month:
        q = q.eq("billing_month", month)
    if year:
        q = q.eq("billing_year", year)
    if status:
        q = q.eq("payment_status", status)
        
    res_bills = await q.order("billing_year", desc=True).order("billing_month", desc=True).execute()
    bills = res_bills.data
    
    for b in bills:
        b["_id"] = str(b["id"])
        b["id"] = b["_id"]
        for k in ("created_at", "updated_at", "payment_date"):
            if b.get(k):
                b[k] = str(b[k])
    return bills

@router.post("/bills")
async def create_bill(req: BillCreate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] == "hostel_admin" and user.get("hostel_id") != req.hostel_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    if req.current_reading < req.previous_reading:
        raise HTTPException(status_code=400, detail="Current Reading cannot be less than Previous Reading.")

    units = max(0.0, req.current_reading - req.previous_reading)
    total = round(units * req.rate_per_unit + req.additional_charges, 2)
    
    resident_name = req.resident_name
    room_number = req.room_number
    if not resident_name:
        res_res = await db.table("residents").select("*").eq("id", parse_uuid(req.resident_id)).execute()
        resident = res_res.data[0] if res_res.data else None
        if resident:
            resident_name = resident.get("name", "")
            room_number = resident.get("room_number", "")
            
    doc = {
        "resident_id": parse_uuid(req.resident_id),
        "hostel_id": parse_uuid(req.hostel_id),
        "room_id": parse_uuid(req.room_id) if req.room_id else None,
        "room_number": room_number,
        "resident_name": resident_name,
        "previous_reading": req.previous_reading,
        "current_reading": req.current_reading,
        "units_consumed": units,
        "rate_per_unit": req.rate_per_unit,
        "additional_charges": req.additional_charges,
        "total_amount": total,
        "billing_month": req.billing_month,
        "billing_year": req.billing_year,
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    res_insert = await db.table("electricity_bills").insert(doc).execute()
    if not res_insert.data:
        raise HTTPException(status_code=500, detail="Failed to create bill")
        
    inserted_doc = res_insert.data[0]
    inserted_doc["_id"] = str(inserted_doc["id"])
    inserted_doc["id"] = inserted_doc["_id"]
    return inserted_doc

@router.put("/bills/{bill_id}")
async def update_bill(bill_id: str, req: BillUpdate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    
    bill_uuid = parse_uuid(bill_id)
    res_bill = await db.table("electricity_bills").select("*").eq("id", bill_uuid).execute()
    bill = res_bill.data[0] if res_bill.data else None
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
        
    # Recalculate if reading or rate changed
    prev = float(updates.get("previous_reading", bill.get("previous_reading") or 0.0))
    curr = float(updates.get("current_reading", bill.get("current_reading") or 0.0))
    rate = float(updates.get("rate_per_unit", bill.get("rate_per_unit") or 8.0))
    add = float(updates.get("additional_charges", bill.get("additional_charges") or 0.0))

    if "previous_reading" in updates or "current_reading" in updates or "rate_per_unit" in updates or "additional_charges" in updates:
        if curr < prev:
            raise HTTPException(status_code=400, detail="Current Reading cannot be less than Previous Reading.")
        units = max(0.0, curr - prev)
        updates["units_consumed"] = round(units, 2)
        updates["total_amount"] = round(units * rate + add, 2)
        
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    res_update = await db.table("electricity_bills").update(updates).eq("id", bill_uuid).execute()
    if not res_update.data:
        raise HTTPException(status_code=404, detail="Bill not found")
        
    updated_bill = res_update.data[0]
    updated_bill["_id"] = str(updated_bill["id"])
    updated_bill["id"] = updated_bill["_id"]
    return updated_bill

@router.post("/bills/{bill_id}/mark-paid")
async def mark_bill_paid(bill_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    now = datetime.now(timezone.utc)
    
    bill_uuid = parse_uuid(bill_id)
    res_update = await db.table("electricity_bills").update({
        "payment_status": "paid",
        "payment_date": now.isoformat(),
        "updated_at": now.isoformat()
    }).eq("id", bill_uuid).execute()
    
    if not res_update.data:
        raise HTTPException(status_code=404, detail="Bill not found")
    return {"message": "Bill marked as paid"}

@router.post("/generate-monthly")
async def generate_monthly_bills(request: Request, month: int = Query(...), year: int = Query(...)):
    db = get_db()
    user = await get_current_user(request, db)
    
    h_uuid = None
    if user["role"] == "hostel_admin":
        h_uuid = parse_uuid(user.get("hostel_id"))
        
    q = db.table("residents").select("*").eq("status", "active")
    if h_uuid:
        q = q.eq("hostel_id", h_uuid)
    res_res = await q.execute()
    residents = res_res.data
    generated = 0
    
    for r in residents:
        r_uuid = parse_uuid(r["id"])
        
        # Check if bill already exists
        res_exist = await db.table("electricity_bills").select("*").eq("resident_id", r_uuid).eq("billing_month", month).eq("billing_year", year).execute()
        if res_exist.data:
            continue
            
        # Get previous reading from last bill
        res_last = await db.table("electricity_bills").select("*").eq("resident_id", r_uuid).order("billing_year", desc=True).order("billing_month", desc=True).limit(1).execute()
        last_bill = res_last.data[0] if res_last.data else None
        prev_reading = last_bill["current_reading"] if last_bill else 0.0
        
        # Get rate from room
        rate = 8.0
        if r.get("room_id"):
            res_room = await db.table("rooms").select("electricity_rate").eq("id", parse_uuid(r["room_id"])).execute()
            room = res_room.data[0] if res_room.data else None
            if room:
                rate = room.get("electricity_rate", 8.0)
                
        doc = {
            "resident_id": r_uuid,
            "hostel_id": parse_uuid(r.get("hostel_id")),
            "room_id": parse_uuid(r.get("room_id")) if r.get("room_id") else None,
            "room_number": r.get("room_number", ""),
            "resident_name": r.get("name", ""),
            "previous_reading": prev_reading,
            "current_reading": prev_reading,  # Admin fills this in
            "units_consumed": 0.0,
            "rate_per_unit": rate,
            "additional_charges": 0.0,
            "total_amount": 0.0,
            "billing_month": month,
            "billing_year": year,
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.table("electricity_bills").insert(doc).execute()
        generated += 1
        
    return {"message": f"Generated {generated} electricity bills for {month}/{year}", "count": generated}

@router.get("/stats")
async def electricity_stats(request: Request, month: Optional[int] = Query(None), year: Optional[int] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year
    
    q = db.table("electricity_bills").select("*").eq("billing_month", m).eq("billing_year", y)
    if user["role"] == "hostel_admin":
        q = q.eq("hostel_id", parse_uuid(user.get("hostel_id")))
        
    res_bills = await q.execute()
    bills = res_bills.data
    
    total_bills = len(bills)
    paid = sum(1 for b in bills if b.get("payment_status") == "paid")
    pending = total_bills - paid
    total_amount = sum(float(b.get("total_amount") or 0.0) for b in bills)
    collected = sum(float(b.get("total_amount") or 0.0) for b in bills if b.get("payment_status") == "paid")
    total_units = sum(float(b.get("units_consumed") or 0.0) for b in bills)
    
    return {
        "total_bills": total_bills,
        "paid": paid,
        "pending": pending,
        "total_amount": round(total_amount, 2),
        "collected": round(collected, 2),
        "outstanding": round(total_amount - collected, 2),
        "total_units": round(total_units, 2),
        "month": m,
        "year": y
    }

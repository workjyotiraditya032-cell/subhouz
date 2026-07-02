from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId
from database import get_db
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/electricity", tags=["electricity"])

def parse_oid(v):
    try: return ObjectId(v)
    except: raise HTTPException(status_code=404, detail="Not found")

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
    query = {}
    if user["role"] == "hostel_admin":
        query["hostel_id"] = user.get("hostel_id")
    elif hostel_id:
        query["hostel_id"] = hostel_id
    if month: query["billing_month"] = month
    if year: query["billing_year"] = year
    if status: query["payment_status"] = status

    bills = await db.electricity_bills.find(query).sort([("billing_year", -1), ("billing_month", -1)]).to_list(1000)
    for b in bills:
        b["_id"] = str(b["_id"])
        b["id"] = b["_id"]
        for k in ("created_at", "updated_at", "payment_date"):
            if b.get(k) and hasattr(b[k], 'isoformat'):
                b[k] = b[k].isoformat()
    return bills

@router.post("/bills")
async def create_bill(req: BillCreate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    if user["role"] == "hostel_admin" and user.get("hostel_id") != req.hostel_id:
        raise HTTPException(status_code=403, detail="Access denied")

    units = max(0, req.current_reading - req.previous_reading)
    total = round(units * req.rate_per_unit + req.additional_charges, 2)

    # Get resident and room info if not provided
    resident_name = req.resident_name
    room_number = req.room_number
    if not resident_name:
        resident = await db.residents.find_one({"_id": parse_oid(req.resident_id)})
        if resident:
            resident_name = resident.get("name", "")
            room_number = resident.get("room_number", "")

    doc = {
        "resident_id": req.resident_id,
        "hostel_id": req.hostel_id,
        "room_id": req.room_id,
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
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.electricity_bills.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["id"] = doc["_id"]
    return doc

@router.put("/bills/{bill_id}")
async def update_bill(bill_id: str, req: BillUpdate, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    updates = {k: v for k, v in req.model_dump().items() if v is not None}

    bill = await db.electricity_bills.find_one({"_id": parse_oid(bill_id)})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    # Recalculate if reading changed
    if "current_reading" in updates:
        prev = bill.get("previous_reading", 0)
        units = max(0, updates["current_reading"] - prev)
        rate = updates.get("rate_per_unit", bill.get("rate_per_unit", 8.0))
        add = updates.get("additional_charges", bill.get("additional_charges", 0))
        updates["units_consumed"] = units
        updates["total_amount"] = round(units * rate + add, 2)

    updates["updated_at"] = datetime.now(timezone.utc)
    await db.electricity_bills.update_one({"_id": parse_oid(bill_id)}, {"$set": updates})
    bill = await db.electricity_bills.find_one({"_id": parse_oid(bill_id)})
    bill["_id"] = str(bill["_id"])
    bill["id"] = bill["_id"]
    return bill

@router.post("/bills/{bill_id}/mark-paid")
async def mark_bill_paid(bill_id: str, request: Request):
    db = get_db()
    user = await get_current_user(request, db)
    now = datetime.now(timezone.utc)
    result = await db.electricity_bills.update_one(
        {"_id": parse_oid(bill_id)},
        {"$set": {"payment_status": "paid", "payment_date": now, "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bill not found")
    return {"message": "Bill marked as paid"}

@router.post("/generate-monthly")
async def generate_monthly_bills(request: Request, month: int = Query(...), year: int = Query(...)):
    db = get_db()
    user = await get_current_user(request, db)

    hostel_query = {}
    if user["role"] == "hostel_admin":
        hostel_query["hostel_id"] = user.get("hostel_id")

    residents = await db.residents.find({**hostel_query, "status": "active"}).to_list(1000)
    generated = 0

    for r in residents:
        r_id = str(r["_id"])
        # Check if bill already exists
        existing = await db.electricity_bills.find_one({"resident_id": r_id, "billing_month": month, "billing_year": year})
        if existing:
            continue

        # Get previous reading from last bill
        last_bill = await db.electricity_bills.find_one(
            {"resident_id": r_id},
            sort=[("billing_year", -1), ("billing_month", -1)]
        )
        prev_reading = last_bill["current_reading"] if last_bill else 0

        # Get rate from room
        rate = 8.0
        if r.get("room_id"):
            room = await db.rooms.find_one({"_id": ObjectId(r["room_id"])})
            if room:
                rate = room.get("electricity_rate", 8.0)

        doc = {
            "resident_id": r_id,
            "hostel_id": r.get("hostel_id"),
            "room_id": r.get("room_id"),
            "room_number": r.get("room_number", ""),
            "resident_name": r.get("name", ""),
            "previous_reading": prev_reading,
            "current_reading": prev_reading,  # Admin fills this in
            "units_consumed": 0,
            "rate_per_unit": rate,
            "additional_charges": 0,
            "total_amount": 0,
            "billing_month": month,
            "billing_year": year,
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.electricity_bills.insert_one(doc)
        generated += 1

    return {"message": f"Generated {generated} electricity bills for {month}/{year}", "count": generated}

@router.get("/stats")
async def electricity_stats(request: Request, month: Optional[int] = Query(None), year: Optional[int] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year

    query = {"billing_month": m, "billing_year": y}
    if user["role"] == "hostel_admin":
        query["hostel_id"] = user.get("hostel_id")

    bills = await db.electricity_bills.find(query).to_list(1000)
    total_bills = len(bills)
    paid = sum(1 for b in bills if b.get("payment_status") == "paid")
    pending = total_bills - paid
    total_amount = sum(b.get("total_amount", 0) for b in bills)
    collected = sum(b.get("total_amount", 0) for b in bills if b.get("payment_status") == "paid")
    total_units = sum(b.get("units_consumed", 0) for b in bills)

    return {
        "total_bills": total_bills, "paid": paid, "pending": pending,
        "total_amount": round(total_amount, 2), "collected": round(collected, 2),
        "outstanding": round(total_amount - collected, 2), "total_units": round(total_units, 2),
        "month": m, "year": y
    }

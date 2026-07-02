from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_dashboard_stats(request: Request, hostel_id: Optional[str] = Query(None)):
    db = get_db()
    user = await get_current_user(request, db)
    
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year
    
    # Build query based on role
    hostel_query = {}
    if user["role"] == "hostel_admin":
        hostel_query["hostel_id"] = user.get("hostel_id")
    elif hostel_id:
        hostel_query["hostel_id"] = hostel_id
    
    # Core stats
    if user["role"] == "super_admin" and not hostel_id:
        total_hostels = await db.hostels.count_documents({})
    else:
        total_hostels = 1
    
    total_rooms = await db.rooms.count_documents(hostel_query)
    total_beds = await db.beds.count_documents(hostel_query)
    occupied_beds = await db.beds.count_documents({**hostel_query, "status": "occupied"})
    available_beds = total_beds - occupied_beds
    occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0
    
    total_residents = await db.residents.count_documents({**hostel_query, "status": "active"})
    
    # Rent stats for current month
    rent_query = {"month": current_month, "year": current_year}
    if hostel_query:
        rent_query.update(hostel_query)
    
    paid_count = await db.rent_payments.count_documents({**rent_query, "status": "paid"})
    pending_residents = total_residents - paid_count
    
    # Calculate revenue
    paid_payments = await db.rent_payments.find({**rent_query, "status": "paid"}).to_list(1000)
    monthly_revenue = sum(p.get("amount", 0) for p in paid_payments)
    
    # Expected revenue
    residents = await db.residents.find({**hostel_query, "status": "active"}).to_list(1000)
    expected_revenue = sum(r.get("monthly_rent", 0) for r in residents)
    
    # Today's collections
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    today_payments = await db.rent_payments.find({
        **rent_query, "status": "paid", "paid_on": {"$gte": today_start}
    }).to_list(100)
    today_collection = sum(p.get("amount", 0) for p in today_payments)
    
    # Recent activity
    activity_query = {}
    if hostel_query.get("hostel_id"):
        activity_query["hostel_id"] = hostel_query["hostel_id"]
    recent_activities = await db.activity_logs.find(activity_query).sort("timestamp", -1).to_list(10)
    for a in recent_activities:
        a["_id"] = str(a["_id"])
        a["id"] = a["_id"]
        if a.get("timestamp") and hasattr(a["timestamp"], 'isoformat'):
            a["timestamp"] = a["timestamp"].isoformat()
    
    # Monthly revenue chart (last 6 months)
    revenue_chart = []
    for i in range(5, -1, -1):
        m = current_month - i
        y = current_year
        if m <= 0:
            m += 12
            y -= 1
        month_payments = await db.rent_payments.find({"month": m, "year": y, "status": "paid", **hostel_query}).to_list(1000)
        revenue_chart.append({
            "month": f"{y}-{m:02d}",
            "month_name": datetime(y, m, 1).strftime("%b"),
            "revenue": sum(p.get("amount", 0) for p in month_payments),
            "count": len(month_payments)
        })
    
    # Enquiries
    enquiry_query = {}
    if hostel_query.get("hostel_id"):
        enquiry_query["hostel_id"] = hostel_query["hostel_id"]
    total_enquiries = await db.enquiries.count_documents(enquiry_query)
    new_enquiries = await db.enquiries.count_documents({**enquiry_query, "status": "new"})
    
    # Per-hostel breakdown for super admin
    hostel_breakdown = []
    if user["role"] == "super_admin" and not hostel_id:
        hostels = await db.hostels.find().to_list(100)
        for h in hostels:
            h_id = str(h["_id"])
            h_beds = await db.beds.count_documents({"hostel_id": h_id})
            h_occ = await db.beds.count_documents({"hostel_id": h_id, "status": "occupied"})
            h_residents = await db.residents.count_documents({"hostel_id": h_id, "status": "active"})
            h_paid = await db.rent_payments.find({"hostel_id": h_id, "month": current_month, "year": current_year, "status": "paid"}).to_list(1000)
            h_revenue = sum(p.get("amount", 0) for p in h_paid)
            hostel_breakdown.append({
                "id": h_id,
                "name": h.get("name"),
                "code": h.get("code"),
                "total_beds": h_beds,
                "occupied_beds": h_occ,
                "occupancy_rate": round((h_occ / h_beds * 100), 1) if h_beds > 0 else 0,
                "total_residents": h_residents,
                "monthly_revenue": h_revenue,
                "pending_rent": h_residents - len(h_paid)
            })
    
    return {
        "total_hostels": total_hostels,
        "total_rooms": total_rooms,
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "available_beds": available_beds,
        "occupancy_rate": occupancy_rate,
        "total_residents": total_residents,
        "paid_this_month": paid_count,
        "pending_this_month": pending_residents,
        "monthly_revenue": monthly_revenue,
        "expected_revenue": expected_revenue,
        "today_collection": today_collection,
        "collection_rate": round((monthly_revenue / expected_revenue * 100), 1) if expected_revenue > 0 else 0,
        "total_enquiries": total_enquiries,
        "new_enquiries": new_enquiries,
        "revenue_chart": revenue_chart,
        "recent_activities": recent_activities,
        "hostel_breakdown": hostel_breakdown,
        "current_month": current_month,
        "current_year": current_year
    }

@router.get("/activity-logs")
async def get_activity_logs(request: Request, hostel_id: Optional[str] = Query(None), limit: int = Query(50)):
    db = get_db()
    user = await get_current_user(request, db)
    query = {}
    if user["role"] == "hostel_admin":
        query["hostel_id"] = user.get("hostel_id")
    elif hostel_id:
        query["hostel_id"] = hostel_id
    
    logs = await db.activity_logs.find(query).sort("timestamp", -1).to_list(limit)
    for l in logs:
        l["_id"] = str(l["_id"])
        l["id"] = l["_id"]
        if l.get("timestamp") and hasattr(l["timestamp"], 'isoformat'):
            l["timestamp"] = l["timestamp"].isoformat()
    return logs

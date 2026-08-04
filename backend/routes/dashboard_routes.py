from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
import asyncio
from database import get_db, parse_uuid
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
        res_h_cnt = await db.table("hostels").select("id", count="exact").execute()
        total_hostels = res_h_cnt.count or 0
    else:
        h_id_to_check = user.get("hostel_id") if user["role"] == "hostel_admin" else hostel_id
        if h_id_to_check:
            try:
                res_h_cnt = await db.table("hostels").select("id", count="exact").eq("id", parse_uuid(h_id_to_check)).execute()
                total_hostels = res_h_cnt.count or 0
            except:
                total_hostels = 0
        else:
            total_hostels = 0
            
    # Rooms count
    q_rooms = db.table("rooms").select("id", count="exact")
    if hostel_query.get("hostel_id"):
        q_rooms = q_rooms.eq("hostel_id", parse_uuid(hostel_query["hostel_id"]))
    res_rooms = await q_rooms.execute()
    total_rooms = res_rooms.count or 0
    
    # Beds count
    q_beds = db.table("beds").select("id", count="exact")
    if hostel_query.get("hostel_id"):
        q_beds = q_beds.eq("hostel_id", parse_uuid(hostel_query["hostel_id"]))
    res_beds = await q_beds.execute()
    total_beds = res_beds.count or 0
    
    # Occupied beds count
    q_occ_beds = db.table("beds").select("id", count="exact").eq("status", "occupied")
    if hostel_query.get("hostel_id"):
        q_occ_beds = q_occ_beds.eq("hostel_id", parse_uuid(hostel_query["hostel_id"]))
    res_occ_beds = await q_occ_beds.execute()
    occupied_beds = res_occ_beds.count or 0
    
    available_beds = total_beds - occupied_beds
    occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0
    
    # Active residents
    q_residents = db.table("residents").select("id", count="exact").eq("status", "active")
    if hostel_query.get("hostel_id"):
        q_residents = q_residents.eq("hostel_id", parse_uuid(hostel_query["hostel_id"]))
    res_residents = await q_residents.execute()
    total_residents = res_residents.count or 0
    
    # Rent stats for current month
    q_paid_cnt = db.table("rent_payments").select("id", count="exact").eq("month", current_month).eq("year", current_year).eq("status", "paid")
    if hostel_query.get("hostel_id"):
        q_paid_cnt = q_paid_cnt.eq("hostel_id", parse_uuid(hostel_query["hostel_id"]))
    res_paid_cnt = await q_paid_cnt.execute()
    paid_count = res_paid_cnt.count or 0
    
    pending_residents = total_residents - paid_count
    
    # Calculate revenue
    q_paid_payments = db.table("rent_payments").select("*").eq("month", current_month).eq("year", current_year).eq("status", "paid")
    if hostel_query.get("hostel_id"):
        q_paid_payments = q_paid_payments.eq("hostel_id", parse_uuid(hostel_query["hostel_id"]))
    res_paid_payments = await q_paid_payments.execute()
    paid_payments = res_paid_payments.data
    monthly_revenue = sum(p.get("amount", 0) for p in paid_payments)
    
    # Expected revenue
    q_act_res = db.table("residents").select("*").eq("status", "active")
    if hostel_query.get("hostel_id"):
        q_act_res = q_act_res.eq("hostel_id", parse_uuid(hostel_query["hostel_id"]))
    res_act_res = await q_act_res.execute()
    residents = res_act_res.data
    expected_revenue = sum(r.get("monthly_rent", 0) for r in residents)
    
    # Today's collections
    today_date_str = now.strftime("%Y-%m-%d")
    q_today = db.table("rent_payments").select("*").eq("status", "paid")
    if hostel_query.get("hostel_id"):
        q_today = q_today.eq("hostel_id", parse_uuid(hostel_query["hostel_id"]))
    res_today = await q_today.execute()
    all_paid_payments = res_today.data or []
    
    today_payments = [
        p for p in all_paid_payments
        if p.get("paid_on") and (str(p.get("paid_on"))[:10] == today_date_str)
    ]
    today_collection = sum(float(p.get("amount", 0)) for p in today_payments)
    
    # Recent activity
    q_act = db.table("activity_logs").select("*")
    if hostel_query.get("hostel_id"):
        q_act = q_act.eq("hostel_id", parse_uuid(hostel_query["hostel_id"]))
    q_act = q_act.order("timestamp", desc=True).limit(10)
    res_act = await q_act.execute()
    recent_activities = res_act.data
    
    for a in recent_activities:
        a["_id"] = str(a["id"])
        a["id"] = a["_id"]
        if a.get("timestamp"):
            a["timestamp"] = str(a["timestamp"])
            
    # Monthly revenue chart (last 6 months) - Run queries in parallel
    revenue_chart = []
    chart_tasks = []
    months_info = []
    for i in range(5, -1, -1):
        m = current_month - i
        y = current_year
        if m <= 0:
            m += 12
            y -= 1
            
        q_m = db.table("rent_payments").select("*").eq("month", m).eq("year", y).eq("status", "paid")
        if hostel_query.get("hostel_id"):
            q_m = q_m.eq("hostel_id", parse_uuid(hostel_query["hostel_id"]))
        chart_tasks.append(q_m.execute())
        months_info.append((y, m))
        
    chart_results = await asyncio.gather(*chart_tasks)
    for idx, res_m in enumerate(chart_results):
        y, m = months_info[idx]
        month_payments = res_m.data
        revenue_chart.append({
            "month": f"{y}-{m:02d}",
            "month_name": datetime(y, m, 1).strftime("%b"),
            "revenue": sum(p.get("amount", 0) for p in month_payments),
            "count": len(month_payments)
        })
        
    # Enquiries
    q_enq = db.table("enquiries").select("id", count="exact")
    if hostel_query.get("hostel_id"):
        q_enq = q_enq.eq("hostel_id", parse_uuid(hostel_query["hostel_id"]))
    res_enq = await q_enq.execute()
    total_enquiries = res_enq.count or 0
    
    q_new_enq = db.table("enquiries").select("id", count="exact").eq("status", "new")
    if hostel_query.get("hostel_id"):
        q_new_enq = q_new_enq.eq("hostel_id", parse_uuid(hostel_query["hostel_id"]))
    res_new_enq = await q_new_enq.execute()
    new_enquiries = res_new_enq.count or 0
    
    # Per-hostel breakdown for super admin - Run queries in parallel
    hostel_breakdown = []
    if user["role"] == "super_admin" and not hostel_id:
        res_hostels = await db.table("hostels").select("*").execute()
        hostels = res_hostels.data
        
        breakdown_tasks = []
        for h in hostels:
            h_uuid = parse_uuid(str(h["id"]))
            # 1. Total beds
            breakdown_tasks.append(db.table("beds").select("id", count="exact").eq("hostel_id", h_uuid).execute())
            # 2. Occupied beds
            breakdown_tasks.append(db.table("beds").select("id", count="exact").eq("hostel_id", h_uuid).eq("status", "occupied").execute())
            # 3. Active residents
            breakdown_tasks.append(db.table("residents").select("id", count="exact").eq("hostel_id", h_uuid).eq("status", "active").execute())
            # 4. Paid rent payments
            breakdown_tasks.append(db.table("rent_payments").select("*").eq("hostel_id", h_uuid).eq("month", current_month).eq("year", current_year).eq("status", "paid").execute())
            
        if breakdown_tasks:
            breakdown_results = await asyncio.gather(*breakdown_tasks)
            for idx, h in enumerate(hostels):
                h_id = str(h["id"])
                
                res_hb = breakdown_results[idx * 4]
                res_ho = breakdown_results[idx * 4 + 1]
                res_hr = breakdown_results[idx * 4 + 2]
                res_hp = breakdown_results[idx * 4 + 3]
                
                h_beds = res_hb.count or 0
                h_occ = res_ho.count or 0
                h_residents = res_hr.count or 0
                h_paid = res_hp.data
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
    
    q = db.table("activity_logs").select("*")
    if user["role"] == "hostel_admin":
        q = q.eq("hostel_id", parse_uuid(user.get("hostel_id")))
    elif hostel_id:
        q = q.eq("hostel_id", parse_uuid(hostel_id))
        
    q = q.order("timestamp", desc=True).limit(limit)
    res_logs = await q.execute()
    logs = res_logs.data
    
    for l in logs:
        l["_id"] = str(l["id"])
        l["id"] = l["_id"]
        if l.get("timestamp"):
            l["timestamp"] = str(l["timestamp"])
    return logs

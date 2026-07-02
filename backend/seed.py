"""Seed data for 3 hostels in Bhubaneswar with sample rooms, beds, and residents."""
from datetime import datetime, timezone, timedelta
from auth import hash_password
import random

MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

async def seed_database(db):
    """Seed database with initial data."""
    
    # Check if already seeded
    hostel_count = await db.hostels.count_documents({})
    if hostel_count > 0:
        return False
    
    now = datetime.now(timezone.utc)
    
    # Create 3 hostels
    hostels = [
        {
            "name": "Jogmaya Hostel",
            "code": "JMH",
            "address": "Sitaram Nagar, Panda Kudia, Plot No- 729, near Saraswati Sishu Mandir, Shampur",
            "city": "Bhubaneswar",
            "state": "Odisha",
            "phone": "+91 9876543210",
            "email": "jogmaya@subhouz.com",
            "description": "Premium boys hostel near Shampur with modern amenities, 24/7 security, and home-cooked meals.",
            "hostel_type": "boys",
            "monthly_due_date": 5,
            "reminder_grace_days": 3,
            "follow_up_days": 7,
            "images": [],
            "created_at": now,
            "updated_at": now
        },
        {
            "name": "Homely Havens Girls PG",
            "code": "HHG",
            "address": "Cluster 3, Plot no- 1587, Sikharchandi Vihar, Patia",
            "city": "Bhubaneswar",
            "state": "Odisha",
            "phone": "+91 9876543211",
            "email": "homelyhavens@subhouz.com",
            "description": "Safe and comfortable girls PG in Patia with Wi-Fi, AC rooms, and vegetarian kitchen.",
            "hostel_type": "girls",
            "monthly_due_date": 5,
            "reminder_grace_days": 3,
            "follow_up_days": 7,
            "images": [],
            "created_at": now,
            "updated_at": now
        },
        {
            "name": "GopalSarojini (GS) Residency",
            "code": "GSR",
            "address": "Ranganath Temple, Rangamatia, Tala Sahi, Rangamatia, Mancheswar",
            "city": "Bhubaneswar",
            "state": "Odisha",
            "phone": "+91 9876543212",
            "email": "gsresidency@subhouz.com",
            "description": "Modern co-ed residency in Mancheswar with spacious rooms, parking, and study areas.",
            "hostel_type": "mixed",
            "monthly_due_date": 5,
            "reminder_grace_days": 3,
            "follow_up_days": 7,
            "images": [],
            "created_at": now,
            "updated_at": now
        }
    ]
    
    hostel_ids = []
    for h in hostels:
        result = await db.hostels.insert_one(h)
        hostel_ids.append(str(result.inserted_id))
    
    # Room configs per hostel
    room_configs = [
        # Jogmaya: 8 rooms, 2-4 beds each
        [
            {"room_number": "101", "floor": 1, "type": "bachelor", "ac": "non_ac", "capacity": 3, "rent": 4500, "bathroom": True, "balcony": False},
            {"room_number": "102", "floor": 1, "type": "bachelor", "ac": "non_ac", "capacity": 3, "rent": 4500, "bathroom": True, "balcony": False},
            {"room_number": "103", "floor": 1, "type": "bachelor", "ac": "ac", "capacity": 2, "rent": 6000, "bathroom": True, "balcony": True},
            {"room_number": "201", "floor": 2, "type": "bachelor", "ac": "non_ac", "capacity": 4, "rent": 4000, "bathroom": True, "balcony": False},
            {"room_number": "202", "floor": 2, "type": "bachelor", "ac": "non_ac", "capacity": 3, "rent": 4500, "bathroom": True, "balcony": False},
            {"room_number": "203", "floor": 2, "type": "bachelor", "ac": "ac", "capacity": 2, "rent": 6500, "bathroom": True, "balcony": True},
            {"room_number": "301", "floor": 3, "type": "bachelor", "ac": "non_ac", "capacity": 4, "rent": 4000, "bathroom": True, "balcony": False},
            {"room_number": "302", "floor": 3, "type": "bachelor", "ac": "ac", "capacity": 2, "rent": 7000, "bathroom": True, "balcony": True},
        ],
        # Homely Havens: 6 rooms
        [
            {"room_number": "G1", "floor": 0, "type": "bachelor", "ac": "ac", "capacity": 2, "rent": 7500, "bathroom": True, "balcony": False},
            {"room_number": "G2", "floor": 0, "type": "bachelor", "ac": "non_ac", "capacity": 3, "rent": 5000, "bathroom": True, "balcony": False},
            {"room_number": "F1", "floor": 1, "type": "bachelor", "ac": "ac", "capacity": 2, "rent": 7500, "bathroom": True, "balcony": True},
            {"room_number": "F2", "floor": 1, "type": "bachelor", "ac": "non_ac", "capacity": 3, "rent": 5000, "bathroom": True, "balcony": False},
            {"room_number": "S1", "floor": 2, "type": "bachelor", "ac": "ac", "capacity": 2, "rent": 8000, "bathroom": True, "balcony": True},
            {"room_number": "S2", "floor": 2, "type": "bachelor", "ac": "non_ac", "capacity": 3, "rent": 5500, "bathroom": True, "balcony": False},
        ],
        # GS Residency: 7 rooms
        [
            {"room_number": "A1", "floor": 0, "type": "bachelor", "ac": "non_ac", "capacity": 3, "rent": 4000, "bathroom": True, "balcony": False},
            {"room_number": "A2", "floor": 0, "type": "bachelor", "ac": "ac", "capacity": 2, "rent": 5500, "bathroom": True, "balcony": False},
            {"room_number": "B1", "floor": 1, "type": "bachelor", "ac": "non_ac", "capacity": 4, "rent": 3500, "bathroom": True, "balcony": False},
            {"room_number": "B2", "floor": 1, "type": "bachelor", "ac": "ac", "capacity": 2, "rent": 6000, "bathroom": True, "balcony": True},
            {"room_number": "C1", "floor": 2, "type": "family", "ac": "ac", "capacity": 2, "rent": 9000, "bathroom": True, "balcony": True},
            {"room_number": "C2", "floor": 2, "type": "bachelor", "ac": "non_ac", "capacity": 3, "rent": 4500, "bathroom": True, "balcony": False},
            {"room_number": "C3", "floor": 2, "type": "bachelor", "ac": "non_ac", "capacity": 3, "rent": 4500, "bathroom": True, "balcony": False},
        ]
    ]
    
    # Indian names for residents
    male_names = [
        "Amit Kumar", "Rajesh Patel", "Suresh Mohanty", "Deepak Nayak", "Manish Sahu",
        "Pradeep Behera", "Rahul Mishra", "Vikram Singh", "Arun Dash", "Sanjay Jena",
        "Prakash Sahoo", "Ravi Maharana", "Gaurav Panda", "Nitin Swain", "Ashish Rout",
        "Bibhu Pradhan", "Chandan Das", "Dilip Parida", "Girish Mohapatra", "Hemant Barik",
        "Jagdish Satpathy", "Kiran Senapati", "Laxman Tripathy", "Manas Patra", "Naresh Lenka"
    ]
    female_names = [
        "Priya Sharma", "Anita Das", "Sunita Rath", "Deepa Panda", "Mamata Behera",
        "Sonia Mishra", "Ritu Singh", "Kavita Nayak", "Lata Sahoo", "Meena Swain",
        "Neha Mohanty", "Pooja Sahu", "Rekha Jena", "Shanti Parida", "Uma Dash"
    ]
    
    all_room_ids = []
    all_bed_ids = []
    all_resident_ids = []
    
    for h_idx, hostel_id in enumerate(hostel_ids):
        rooms = room_configs[h_idx]
        hostel_room_ids = []
        hostel_bed_ids = []
        
        for room_cfg in rooms:
            room_doc = {
                "hostel_id": hostel_id,
                "building_name": "Main Building",
                "floor_number": room_cfg["floor"],
                "room_number": room_cfg["room_number"],
                "room_type": room_cfg["type"],
                "ac_type": room_cfg["ac"],
                "capacity": room_cfg["capacity"],
                "rent": room_cfg["rent"],
                "electricity_rate": 8.0,
                "has_bathroom": room_cfg["bathroom"],
                "has_balcony": room_cfg["balcony"],
                "status": "available",
                "occupied": 0,
                "amenities": ["Wi-Fi", "Water Purifier"],
                "created_at": now
            }
            result = await db.rooms.insert_one(room_doc)
            room_id = str(result.inserted_id)
            hostel_room_ids.append({"id": room_id, "number": room_cfg["room_number"], "rent": room_cfg["rent"], "capacity": room_cfg["capacity"]})
            
            # Create beds
            room_beds = []
            for b in range(1, room_cfg["capacity"] + 1):
                bed_doc = {
                    "hostel_id": hostel_id,
                    "room_id": room_id,
                    "bed_number": f"B{b}",
                    "status": "available",
                    "resident_id": None,
                    "monthly_rent": room_cfg["rent"],
                    "created_at": now
                }
                bed_result = await db.beds.insert_one(bed_doc)
                room_beds.append({"id": str(bed_result.inserted_id), "number": f"B{b}", "room_id": room_id, "room_number": room_cfg["room_number"], "rent": room_cfg["rent"]})
            hostel_bed_ids.extend(room_beds)
        
        all_room_ids.append(hostel_room_ids)
        all_bed_ids.append(hostel_bed_ids)
        
        # Create residents - fill about 70% of beds
        names = female_names if h_idx == 1 else male_names
        gender = "female" if h_idx == 1 else "male"
        available_beds = [b for b in hostel_bed_ids]
        random.shuffle(available_beds)
        num_residents = int(len(available_beds) * 0.7)
        
        for r_idx in range(min(num_residents, len(names))):
            bed = available_beds[r_idx]
            phone = f"+91 98{random.randint(10000000, 99999999)}"
            resident_doc = {
                "hostel_id": hostel_id,
                "room_id": bed["room_id"],
                "bed_id": bed["id"],
                "room_number": bed["room_number"],
                "bed_number": bed["number"],
                "name": names[r_idx],
                "phone": phone,
                "whatsapp": phone,
                "email": f"{names[r_idx].lower().replace(' ', '.')}@gmail.com",
                "gender": gender,
                "occupation": random.choice(["Student", "Software Engineer", "Teacher", "Business", "Government Employee"]),
                "workplace": random.choice(["KIIT University", "Infosys BPO", "TCS Patia", "SOA University", "Wipro"]),
                "guardian_name": f"Mr. {names[r_idx].split()[-1]}",
                "guardian_phone": f"+91 97{random.randint(10000000, 99999999)}",
                "guardian_relation": "Father",
                "permanent_address": random.choice(["Cuttack, Odisha", "Puri, Odisha", "Sambalpur, Odisha", "Berhampur, Odisha", "Rourkela, Odisha"]),
                "id_type": "Aadhaar",
                "id_number": f"{random.randint(1000, 9999)} {random.randint(1000, 9999)} {random.randint(1000, 9999)}",
                "monthly_rent": bed["rent"],
                "security_deposit": bed["rent"] * 2,
                "check_in_date": (now - timedelta(days=random.randint(30, 365))).isoformat(),
                "agreement_start": (now - timedelta(days=random.randint(30, 365))).isoformat(),
                "agreement_end": (now + timedelta(days=random.randint(180, 365))).isoformat(),
                "status": "active",
                "created_at": now,
                "updated_at": now
            }
            result = await db.residents.insert_one(resident_doc)
            resident_id = str(result.inserted_id)
            all_resident_ids.append({"id": resident_id, "hostel_id": hostel_id, "name": names[r_idx], "rent": bed["rent"], "room": bed["room_number"], "bed": bed["number"]})
            
            # Mark bed as occupied
            await db.beds.update_one({"_id": bed_result.inserted_id}, {"$set": {"status": "occupied", "resident_id": resident_id}})
            # Actually need to use the correct bed id
            from bson import ObjectId as ObjId
            await db.beds.update_one({"_id": ObjId(bed["id"])}, {"$set": {"status": "occupied", "resident_id": resident_id}})
    
    # Create sample payment records for last 3 months
    for resident in all_resident_ids:
        for months_ago in range(3):
            month = now.month - months_ago
            year = now.year
            if month <= 0:
                month += 12
                year -= 1
            
            is_paid = random.random() < 0.75  # 75% paid
            if months_ago == 0:
                is_paid = random.random() < 0.5  # Current month 50% paid
            
            receipt_num = None
            paid_on = None
            if is_paid:
                paid_on = datetime(year, month, random.randint(1, min(28, now.day if months_ago == 0 else 28)), tzinfo=timezone.utc)
                seq = random.randint(1, 999)
                receipt_num = f"SH-{year}{month:02d}-{seq:04d}"
            
            payment_doc = {
                "resident_id": resident["id"],
                "hostel_id": resident["hostel_id"],
                "resident_name": resident["name"],
                "room_number": resident["room"],
                "bed_number": resident["bed"],
                "month": month,
                "year": year,
                "amount": resident["rent"],
                "status": "paid" if is_paid else ("overdue" if months_ago > 0 else "pending"),
                "paid_on": paid_on,
                "payment_mode": random.choice(["cash", "upi", "bank"]) if is_paid else None,
                "receipt_number": receipt_num,
                "created_at": now,
                "updated_at": now
            }
            await db.rent_payments.insert_one(payment_doc)
    
    # Create hostel admin accounts
    admin_configs = [
        {"email": "jogmaya.admin@subhouz.com", "name": "Jogmaya Admin", "hostel_id": hostel_ids[0]},
        {"email": "homely.admin@subhouz.com", "name": "Homely Havens Admin", "hostel_id": hostel_ids[1]},
        {"email": "gs.admin@subhouz.com", "name": "GS Residency Admin", "hostel_id": hostel_ids[2]},
    ]
    for admin in admin_configs:
        await db.users.insert_one({
            "email": admin["email"],
            "password_hash": hash_password("hostel@123"),
            "name": admin["name"],
            "role": "hostel_admin",
            "hostel_id": admin["hostel_id"],
            "created_at": now,
            "updated_at": now
        })
    
    # Create automation workflows
    workflows = [
        {
            "name": "Rent Paid - Send WhatsApp Challan",
            "description": "When rent is marked as paid, auto-generate a challan/receipt and send it via WhatsApp to the resident.",
            "trigger_type": "rent_paid",
            "actions": ["generate_challan", "send_whatsapp_challan"],
            "enabled": True,
            "config": {"template": "rent_challan", "include_receipt": True},
            "run_count": 0,
            "created_at": now
        },
        {
            "name": "Due Date - Send Rent Reminder",
            "description": "On the stipulated due date, check for unpaid residents and send a WhatsApp reminder.",
            "trigger_type": "due_date",
            "actions": ["check_unpaid", "send_whatsapp_reminder"],
            "enabled": True,
            "config": {"reminder_message": "Dear {name}, your rent of ₹{amount} for {month} is due. Please pay at the earliest."},
            "run_count": 0,
            "created_at": now
        },
        {
            "name": "Follow-up Reminder",
            "description": "If still unpaid after grace period, send a follow-up WhatsApp reminder.",
            "trigger_type": "follow_up",
            "actions": ["check_still_unpaid", "send_whatsapp_followup"],
            "enabled": True,
            "config": {"followup_message": "Dear {name}, this is a reminder that your rent of ₹{amount} is overdue. Please clear the payment immediately."},
            "run_count": 0,
            "created_at": now
        },
        {
            "name": "New Enquiry Notification",
            "description": "Notify admin when a new admission enquiry is received.",
            "trigger_type": "new_enquiry",
            "actions": ["notify_admin"],
            "enabled": True,
            "config": {},
            "run_count": 0,
            "created_at": now
        },
        {
            "name": "Daily Summary Report",
            "description": "Send a daily summary of collections, pending rents, and occupancy to admin.",
            "trigger_type": "daily_summary",
            "actions": ["generate_summary", "send_whatsapp_summary"],
            "enabled": False,
            "config": {"send_time": "09:00"},
            "run_count": 0,
            "created_at": now
        },
        {
            "name": "Agreement Expiry Alert",
            "description": "Alert admin 30 days before a resident's agreement expires.",
            "trigger_type": "agreement_expiry",
            "actions": ["check_expiring", "notify_admin"],
            "enabled": False,
            "config": {"days_before": 30},
            "run_count": 0,
            "created_at": now
        },
        {
            "name": "Vacancy Alert",
            "description": "Notify when occupancy drops below threshold.",
            "trigger_type": "vacancy_alert",
            "actions": ["check_occupancy", "notify_admin"],
            "enabled": False,
            "config": {"threshold_percent": 80},
            "run_count": 0,
            "created_at": now
        },
        {
            "name": "Monthly Revenue Report",
            "description": "Generate and send monthly revenue report on the 1st of each month.",
            "trigger_type": "monthly_report",
            "actions": ["generate_report", "send_report"],
            "enabled": False,
            "config": {"send_day": 1},
            "run_count": 0,
            "created_at": now
        }
    ]
    for w in workflows:
        await db.automation_workflows.insert_one(w)
    
    # Create sample enquiries
    enquiries = [
        {"name": "Rohit Meher", "phone": "+91 9812345678", "email": "rohit.m@gmail.com", "occupation": "Student", "preferred_hostel": "Jogmaya Hostel", "hostel_type": "bachelor", "budget": 5000, "move_in_date": "2026-03-01", "message": "Looking for a shared room near KIIT.", "status": "new", "hostel_id": hostel_ids[0], "created_at": now},
        {"name": "Sneha Pattnaik", "phone": "+91 9812345679", "email": "sneha.p@gmail.com", "occupation": "Working Professional", "preferred_hostel": "Homely Havens", "hostel_type": "bachelor", "budget": 7000, "move_in_date": "2026-03-15", "message": "Need AC room with attached bathroom.", "status": "contacted", "hostel_id": hostel_ids[1], "created_at": now},
        {"name": "Alok Panda", "phone": "+91 9812345680", "email": "alok.p@gmail.com", "occupation": "Student", "preferred_hostel": "GS Residency", "hostel_type": "bachelor", "budget": 4000, "move_in_date": "2026-04-01", "message": "Need affordable room near Mancheswar.", "status": "new", "hostel_id": hostel_ids[2], "created_at": now},
    ]
    for e in enquiries:
        await db.enquiries.insert_one(e)
    
    return True

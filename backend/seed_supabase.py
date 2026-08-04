import os
import asyncio
from dotenv import load_dotenv
from database import init_db, get_db
from auth import hash_password

load_dotenv()

async def seed():
    await init_db()
    db = get_db()
    
    print("Clearing tables...")
    # Clear existing records (since cascade is configured, deleting hostels will clean rooms, beds, residents, rent_payments, activity_logs, enquiries, etc.)
    await db.table("hostels").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    await db.table("users").delete().neq("role", "super_admin").execute()
    await db.table("automations").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    await db.table("enquiries").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    await db.table("electricity_bills").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    await db.table("website_images").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    await db.table("password_reset_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    
    print("Seeding hostels...")
    hostels_data = [
        {
            "name": "Apex Elite Co-Living",
            "code": "AEC",
            "address": "12th Main Rd, Koramangala",
            "city": "Bengaluru",
            "state": "Karnataka",
            "hostel_type": "mixed",
            "average_rating": 4.8,
            "review_count": 14,
            "monthly_due_date": 5,
            "reminder_grace_days": 3,
            "follow_up_days": 7
        },
        {
            "name": "Homely Havens Girls PG",
            "code": "HHG",
            "address": "Phase 2, Hitech City",
            "city": "Hyderabad",
            "state": "Telangana",
            "hostel_type": "girls",
            "average_rating": 4.6,
            "review_count": 10,
            "monthly_due_date": 5,
            "reminder_grace_days": 3,
            "follow_up_days": 7
        },
        {
            "name": "Grand Horizon Stays",
            "code": "GHS",
            "address": "Phase 1, Hinjewadi",
            "city": "Pune",
            "state": "Maharashtra",
            "hostel_type": "mixed",
            "average_rating": 4.7,
            "review_count": 12,
            "monthly_due_date": 5,
            "reminder_grace_days": 3,
            "follow_up_days": 7
        }
    ]
    res_h = await db.table("hostels").insert(hostels_data).execute()
    hostels = res_h.data
    jogmaya_hostel_id = [h["id"] for h in hostels if "Jogmaya" in h["name"]][0]
    lotus_hostel_id = [h["id"] for h in hostels if "Lotus" in h["name"]][0]
    mixed_hostel_id = [h["id"] for h in hostels if "Mixed" in h["name"]][0]
    
    print("Seeding hostel admin...")
    admin_hash = hash_password("hostel@123")
    await db.table("users").insert({
        "email": "jogmaya.admin@subhouz.com",
        "password_hash": admin_hash,
        "name": "Jogmaya Admin",
        "role": "hostel_admin",
        "hostel_id": jogmaya_hostel_id,
        "phone": "9876543211",
        "disabled": False
    }).execute()
    
    print("Seeding rooms and beds...")
    room_doc = {
        "hostel_id": jogmaya_hostel_id,
        "building_name": "Main Building",
        "floor_number": 1,
        "room_number": "101",
        "room_type": "bachelor",
        "ac_type": "ac",
        "capacity": 2,
        "occupied": 1,
        "rent": 5000,
        "electricity_rate": 8.0,
        "has_bathroom": False,
        "has_attached_bathroom": False,
        "has_balcony": True,
        "status": "available",
        "amenities": ["Wi-Fi", "AC", "Geyser"]
    }
    res_room = await db.table("rooms").insert(room_doc).execute()
    room = res_room.data[0]
    room_id = room["id"]
    
    bed_doc = {
        "hostel_id": jogmaya_hostel_id,
        "room_id": room_id,
        "bed_number": "B1",
        "status": "occupied",
        "monthly_rent": 5000
    }
    res_bed = await db.table("beds").insert(bed_doc).execute()
    bed = res_bed.data[0]
    bed_id = bed["id"]
    
    # Create second bed as available
    await db.table("beds").insert({
        "hostel_id": jogmaya_hostel_id,
        "room_id": room_id,
        "bed_number": "B2",
        "status": "available",
        "monthly_rent": 5000
    }).execute()

    # Seed Lotus Garden Room & Beds (Girls)
    lotus_room_doc = {
        "hostel_id": lotus_hostel_id,
        "building_name": "Lotus Block A",
        "floor_number": 1,
        "room_number": "101",
        "room_type": "bachelor",
        "ac_type": "ac",
        "capacity": 2,
        "occupied": 0,
        "rent": 6500,
        "electricity_rate": 8.0,
        "has_bathroom": False,
        "has_attached_bathroom": False,
        "has_balcony": True,
        "status": "available",
        "amenities": ["Wi-Fi", "AC", "Laundry"]
    }
    res_l_room = await db.table("rooms").insert(lotus_room_doc).execute()
    l_room_id = res_l_room.data[0]["id"]
    await db.table("beds").insert([
        {"hostel_id": lotus_hostel_id, "room_id": l_room_id, "bed_number": "B1", "status": "available", "monthly_rent": 6500},
        {"hostel_id": lotus_hostel_id, "room_id": l_room_id, "bed_number": "B2", "status": "available", "monthly_rent": 6500}
    ]).execute()

    # Seed Mixed Dormitory Room & Beds (Co-Ed)
    mixed_room_doc = {
        "hostel_id": mixed_hostel_id,
        "building_name": "Dorm Block",
        "floor_number": 1,
        "room_number": "D1",
        "room_type": "bachelor",
        "ac_type": "non_ac",
        "capacity": 4,
        "occupied": 0,
        "rent": 4000,
        "electricity_rate": 8.0,
        "has_bathroom": False,
        "has_attached_bathroom": False,
        "has_balcony": False,
        "status": "available",
        "amenities": ["Wi-Fi", "Locker"]
    }
    res_m_room = await db.table("rooms").insert(mixed_room_doc).execute()
    m_room_id = res_m_room.data[0]["id"]
    await db.table("beds").insert([
        {"hostel_id": mixed_hostel_id, "room_id": m_room_id, "bed_number": "B1", "status": "available", "monthly_rent": 4000},
        {"hostel_id": mixed_hostel_id, "room_id": m_room_id, "bed_number": "B2", "status": "available", "monthly_rent": 4000},
        {"hostel_id": mixed_hostel_id, "room_id": m_room_id, "bed_number": "B3", "status": "available", "monthly_rent": 4000},
        {"hostel_id": mixed_hostel_id, "room_id": m_room_id, "bed_number": "B4", "status": "available", "monthly_rent": 4000}
    ]).execute()
    
    print("Seeding residents...")
    resident_doc = {
        "hostel_id": jogmaya_hostel_id,
        "room_id": room_id,
        "bed_id": bed_id,
        "name": "John Doe",
        "phone": "9876543210",
        "email": "johndoe@example.com",
        "whatsapp": "9876543210",
        "gender": "male",
        "monthly_rent": 5000,
        "security_deposit": 10000,
        "check_in_date": "2026-06-01",
        "status": "active",
        "room_number": "101",
        "bed_number": "B1"
    }
    res_resident = await db.table("residents").insert(resident_doc).execute()
    resident = res_resident.data[0]
    resident_id = resident["id"]
    
    # Associate resident_id back to bed status
    await db.table("beds").update({"resident_id": resident_id}).eq("id", bed_id).execute()
    
    print("Seeding automations...")
    automations_data = [
        {
            "name": "Welcome WhatsApp",
            "description": "Triggered when a new enquiry is submitted. Notifies assigned hostel manager and sends a WhatsApp welcome message to the customer.",
            "trigger_type": "new_enquiry",
            "actions": ["send_whatsapp_customer", "notify_manager"],
            "enabled": True,
            "config": {}
        },
        {
            "name": "Booking Confirmation",
            "description": "Triggered when a booking is confirmed (resident created). Automatically sends WhatsApp with booking details, room assignment, check-in date, and manager contact.",
            "trigger_type": "booking_confirmed",
            "actions": ["send_whatsapp_booking_details"],
            "enabled": True,
            "config": {}
        },
        {
            "name": "Digital KYC Request",
            "description": "Triggered when a booking is confirmed. Automatically sends WhatsApp requesting the resident's Aadhaar document URL.",
            "trigger_type": "kyc_request",
            "actions": ["send_whatsapp_kyc_request"],
            "enabled": True,
            "config": {}
        },
        {
            "name": "Automatic Document Storage",
            "description": "Triggered when a resident submits their Aadhaar URL. Saves url, upload time, sets status to pending, and notifies manager.",
            "trigger_type": "document_submitted",
            "actions": ["notify_manager_verification"],
            "enabled": True,
            "config": {}
        },
        {
            "name": "Payment Storage",
            "description": "Triggered when a rent payment is recorded. Automatically stores payment details, transaction id, balance, and receipt number.",
            "trigger_type": "payment_recorded",
            "actions": ["log_payment_details"],
            "enabled": True,
            "config": {}
        },
        {
            "name": "Rent Reminder",
            "description": "Sends WhatsApp reminders to residents 7 days and 3 days before due date, on the due date, and 3 days and 7 days overdue.",
            "trigger_type": "due_date",
            "actions": ["send_whatsapp_rent_reminders"],
            "enabled": True,
            "config": {}
        },
        {
            "name": "Vacancy Update",
            "description": "Triggered on resident checkout, cancellation, or transfer. Marks bed/room vacant, updates hostel occupancy and website availability.",
            "trigger_type": "vacancy_update",
            "actions": ["release_inventory", "update_occupancy_stats"],
            "enabled": True,
            "config": {}
        }
    ]
    await db.table("automations").insert(automations_data).execute()
    
    print("Seeding enquiries...")
    await db.table("enquiries").insert({
        "hostel_id": jogmaya_hostel_id,
        "name": "Jane Smith",
        "phone": "9876543212",
        "email": "janesmith@example.com",
        "preferred_hostel": "Jogmaya Mansion",
        "hostel_type": "girls",
        "budget": 6000,
        "status": "new"
    }).execute()

    print("Seeding website images...")
    images_data = [
        {
            "title": "Website Logo",
            "category": "website_logo",
            "image_key": "website_logo",
            "url": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=100&q=80",
            "active": True,
            "order": 0
        },
        {
            "title": "Footer Logo",
            "category": "footer_logo",
            "image_key": "footer_logo",
            "url": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=100&q=80",
            "active": True,
            "order": 0
        },
        {
            "title": "Hero Background",
            "category": "hero_background",
            "image_key": "hero_background",
            "url": "https://images.unsplash.com/photo-1776763255235-046cd40f3093?auto=format&fit=crop&w=1600&q=80",
            "active": True,
            "order": 0
        },
        {
            "title": "Hero Side Image",
            "category": "hero_side_image",
            "image_key": "hero_side_image",
            "url": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
            "active": True,
            "order": 0
        },
        {
            "title": "About Image",
            "category": "about_image",
            "image_key": "about_image",
            "url": "https://images.unsplash.com/photo-1552858725-693709cc17c7?auto=format&fit=crop&w=800&q=80",
            "active": True,
            "order": 0
        },
        {
            "title": "Contact Banner",
            "category": "contact_banner",
            "image_key": "contact_banner",
            "url": "https://images.unsplash.com/photo-1552858725-2758b5fb1286?auto=format&fit=crop&w=1200&q=80",
            "active": True,
            "order": 0
        },
        {
            "title": "Default Property",
            "category": "default_property",
            "image_key": "default_property",
            "url": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
            "active": True,
            "order": 0
        },
        {
            "title": "Default Room",
            "category": "default_room",
            "image_key": "default_room",
            "url": "https://images.unsplash.com/photo-1656274274410-4a3f86a0fa6f?auto=format&fit=crop&w=600&q=80",
            "active": True,
            "order": 0
        }
    ]
    await db.table("website_images").insert(images_data).execute()

    print("Seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())

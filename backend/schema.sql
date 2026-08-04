-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS login_attempts CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS website_images CASCADE;
DROP TABLE IF EXISTS electricity_bills CASCADE;
DROP TABLE IF EXISTS enquiries CASCADE;
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS automation_logs CASCADE;
DROP TABLE IF EXISTS automations CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS rent_payments CASCADE;
DROP TABLE IF EXISTS residents CASCADE;
DROP TABLE IF EXISTS beds CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS hostels CASCADE;

-- 1. hostels
CREATE TABLE hostels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Bengaluru',
    state TEXT NOT NULL DEFAULT 'Karnataka',
    phone TEXT,
    email TEXT,
    description TEXT,
    images TEXT[] DEFAULT '{}',
    google_map_url TEXT,
    monthly_due_date INTEGER NOT NULL DEFAULT 5,
    reminder_grace_days INTEGER NOT NULL DEFAULT 3,
    follow_up_days INTEGER NOT NULL DEFAULT 7,
    hostel_type TEXT NOT NULL DEFAULT 'mixed', -- mixed, boys, girls
    total_buildings INTEGER NOT NULL DEFAULT 0,
    total_rooms INTEGER NOT NULL DEFAULT 0,
    total_beds INTEGER NOT NULL DEFAULT 0,
    occupied_beds INTEGER NOT NULL DEFAULT 0,
    average_rating NUMERIC DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'hostel_admin')),
    hostel_id UUID REFERENCES hostels(id) ON DELETE SET NULL,
    phone TEXT,
    avatar TEXT,
    disabled BOOLEAN DEFAULT FALSE,
    sec_school_hash TEXT,
    sec_mother_hash TEXT,
    sec_father_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. rooms
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    building_name TEXT NOT NULL DEFAULT 'Main Building',
    floor_number INTEGER NOT NULL DEFAULT 0,
    room_number TEXT NOT NULL,
    room_type TEXT NOT NULL DEFAULT 'bachelor', -- bachelor, family
    ac_type TEXT NOT NULL DEFAULT 'non_ac', -- ac, non_ac
    capacity INTEGER NOT NULL DEFAULT 1,
    occupied INTEGER NOT NULL DEFAULT 0,
    rent NUMERIC NOT NULL DEFAULT 0,
    electricity_rate NUMERIC NOT NULL DEFAULT 8.0,
    has_bathroom BOOLEAN NOT NULL DEFAULT FALSE,
    has_attached_bathroom BOOLEAN NOT NULL DEFAULT FALSE,
    has_balcony BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'available', -- available, occupied, reserved, maintenance
    amenities TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. beds
CREATE TABLE beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available', -- available, occupied, reserved, maintenance
    resident_id UUID, -- Will point to residents(id) via foreign key constraint added later to prevent circular references
    monthly_rent NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. residents
CREATE TABLE residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    whatsapp TEXT,
    gender TEXT NOT NULL DEFAULT 'male',
    date_of_birth TEXT,
    occupation TEXT,
    workplace TEXT,
    guardian_name TEXT,
    guardian_phone TEXT,
    guardian_relation TEXT,
    permanent_address TEXT,
    id_type TEXT,
    id_number TEXT,
    aadhaar_url TEXT,
    monthly_rent NUMERIC NOT NULL DEFAULT 0,
    security_deposit NUMERIC NOT NULL DEFAULT 0,
    due_date_override INTEGER,
    check_in_date TEXT,
    check_out_date TEXT,
    agreement_start TEXT,
    agreement_end TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- active, checked_out, archived
    room_number TEXT,
    bed_number TEXT,
    
    -- Document fields from resident_routes.py
    id_verified BOOLEAN DEFAULT FALSE,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add circular foreign key from beds to residents
ALTER TABLE beds ADD CONSTRAINT fk_beds_resident FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL;

-- 6. rent_payments
CREATE TABLE rent_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    resident_name TEXT,
    room_number TEXT,
    bed_number TEXT,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, overdue, partial
    paid_on TIMESTAMPTZ,
    payment_mode TEXT,
    challan_sent_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    follow_up_sent_at TIMESTAMPTZ,
    receipt_number TEXT,
    notes TEXT,
    transaction_id TEXT,
    balance NUMERIC NOT NULL DEFAULT 0.0,
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. activity_logs
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name TEXT,
    hostel_id UUID REFERENCES hostels(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. automations
CREATE TABLE automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL, -- rent_paid, due_date, follow_up, new_enquiry, etc.
    actions JSONB DEFAULT '[]'::jsonb,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE, -- NULL means global
    config JSONB DEFAULT '{}'::jsonb,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    execution_status TEXT DEFAULT 'success',
    run_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. automation_logs
CREATE TABLE automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID REFERENCES automations(id) ON DELETE SET NULL,
    automation_name TEXT,
    trigger TEXT,
    status TEXT,
    resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
    resident_name TEXT,
    hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
    hostel_name TEXT,
    whatsapp_number TEXT,
    message_template TEXT,
    details TEXT,
    message TEXT,
    error TEXT,
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9b. notification_queue
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID,
    hostel_id UUID,
    notification_type TEXT NOT NULL, -- whatsapp, email, sms
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- 10. enquiries
CREATE TABLE enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID REFERENCES hostels(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    occupation TEXT,
    preferred_hostel TEXT,
    hostel_type TEXT DEFAULT 'bachelor',
    budget NUMERIC,
    move_in_date TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new', -- new, contacted, visited, converted, archived
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    source TEXT,
    follow_up_notes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. electricity_bills
CREATE TABLE electricity_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    room_number TEXT,
    resident_name TEXT,
    previous_reading NUMERIC NOT NULL,
    current_reading NUMERIC NOT NULL,
    units_consumed NUMERIC NOT NULL,
    rate_per_unit NUMERIC NOT NULL DEFAULT 8.0,
    additional_charges NUMERIC NOT NULL DEFAULT 0.0,
    total_amount NUMERIC NOT NULL,
    billing_month INTEGER NOT NULL,
    billing_year INTEGER NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. website_images
CREATE TABLE website_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID REFERENCES hostels(id) ON DELETE CASCADE,
    url TEXT,
    title TEXT,
    category TEXT NOT NULL,
    is_hero BOOLEAN NOT NULL DEFAULT FALSE,
    "order" INTEGER NOT NULL DEFAULT 0,
    image_key TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    data TEXT, -- stores base64 image data
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. password_reset_tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE
);

-- 14. login_attempts
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL UNIQUE,
    attempts INTEGER NOT NULL DEFAULT 1,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. settings
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes as per startup event in server.py and standard optimizations
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_login_attempts_identifier ON login_attempts(identifier);
CREATE INDEX idx_residents_hostel_status ON residents(hostel_id, status);
CREATE INDEX idx_rooms_hostel ON rooms(hostel_id);
CREATE INDEX idx_beds_hostel_room ON beds(hostel_id, room_id);
CREATE INDEX idx_rent_payments_resident_month_year ON rent_payments(resident_id, month, year);
CREATE INDEX idx_rent_payments_hostel_month_year ON rent_payments(hostel_id, month, year);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp DESC);

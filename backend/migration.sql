-- Migration: Simplify Resident Documents (Store only Aadhaar URL)

-- Remove old columns if they exist
ALTER TABLE residents DROP COLUMN IF EXISTS photo_url;
ALTER TABLE residents DROP COLUMN IF EXISTS aadhaar_number;
ALTER TABLE residents DROP COLUMN IF EXISTS aadhaar_front;
ALTER TABLE residents DROP COLUMN IF EXISTS aadhaar_back;

-- Add new aadhaar_url column
ALTER TABLE residents ADD COLUMN IF NOT EXISTS aadhaar_url TEXT;

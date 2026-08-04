-- Migration: Add has_attached_bathroom field to rooms and default to false for existing rooms

-- 1. Add column if not exists
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS has_attached_bathroom BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Ensure has_bathroom default is false
ALTER TABLE rooms ALTER COLUMN has_bathroom SET DEFAULT FALSE;

-- 3. Data migration: Set has_attached_bathroom and has_bathroom to false for existing rooms
UPDATE rooms SET has_attached_bathroom = FALSE, has_bathroom = FALSE;

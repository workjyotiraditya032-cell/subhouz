-- Migration: Add security question hash columns to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS sec_school_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sec_mother_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sec_father_hash TEXT;

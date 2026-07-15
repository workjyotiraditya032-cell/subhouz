-- Migration: Build Complete Automation Module for Subhouz

-- 1. Create notification_queue table
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID,
    hostel_id UUID,
    notification_type TEXT NOT NULL, -- 'whatsapp', 'email', 'sms'
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- 2. Rename/Create automations table and columns
ALTER TABLE IF EXISTS automation_workflows RENAME TO automations;

CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    execution_status TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all automations columns exist
ALTER TABLE automations ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE automations ADD COLUMN IF NOT EXISTS next_run TIMESTAMPTZ;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS execution_status TEXT DEFAULT 'success';
ALTER TABLE automations ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- 3. Ensure all automation_logs columns exist
ALTER TABLE automation_logs RENAME COLUMN workflow_id TO automation_id;
ALTER TABLE automation_logs RENAME COLUMN workflow_name TO automation_name;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS time TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE automation_logs ADD COLUMN IF NOT EXISTS hostel_name TEXT;

-- Update foreign key references
ALTER TABLE automation_logs DROP CONSTRAINT IF EXISTS automation_logs_workflow_id_fkey;
ALTER TABLE automation_logs ADD CONSTRAINT automation_logs_automation_id_fkey FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE SET NULL;

-- 4. Add transaction_id and balance to rent_payments
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS balance NUMERIC NOT NULL DEFAULT 0.0;

-- Add notification_phone to clinics table
-- Used to send WhatsApp alerts to the clinic owner when key events occur
-- (escalation, appointment confirmed, out-of-hours messages)
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS notification_phone TEXT;

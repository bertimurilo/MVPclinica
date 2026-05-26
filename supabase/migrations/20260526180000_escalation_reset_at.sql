-- When a human operator clicks "Devolver a IA", store the timestamp so the
-- agent counts only outbound messages sent AFTER this point (not all-time),
-- preventing it from immediately re-escalating due to max_auto_messages.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS escalation_reset_at TIMESTAMPTZ;

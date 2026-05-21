CREATE INDEX IF NOT EXISTS idx_leads_cron_followup
ON leads (conversation_stage, escalated, status, last_message_at)
WHERE escalated = false;

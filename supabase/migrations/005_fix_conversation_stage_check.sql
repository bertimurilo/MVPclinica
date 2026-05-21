ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_conversation_stage_check;
ALTER TABLE leads ADD CONSTRAINT leads_conversation_stage_check
  CHECK (conversation_stage IN ('welcome','discovery','presentation','pricing','confirmed','closed','escalated'));

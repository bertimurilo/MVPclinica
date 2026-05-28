-- ============================================================================
-- Migración: integración Google Calendar
-- Añade columnas para trackear eventos de Calendar en appointments y clinics
-- ============================================================================

-- Trackeo de eventos de Google Calendar por cita
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_link      TEXT;

-- Configuración de Google Calendar por clínica
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS google_calendar_id      TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_enabled BOOLEAN NOT NULL DEFAULT false;

-- Índice para buscar appointments por event_id (útil para webhooks de Calendar)
CREATE INDEX IF NOT EXISTS idx_appointments_gcal_event
  ON appointments (google_calendar_event_id)
  WHERE google_calendar_event_id IS NOT NULL;

COMMENT ON COLUMN appointments.google_calendar_event_id IS 'ID del evento en Google Calendar para sincronización';
COMMENT ON COLUMN appointments.google_calendar_link      IS 'URL directa al evento en Google Calendar';
COMMENT ON COLUMN clinics.google_calendar_id             IS 'ID del calendario de Google a usar (email o calendar ID)';
COMMENT ON COLUMN clinics.google_calendar_enabled        IS 'Activa la sincronización automática con Google Calendar';

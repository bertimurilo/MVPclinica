-- ============================================================================
-- MIGRACIÓN 001 — Pre-deploy fixes
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Columnas faltantes en messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS response_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS out_of_hours BOOLEAN DEFAULT false;

-- 2. Columnas faltantes en appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS proposed_by TEXT CHECK (proposed_by IN ('agent', 'human', 'client')),
  ADD COLUMN IF NOT EXISTS requires_human_confirmation BOOLEAN DEFAULT false;

-- 3. Helper function para RLS (SECURITY DEFINER evita recursión en la tabla users)
CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 4. RLS policies
-- USERS
CREATE POLICY "users_own" ON users
  FOR ALL USING (id = auth.uid());

-- CLINICS
CREATE POLICY "clinics_select_own" ON clinics
  FOR SELECT USING (id = public.get_my_clinic_id());

CREATE POLICY "clinics_update_own" ON clinics
  FOR UPDATE USING (id = public.get_my_clinic_id());

-- TREATMENTS
CREATE POLICY "treatments_own_clinic" ON treatments
  FOR ALL USING (clinic_id = public.get_my_clinic_id());

-- AGENT_CONFIG
CREATE POLICY "agent_config_own_clinic" ON agent_config
  FOR ALL USING (clinic_id = public.get_my_clinic_id());

-- LEADS
CREATE POLICY "leads_own_clinic" ON leads
  FOR ALL USING (clinic_id = public.get_my_clinic_id());

-- MESSAGES
CREATE POLICY "messages_own_clinic" ON messages
  FOR ALL USING (clinic_id = public.get_my_clinic_id());

-- APPOINTMENTS
CREATE POLICY "appointments_own_clinic" ON appointments
  FOR ALL USING (clinic_id = public.get_my_clinic_id());

-- USAGE_EVENTS
CREATE POLICY "usage_events_own_clinic" ON usage_events
  FOR SELECT USING (clinic_id = public.get_my_clinic_id());

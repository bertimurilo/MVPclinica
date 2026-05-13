-- ============================================================================
-- RLS POLICIES — Multi-tenant: cada usuario solo accede a su clínica
-- Ejecutar en Supabase SQL Editor después del schema.sql
-- ============================================================================

-- Helper: devuelve el clinic_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_id FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- USERS
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid());

-- CLINICS
CREATE POLICY "clinics_select_own" ON clinics
  FOR SELECT USING (id = get_user_clinic_id());

CREATE POLICY "clinics_update_own" ON clinics
  FOR UPDATE USING (id = get_user_clinic_id());

-- TREATMENTS
CREATE POLICY "treatments_select_own" ON treatments
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "treatments_insert_own" ON treatments
  FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());

CREATE POLICY "treatments_update_own" ON treatments
  FOR UPDATE USING (clinic_id = get_user_clinic_id());

CREATE POLICY "treatments_delete_own" ON treatments
  FOR DELETE USING (clinic_id = get_user_clinic_id());

-- AGENT_CONFIG
CREATE POLICY "agent_config_select_own" ON agent_config
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "agent_config_insert_own" ON agent_config
  FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());

CREATE POLICY "agent_config_update_own" ON agent_config
  FOR UPDATE USING (clinic_id = get_user_clinic_id());

-- LEADS
CREATE POLICY "leads_select_own" ON leads
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "leads_insert_own" ON leads
  FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());

CREATE POLICY "leads_update_own" ON leads
  FOR UPDATE USING (clinic_id = get_user_clinic_id());

-- MESSAGES
CREATE POLICY "messages_select_own" ON messages
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "messages_insert_own" ON messages
  FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());

-- APPOINTMENTS
CREATE POLICY "appointments_select_own" ON appointments
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "appointments_insert_own" ON appointments
  FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());

CREATE POLICY "appointments_update_own" ON appointments
  FOR UPDATE USING (clinic_id = get_user_clinic_id());

-- USAGE_EVENTS (solo lectura para el usuario; escritura solo via service_role)
CREATE POLICY "usage_events_select_own" ON usage_events
  FOR SELECT USING (clinic_id = get_user_clinic_id());

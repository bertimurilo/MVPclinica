-- ============================================================================
-- CLINIQ AI — Schema de base de datos (Supabase / PostgreSQL)
-- SaaS de agente IA por WhatsApp para clinicas esteticas
-- ============================================================================

-- 1. CLINICAS (tenants)
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT DEFAULT 'Barcelona',
  phone_whatsapp TEXT,
  z_api_instance_id TEXT,
  z_api_token TEXT,
  z_api_connected BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  active BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. USUARIOS (login por clinica)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'receptionist', 'viewer')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TRATAMIENTOS por clinica
CREATE TABLE treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  duration_minutes INT,
  category TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CONFIG DEL AGENTE por clinica
CREATE TABLE agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  tone TEXT DEFAULT 'profesional' CHECK (tone IN ('profesional', 'cercano', 'formal', 'calido')),
  welcome_message TEXT DEFAULT 'Hola! Gracias por contactar con nosotros. En que podemos ayudarte?',
  fallback_message TEXT DEFAULT 'Voy a pasar tu consulta a nuestra recepcionista para darte la mejor atencion. Te contactara en breve.',
  out_of_hours_message TEXT DEFAULT 'Gracias por escribirnos. Ahora mismo estamos fuera de horario. Te responderemos manana a primera hora.',
  escalation_rules JSONB DEFAULT '{"unknown_question": true, "surgery_mention": true, "complaint": true}',
  business_hours JSONB DEFAULT '{"monday": {"open": "09:00", "close": "20:00"}, "tuesday": {"open": "09:00", "close": "20:00"}, "wednesday": {"open": "09:00", "close": "20:00"}, "thursday": {"open": "09:00", "close": "20:00"}, "friday": {"open": "09:00", "close": "20:00"}, "saturday": null, "sunday": null}',
  max_auto_messages INT DEFAULT 10,
  custom_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. LEADS
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  status TEXT DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'contactado', 'cita_agendada', 'convertido', 'inactivo', 'perdido')),
  treatment_interest TEXT,
  source TEXT DEFAULT 'whatsapp',
  score INT DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  qualification TEXT DEFAULT 'frio' CHECK (qualification IN ('frio', 'tibio', 'caliente')),
  notes TEXT,
  last_message_at TIMESTAMPTZ,
  escalated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clinic_id, phone)
);

-- 6. MENSAJES (cada mensaje de la conversacion)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('client', 'agent', 'human')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'document', 'sticker')),
  z_api_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. CITAS
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  treatment_id UUID REFERENCES treatments(id),
  appointment_date TIMESTAMPTZ,
  status TEXT DEFAULT 'agendada' CHECK (status IN ('agendada', 'confirmada', 'completada', 'cancelada', 'no_show')),
  notes TEXT,
  reported_to_stripe BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. EVENTOS DE USO (para Stripe metering)
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('appointment_generated', 'message_sent', 'lead_created')),
  appointment_id UUID REFERENCES appointments(id),
  stripe_reported BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_leads_clinic ON leads(clinic_id);
CREATE INDEX idx_leads_status ON leads(clinic_id, status);
CREATE INDEX idx_leads_phone ON leads(clinic_id, phone);
CREATE INDEX idx_messages_lead ON messages(lead_id);
CREATE INDEX idx_messages_clinic ON messages(clinic_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_appointments_clinic ON appointments(clinic_id);
CREATE INDEX idx_treatments_clinic ON treatments(clinic_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Policies: cada usuario solo ve datos de su clinica
-- (las policies exactas dependen del metodo de auth que uses)

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

-- Actualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON clinics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_agent_config_updated_at BEFORE UPDATE ON agent_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- RLS POLICIES — Tenant isolation via clinic_id
-- ============================================================================

CREATE OR REPLACE FUNCTION current_clinic_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT clinic_id FROM users WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS tenant_isolation ON clinics;
CREATE POLICY tenant_isolation ON clinics
  FOR ALL USING (id = current_clinic_id());

DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  FOR ALL USING (clinic_id = current_clinic_id());

DROP POLICY IF EXISTS tenant_isolation ON treatments;
CREATE POLICY tenant_isolation ON treatments
  FOR ALL USING (clinic_id = current_clinic_id());

DROP POLICY IF EXISTS tenant_isolation ON agent_config;
CREATE POLICY tenant_isolation ON agent_config
  FOR ALL USING (clinic_id = current_clinic_id());

DROP POLICY IF EXISTS tenant_isolation ON leads;
CREATE POLICY tenant_isolation ON leads
  FOR ALL USING (clinic_id = current_clinic_id());

DROP POLICY IF EXISTS tenant_isolation ON messages;
CREATE POLICY tenant_isolation ON messages
  FOR ALL USING (clinic_id = current_clinic_id());

DROP POLICY IF EXISTS tenant_isolation ON appointments;
CREATE POLICY tenant_isolation ON appointments
  FOR ALL USING (clinic_id = current_clinic_id());

DROP POLICY IF EXISTS tenant_isolation ON usage_events;
CREATE POLICY tenant_isolation ON usage_events
  FOR ALL USING (clinic_id = current_clinic_id());

-- ============================================================================
-- SCHEMA ADDITIONS — ROI tracking + agent appointment proposals
-- ============================================================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS response_time_seconds INT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS out_of_hours BOOLEAN DEFAULT false;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS proposed_by TEXT
  CHECK (proposed_by IN ('agent', 'human', 'client')) DEFAULT 'human';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS requires_human_confirmation BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_messages_response_time
  ON messages(clinic_id, created_at DESC)
  WHERE response_time_seconds IS NOT NULL;

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
  active BOOLEAN DEFAULT false,
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
  agent_name TEXT DEFAULT 'Sara',
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
  conversation_stage TEXT DEFAULT 'welcome' CHECK (conversation_stage IN ('welcome', 'discovery', 'presentation', 'pricing', 'confirmed', 'escalated')),
  objection_count INT DEFAULT 0,
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
  response_time_seconds INTEGER,
  out_of_hours BOOLEAN DEFAULT false,
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
  proposed_by TEXT CHECK (proposed_by IN ('agent', 'human', 'client')),
  requires_human_confirmation BOOLEAN DEFAULT false,
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

-- Helper: devuelve el clinic_id del usuario autenticado (SECURITY DEFINER evita recursion)
CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- USERS: cada usuario ve y edita solo su propio registro
CREATE POLICY "users_own" ON users
  FOR ALL USING (id = auth.uid());

-- CLINICS: el usuario ve/edita solo la clínica a la que pertenece
CREATE POLICY "clinics_select_own" ON clinics
  FOR SELECT USING (id = public.get_my_clinic_id());

CREATE POLICY "clinics_update_own" ON clinics
  FOR UPDATE USING (id = public.get_my_clinic_id());

-- TREATMENTS: CRUD completo dentro de la clínica propia
CREATE POLICY "treatments_own_clinic" ON treatments
  FOR ALL USING (clinic_id = public.get_my_clinic_id());

-- AGENT_CONFIG: CRUD completo dentro de la clínica propia
CREATE POLICY "agent_config_own_clinic" ON agent_config
  FOR ALL USING (clinic_id = public.get_my_clinic_id());

-- LEADS: CRUD completo dentro de la clínica propia
CREATE POLICY "leads_own_clinic" ON leads
  FOR ALL USING (clinic_id = public.get_my_clinic_id());

-- MESSAGES: CRUD completo dentro de la clínica propia
CREATE POLICY "messages_own_clinic" ON messages
  FOR ALL USING (clinic_id = public.get_my_clinic_id());

-- APPOINTMENTS: CRUD completo dentro de la clínica propia
CREATE POLICY "appointments_own_clinic" ON appointments
  FOR ALL USING (clinic_id = public.get_my_clinic_id());

-- USAGE_EVENTS: solo lectura para el dashboard
CREATE POLICY "usage_events_own_clinic" ON usage_events
  FOR SELECT USING (clinic_id = public.get_my_clinic_id());

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

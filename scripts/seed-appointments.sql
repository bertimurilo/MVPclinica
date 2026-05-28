-- ============================================================================
-- CLINIQ AI — Seed de citas de prueba
-- Ejecutar en: Supabase Dashboard → SQL Editor (o psql)
-- Idempotente: se puede ejecutar varias veces sin duplicar datos
-- ============================================================================

DO $seed$
DECLARE
  v_clinic_id UUID;
  v_t1 UUID; v_t2 UUID; v_t3 UUID; v_t4 UUID; v_t5 UUID;
  v_l1 UUID; v_l2 UUID; v_l3 UUID; v_l4 UUID; v_l5 UUID;
  v_now TIMESTAMPTZ := date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid';
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 1. CLÍNICA
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO clinics (name, slug, email, phone, city, active)
  VALUES (
    'Clínica Estética Belleza Barcelona (TEST)',
    'clinica-test-seed',
    'hola@clinica-test.es',
    '+34930000000',
    'Barcelona',
    true
  )
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name
  RETURNING id INTO v_clinic_id;

  RAISE NOTICE '── Clínica: % (ID: %)', 'Clínica Estética Belleza Barcelona (TEST)', v_clinic_id;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2. AGENT CONFIG (si no existe)
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO agent_config (clinic_id, agent_name, tone)
  VALUES (v_clinic_id, 'Sara', 'cercano')
  ON CONFLICT (clinic_id) DO NOTHING;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 3. TRATAMIENTOS (sin constraint único → comprobamos antes de insertar)
  -- ═══════════════════════════════════════════════════════════════════════════

  -- Botox labios
  SELECT id INTO v_t1
    FROM treatments
   WHERE clinic_id = v_clinic_id AND name = 'Botox labios'
   LIMIT 1;
  IF v_t1 IS NULL THEN
    INSERT INTO treatments (clinic_id, name, price, duration_minutes, category, active)
    VALUES (v_clinic_id, 'Botox labios', 350, 45, 'Medicina estética', true)
    RETURNING id INTO v_t1;
  END IF;

  -- Hidratación facial
  SELECT id INTO v_t2
    FROM treatments
   WHERE clinic_id = v_clinic_id AND name = 'Hidratación facial con ácido hialurónico'
   LIMIT 1;
  IF v_t2 IS NULL THEN
    INSERT INTO treatments (clinic_id, name, price, duration_minutes, category, active)
    VALUES (v_clinic_id, 'Hidratación facial con ácido hialurónico', 120, 60, 'Medicina estética', true)
    RETURNING id INTO v_t2;
  END IF;

  -- Láser depilación
  SELECT id INTO v_t3
    FROM treatments
   WHERE clinic_id = v_clinic_id AND name = 'Láser depilación piernas completas'
   LIMIT 1;
  IF v_t3 IS NULL THEN
    INSERT INTO treatments (clinic_id, name, price, duration_minutes, category, active)
    VALUES (v_clinic_id, 'Láser depilación piernas completas', 180, 90, 'Depilación láser', true)
    RETURNING id INTO v_t3;
  END IF;

  -- Relleno de pómulos
  SELECT id INTO v_t4
    FROM treatments
   WHERE clinic_id = v_clinic_id AND name = 'Relleno de pómulos con ácido hialurónico'
   LIMIT 1;
  IF v_t4 IS NULL THEN
    INSERT INTO treatments (clinic_id, name, price, duration_minutes, category, active)
    VALUES (v_clinic_id, 'Relleno de pómulos con ácido hialurónico', 450, 45, 'Medicina estética', true)
    RETURNING id INTO v_t4;
  END IF;

  -- Peeling químico
  SELECT id INTO v_t5
    FROM treatments
   WHERE clinic_id = v_clinic_id AND name = 'Peeling químico superficial'
   LIMIT 1;
  IF v_t5 IS NULL THEN
    INSERT INTO treatments (clinic_id, name, price, duration_minutes, category, active)
    VALUES (v_clinic_id, 'Peeling químico superficial', 95, 30, 'Tratamientos faciales', true)
    RETURNING id INTO v_t5;
  END IF;

  RAISE NOTICE '── 5 tratamientos sincronizados';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 4. LEADS  (UNIQUE: clinic_id + phone)
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO leads (clinic_id, phone, name, status, qualification, conversation_stage, source, score)
  VALUES (v_clinic_id, '+34612345678', 'María García López', 'cita_agendada', 'caliente', 'confirmed', 'seed', 80)
  ON CONFLICT (clinic_id, phone) DO UPDATE
    SET name   = EXCLUDED.name,
        status = EXCLUDED.status
  RETURNING id INTO v_l1;

  INSERT INTO leads (clinic_id, phone, name, status, qualification, conversation_stage, source, score)
  VALUES (v_clinic_id, '+34623456789', 'Carmen Martínez Ruiz', 'cita_agendada', 'caliente', 'confirmed', 'seed', 90)
  ON CONFLICT (clinic_id, phone) DO UPDATE
    SET name   = EXCLUDED.name,
        status = EXCLUDED.status
  RETURNING id INTO v_l2;

  INSERT INTO leads (clinic_id, phone, name, status, qualification, conversation_stage, source, score)
  VALUES (v_clinic_id, '+34634567890', 'Laura Sánchez Pérez', 'cita_agendada', 'caliente', 'confirmed', 'seed', 75)
  ON CONFLICT (clinic_id, phone) DO UPDATE
    SET name   = EXCLUDED.name,
        status = EXCLUDED.status
  RETURNING id INTO v_l3;

  INSERT INTO leads (clinic_id, phone, name, status, qualification, conversation_stage, source, score)
  VALUES (v_clinic_id, '+34645678901', 'Ana González Moreno', 'cita_agendada', 'caliente', 'confirmed', 'seed', 85)
  ON CONFLICT (clinic_id, phone) DO UPDATE
    SET name   = EXCLUDED.name,
        status = EXCLUDED.status
  RETURNING id INTO v_l4;

  INSERT INTO leads (clinic_id, phone, name, status, qualification, conversation_stage, source, score)
  VALUES (v_clinic_id, '+34656789012', 'Isabel Fernández Jiménez', 'cita_agendada', 'caliente', 'confirmed', 'seed', 95)
  ON CONFLICT (clinic_id, phone) DO UPDATE
    SET name   = EXCLUDED.name,
        status = EXCLUDED.status
  RETURNING id INTO v_l5;

  RAISE NOTICE '── 5 leads sincronizados';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 5. CITAS
  -- Las fechas son relativas a hoy (medianoche en Europe/Madrid):
  --   Cita 1: mañana      10:00
  --   Cita 2: pasado      11:30
  --   Cita 3: en 3 días   16:00
  --   Cita 4: en 5 días   12:00
  --   Cita 5: en 7 días   09:30
  -- ═══════════════════════════════════════════════════════════════════════════

  INSERT INTO appointments
    (clinic_id, lead_id, treatment_id, appointment_date,
     status, notes, proposed_by, requires_human_confirmation)
  VALUES
    -- 1 · María García — Botox labios (mañana 10:00)
    (v_clinic_id, v_l1, v_t1,
     v_now + INTERVAL '1 day'  + INTERVAL '10 hours',
     'agendada',
     'Primera visita. Interesada en aumento natural de labios.',
     'agent', true),

    -- 2 · Carmen Martínez — Hidratación facial (pasado 11:30)
    (v_clinic_id, v_l2, v_t2,
     v_now + INTERVAL '2 days' + INTERVAL '11 hours 30 minutes',
     'confirmada',
     'Paciente habitual. Tratamiento de mantenimiento trimestral.',
     'agent', false),

    -- 3 · Laura Sánchez — Láser depilación (en 3 días 16:00)
    (v_clinic_id, v_l3, v_t3,
     v_now + INTERVAL '3 days' + INTERVAL '16 hours',
     'agendada',
     'Sesión 3 de 6. Piel sensible, usar parámetros reducidos.',
     'agent', true),

    -- 4 · Ana González — Relleno pómulos (en 5 días 12:00)
    (v_clinic_id, v_l4, v_t4,
     v_now + INTERVAL '5 days' + INTERVAL '12 hours',
     'agendada',
     'Viene referida por Carmen Martínez. Solicita resultado muy natural.',
     'agent', true),

    -- 5 · Isabel Fernández — Peeling químico (en 7 días 09:30)
    (v_clinic_id, v_l5, v_t5,
     v_now + INTERVAL '7 days' + INTERVAL '9 hours 30 minutes',
     'confirmada',
     'Tratamiento acné. Pago realizado por adelantado.',
     'agent', false);

  RAISE NOTICE '── 5 citas insertadas';
  RAISE NOTICE '═══ Seed completado para clínica ID: % ═══', v_clinic_id;

END;
$seed$;

-- ============================================================================
-- VERIFICACIÓN: muestra las citas recién insertadas
-- ============================================================================
SELECT
  a.id                                               AS cita_id,
  l.name                                             AS paciente,
  l.phone                                            AS telefono,
  t.name                                             AS tratamiento,
  t.price                                            AS precio_eur,
  to_char(
    a.appointment_date AT TIME ZONE 'Europe/Madrid',
    'DD/MM/YYYY HH24:MI'
  )                                                  AS fecha_hora,
  a.status,
  a.requires_human_confirmation                      AS pendiente_confirmacion
FROM appointments  a
JOIN leads         l ON l.id = a.lead_id
JOIN treatments    t ON t.id = a.treatment_id
JOIN clinics       c ON c.id = a.clinic_id
WHERE c.slug = 'clinica-test-seed'
ORDER BY a.appointment_date;

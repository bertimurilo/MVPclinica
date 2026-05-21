CREATE OR REPLACE FUNCTION get_dashboard_stats(p_clinic_id UUID)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_today_start      TIMESTAMPTZ := date_trunc('day', NOW());
  v_yesterday_start  TIMESTAMPTZ := date_trunc('day', NOW()) - INTERVAL '1 day';
  v_week_start       TIMESTAMPTZ := date_trunc('week', NOW());
  v_last_week_start  TIMESTAMPTZ := date_trunc('week', NOW()) - INTERVAL '1 week';
  v_thirty_days_ago  TIMESTAMPTZ := NOW() - INTERVAL '30 days';
  v_leads_hoy        BIGINT;
  v_leads_ayer       BIGINT;
  v_leads_activos    BIGINT;
  v_citas_semana     BIGINT;
  v_citas_sem_pasada BIGINT;
  v_total_30         BIGINT;
  v_converted_30     BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_leads_hoy FROM leads
    WHERE clinic_id = p_clinic_id AND created_at >= v_today_start;
  SELECT COUNT(*) INTO v_leads_ayer FROM leads
    WHERE clinic_id = p_clinic_id AND created_at >= v_yesterday_start AND created_at < v_today_start;
  SELECT COUNT(*) INTO v_leads_activos FROM leads
    WHERE clinic_id = p_clinic_id AND status NOT IN ('convertido','inactivo','perdido');
  SELECT COUNT(*) INTO v_citas_semana FROM appointments
    WHERE clinic_id = p_clinic_id AND appointment_date >= v_week_start;
  SELECT COUNT(*) INTO v_citas_sem_pasada FROM appointments
    WHERE clinic_id = p_clinic_id AND appointment_date >= v_last_week_start AND appointment_date < v_week_start;
  SELECT COUNT(*) INTO v_total_30 FROM leads
    WHERE clinic_id = p_clinic_id AND created_at >= v_thirty_days_ago;
  SELECT COUNT(*) INTO v_converted_30 FROM leads
    WHERE clinic_id = p_clinic_id AND created_at >= v_thirty_days_ago AND status = 'convertido';
  RETURN json_build_object(
    'leads_hoy',             v_leads_hoy,
    'leads_hoy_ayer',        v_leads_ayer,
    'leads_activos',         v_leads_activos,
    'citas_semana',          v_citas_semana,
    'citas_semana_pasada',   v_citas_sem_pasada,
    'tasa_conversion',       CASE WHEN v_total_30 > 0
                               THEN ROUND((v_converted_30::NUMERIC / v_total_30) * 100)
                               ELSE 0 END
  );
END;
$$;

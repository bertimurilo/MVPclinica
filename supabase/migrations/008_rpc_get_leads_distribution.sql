CREATE OR REPLACE FUNCTION get_leads_distribution(p_clinic_id UUID)
RETURNS TABLE(status TEXT, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT status, COUNT(*) AS count
  FROM leads
  WHERE clinic_id = p_clinic_id
  GROUP BY status;
$$;

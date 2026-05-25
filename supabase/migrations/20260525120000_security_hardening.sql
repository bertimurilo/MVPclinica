-- ============================================================================
-- MIGRACIÓN: Security Hardening — Cerrar warnings del linter de Supabase
-- Fecha: 2026-05-25
-- ============================================================================


-- ============================================================================
-- FIX 1: function_search_path_mutable (7 funciones)
--
-- Sin un search_path fijo, un rol malicioso podría crear objetos en un schema
-- con mayor prioridad y redefinir funciones/tipos que las funciones internas
-- invocan (search_path hijacking). SET search_path = 'public' lo previene.
-- ============================================================================

ALTER FUNCTION public.update_updated_at()
  SET search_path = 'public';

ALTER FUNCTION public.current_clinic_id()
  SET search_path = 'public';

ALTER FUNCTION public.auth_clinic_id()
  SET search_path = 'public';

ALTER FUNCTION public.get_my_clinic_id()
  SET search_path = 'public';

ALTER FUNCTION public.rate_limit_increment(TEXT, TEXT, TIMESTAMPTZ)
  SET search_path = 'public';

ALTER FUNCTION public.get_leads_distribution(UUID)
  SET search_path = 'public';

ALTER FUNCTION public.get_dashboard_stats(UUID)
  SET search_path = 'public';


-- ============================================================================
-- FIX 2+3: anon_security_definer_function_executable
--           authenticated_security_definer_function_executable
--
-- Las 4 funciones SECURITY DEFINER a continuación se invocan exclusivamente
-- desde el backend (server actions / API routes) usando el service_role key.
-- No deben ser ejecutables directamente por anon ni authenticated vía REST.
--
-- Técnica: REVOKE PUBLIC elimina el acceso heredado por todos los roles
-- (incluyendo anon y authenticated). Luego se re-concede solo a los roles
-- que el backend necesita: service_role y postgres.
-- ============================================================================

-- current_clinic_id
REVOKE EXECUTE ON FUNCTION public.current_clinic_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_clinic_id() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.current_clinic_id() TO service_role, postgres;

-- get_my_clinic_id
REVOKE EXECUTE ON FUNCTION public.get_my_clinic_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_clinic_id() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_my_clinic_id() TO service_role, postgres;

-- get_dashboard_stats
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO service_role, postgres;

-- get_leads_distribution
REVOKE EXECUTE ON FUNCTION public.get_leads_distribution(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_leads_distribution(UUID) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_leads_distribution(UUID) TO service_role, postgres;


-- ============================================================================
-- FIX 4: rls_policy_always_true — public.waitlist
--
-- La política public_insert_waitlist usa WITH CHECK (true), lo que el linter
-- marca como potencialmente inseguro. Es INTENCIONAL: la waitlist del landing
-- page debe ser accesible por cualquier visitante sin autenticación previa.
-- Se documenta con un comentario para suprimir el aviso en auditorías futuras.
-- ============================================================================

COMMENT ON POLICY "public_insert_waitlist" ON public.waitlist IS
  'INTENCIONAL: la waitlist del landing permite que cualquier visitante (anon/authenticated) se registre sin autenticación. WITH CHECK (true) es correcto aquí.';

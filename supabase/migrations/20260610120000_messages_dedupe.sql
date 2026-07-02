-- Dedupe atómico de mensajes entrantes del webhook Z-API.
--
-- Problema: el webhook hacía SELECT + INSERT separados (TOCTOU). Con reintentos
-- de Z-API o alta concurrencia podían insertarse mensajes duplicados y el agente
-- respondía dos veces. La deduplicación debe vivir en la BD como constraint.

-- 1. Limpieza previa: si ya existen duplicados, conservar el más antiguo por
--    (clinic_id, z_api_message_id) y eliminar el resto.
DELETE FROM public.messages m
USING public.messages keep
WHERE m.z_api_message_id IS NOT NULL
  AND keep.z_api_message_id = m.z_api_message_id
  AND keep.clinic_id = m.clinic_id
  AND keep.created_at < m.created_at;

-- 2. Constraint UNIQUE. Los mensajes salientes tienen z_api_message_id NULL y
--    en Postgres los NULL son distintos entre sí (NULLS DISTINCT), así que no
--    chocan con esta constraint.
ALTER TABLE public.messages
  ADD CONSTRAINT messages_clinic_zapi_msg_unique
  UNIQUE (clinic_id, z_api_message_id);

-- 3. Documentación de políticas RLS intencionales detectadas en la auditoría.
COMMENT ON POLICY usage_events_all ON public.usage_events IS
  'FOR ALL con aislamiento por clinic_id (auth_clinic_id()). Las escrituras en producción las hace el backend con service role (billing Stripe).';

COMMENT ON TABLE public.rate_limit_windows IS
  'RLS habilitado sin políticas a propósito: deny-all para anon/authenticated; solo el service role (webhook) lee/escribe.';

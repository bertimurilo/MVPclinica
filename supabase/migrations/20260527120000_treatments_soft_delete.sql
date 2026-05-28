-- ============================================================================
-- Tratamientos: soft-delete, updated_at, unicidad por clínica
-- ============================================================================

-- 1. Columna updated_at
ALTER TABLE treatments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Trigger para updated_at automático (reutiliza update_updated_at() del schema base)
CREATE TRIGGER update_treatments_updated_at
  BEFORE UPDATE ON treatments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Columna deleted_at para soft-delete
ALTER TABLE treatments ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 4. Índice único parcial: UNIQUE(clinic_id, name) solo entre registros NO borrados.
--    Índice parcial en vez de CONSTRAINT para que un tratamiento soft-deleted no
--    bloquee la creación de uno nuevo con el mismo nombre.
CREATE UNIQUE INDEX treatments_clinic_name_unique
  ON treatments(clinic_id, name)
  WHERE deleted_at IS NULL;

-- 5. Índice de rendimiento para filtros WHERE deleted_at IS NULL
CREATE INDEX idx_treatments_not_deleted ON treatments(clinic_id) WHERE deleted_at IS NULL;

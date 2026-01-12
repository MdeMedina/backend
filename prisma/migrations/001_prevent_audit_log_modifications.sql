-- ============================================
-- RESTRICCIONES PARA AUDIT_LOG
-- Prevenir UPDATE y DELETE en la tabla audit_log
-- ============================================

-- Crear función que previene UPDATE
CREATE OR REPLACE FUNCTION prevent_audit_log_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'UPDATE operations are not allowed on audit_logs table. This table is immutable for data integrity.';
END;
$$ LANGUAGE plpgsql;

-- Crear función que previene DELETE
CREATE OR REPLACE FUNCTION prevent_audit_log_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'DELETE operations are not allowed on audit_logs table. This table is immutable for data integrity.';
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para prevenir UPDATE
DROP TRIGGER IF EXISTS audit_log_prevent_update ON audit_logs;
CREATE TRIGGER audit_log_prevent_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_update();

-- Crear trigger para prevenir DELETE
DROP TRIGGER IF EXISTS audit_log_prevent_delete ON audit_logs;
CREATE TRIGGER audit_log_prevent_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_delete();

-- Comentario en la tabla
COMMENT ON TABLE audit_logs IS 'Immutable audit log table. UPDATE and DELETE operations are prohibited to maintain data integrity.';





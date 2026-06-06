-- Tracking de último acceso de las empresas
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS last_login timestamptz;

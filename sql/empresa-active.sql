-- Activar/desactivar empresas — ejecutar en el SQL Editor de Supabase
ALTER TABLE companies ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

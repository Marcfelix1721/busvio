-- Onboarding guiado de empresas
-- Ejecutar en el SQL Editor de Supabase

-- 1. Columna que marca si la empresa ya completó el wizard de onboarding.
--    Las empresas existentes se marcan como completado para no mostrarles el
--    wizard de golpe; los nuevos registros arrancan en false (DEFAULT).
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS onboarding_completado boolean NOT NULL DEFAULT false;

-- Las empresas que ya estaban usando la app no deberían ver el onboarding.
UPDATE companies SET onboarding_completado = true WHERE created_at < now();

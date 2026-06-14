-- ============================================================
-- FIX: RLS de pricing_settings — desbloquea el onboarding
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================
--
-- CAUSA: pricing_settings se creó a mano en Supabase (no está versionada en
-- el repo) y su política RLS quedó ausente o incompleta. El onboarding escribe
-- con la sesión de la EMPRESA (browser client → sujeto a RLS); crear-empresa ya
-- insertó una fila por empresa (con service role), así que el onboarding hace un
-- UPDATE. Sin una política que permita ese UPDATE/INSERT a la propia empresa, el
-- write se bloquea con "new row violates row-level security policy".
--
-- Una empresa == un usuario auth: crear-empresa hace
--   companies.insert({ id: authData.user.id, ... })
-- por lo que companies.id = auth.users.id y, para la propia fila,
--   pricing_settings.company_id = auth.uid().
-- Es el MISMO patrón ya probado en staff_documentos (sql/conductores.sql).


-- ---------- DIAGNÓSTICO (ejecútalo antes, por separado, para ver el estado real) ----------
-- 1) ¿RLS activado?
--    select relname, relrowsecurity from pg_class where relname = 'pricing_settings';
-- 2) ¿Qué políticas hay y con qué condición? (busca si falta INSERT/UPDATE,
--    o si alguna es RESTRICTIVE, o usa una condición distinta a company_id = auth.uid())
--    select polname, cmd, permissive, qual, with_check
--      from pg_policies where tablename = 'pricing_settings';
-- 3) ¿Existe índice único en company_id? (lo necesita upsert onConflict:'company_id')
--    select indexname, indexdef from pg_indexes where tablename = 'pricing_settings';


-- ---------- CORRECCIÓN ----------

-- 1. El upsert({...},{ onConflict: 'company_id' }) del onboarding y de Ajustes
--    necesita un índice único en company_id. Idempotente.
create unique index if not exists pricing_settings_company_id_key
  on pricing_settings(company_id);

-- 2. Activar RLS y dejar UNA política correcta y completa (SELECT/INSERT/UPDATE/
--    DELETE) para que la empresa gestione su propia fila. Mismo patrón que
--    staff_documentos. Las políticas permisivas se combinan con OR, así que esta
--    desbloquea aunque queden restos antiguos permisivos; si el diagnóstico (2)
--    muestra alguna política RESTRICTIVE o con condición errónea, elimínala a mano.
alter table pricing_settings enable row level security;

drop policy if exists "pricing_settings por empresa" on pricing_settings;
create policy "pricing_settings por empresa" on pricing_settings
  for all to authenticated
  using (company_id = auth.uid())
  with check (company_id = auth.uid());


-- ---------- VERIFICACIÓN (debería devolver la política recién creada) ----------
-- select polname, cmd, permissive, qual, with_check
--   from pg_policies where tablename = 'pricing_settings';

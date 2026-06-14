-- ============================================================
-- FIX RLS de las tablas de CONFIGURACIÓN que escribe la empresa
-- (onboarding + Ajustes). Ejecutar en el SQL Editor de Supabase.
-- ============================================================
--
-- CAUSA (la misma que pricing_settings): tablas creadas a mano con RLS activado
-- pero SIN la política que permite a la empresa gestionar su propia fila →
-- "new row violates row-level security policy" al escribir.
--
-- Empresa == usuario auth: crear-empresa hace companies.insert({ id: auth.user.id })
-- por lo que companies.id = auth.users.id y, para la fila propia,
-- company_id = auth.uid(). Mismo patrón probado en staff_documentos.
--
-- POR QUÉ ESTAS 4 Y NO OTRAS (para no ir tabla por tabla):
-- Estas tablas SOLO las escribe el dueño (sesión de la empresa) y SOLO las leen
-- el dueño o el motor de cálculo (que usa service role e IGNORA RLS). Por eso una
-- política ausente rompe el WRITE en silencio (las lecturas del motor siguen
-- funcionando) — exactamente el síntoma del onboarding. Son el conjunto completo
-- con ese riesgo:
--     pricing_settings, company_settings, cost_variables, exclusion_groups
--
-- NO SE TOCAN AQUÍ (acceso COMPARTIDO; un policy de solo-dueño las rompería):
--   · companies        → clave 'id' (no company_id) + lectura pública por slug (anon)
--   · vehicles, staff  → también las lee el PORTAL DEL CONDUCTOR (otro usuario auth;
--                        su empresa va en user_metadata.company_id del JWT, no en
--                        company_id = auth.uid())
--   · quote_requests   → el form público (anon) INSERTA; el conductor lee
--   · service_assignments / service_incidents / service_logs → portal del conductor
--   · clientes         → CRM (no es onboarding/ajustes)
-- Estas funcionan hoy (el conductor y el público acceden), así que su RLS NO está
-- "activado-sin-política". Si el diagnóstico mostrara lo contrario, se arreglan
-- aparte con un policy COMPUESTO (dueño + conductor vía
--   (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid  + anon donde aplique),
-- nunca con el de solo-dueño de abajo.


-- ---------- DIAGNÓSTICO (ejecútalo aparte ANTES para ver el estado real) ----------
-- ¿RLS activado en cada tabla?
-- select c.relname, c.relrowsecurity as rls_activado
--   from pg_class c join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public'
--     and c.relname in ('pricing_settings','company_settings','cost_variables',
--                       'exclusion_groups','vehicles','staff','companies','quote_requests');
--
-- ¿Qué políticas hay (y con qué condición) en las 4 que vamos a arreglar?
-- select tablename, polname, cmd, permissive, qual, with_check
--   from pg_policies
--   where tablename in ('pricing_settings','company_settings','cost_variables','exclusion_groups')
--   order by tablename, polname;


-- ---------- CORRECCIÓN ----------

-- 1) Índice único en company_id SOLO para las tablas singleton (1 fila/empresa),
--    necesario para upsert({...},{ onConflict:'company_id' }) del onboarding/ajustes.
--    (cost_variables y exclusion_groups son multi-fila → NO llevan único.)
create unique index if not exists pricing_settings_company_id_key on pricing_settings(company_id);
create unique index if not exists company_settings_company_id_key on company_settings(company_id);

-- 2) RLS + política única correcta (SELECT/INSERT/UPDATE/DELETE) por empresa.
--    Idempotente (drop + create de la misma política). No se desactiva RLS en ninguna.

-- pricing_settings (re-aseguramos; ya estaba)
alter table pricing_settings enable row level security;
drop policy if exists "pricing_settings por empresa" on pricing_settings;
create policy "pricing_settings por empresa" on pricing_settings
  for all to authenticated using (company_id = auth.uid()) with check (company_id = auth.uid());

-- company_settings (la que falla ahora, paso "Precios")
alter table company_settings enable row level security;
drop policy if exists "company_settings por empresa" on company_settings;
create policy "company_settings por empresa" on company_settings
  for all to authenticated using (company_id = auth.uid()) with check (company_id = auth.uid());

-- cost_variables (motor de costes — Ajustes)
alter table cost_variables enable row level security;
drop policy if exists "cost_variables por empresa" on cost_variables;
create policy "cost_variables por empresa" on cost_variables
  for all to authenticated using (company_id = auth.uid()) with check (company_id = auth.uid());

-- exclusion_groups (grupos de exclusión — Ajustes)
alter table exclusion_groups enable row level security;
drop policy if exists "exclusion_groups por empresa" on exclusion_groups;
create policy "exclusion_groups por empresa" on exclusion_groups
  for all to authenticated using (company_id = auth.uid()) with check (company_id = auth.uid());


-- ---------- VERIFICACIÓN (debería listar las 4 políticas creadas) ----------
-- select tablename, polname, cmd, qual, with_check
--   from pg_policies
--   where tablename in ('pricing_settings','company_settings','cost_variables','exclusion_groups')
--   order by tablename;

-- ============================================================
-- FIX RLS — quitar la dependencia de la tabla `users` (vacía)
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================
--
-- PROBLEMA: las policies del DUEÑO filtran con
--   company_id = (select users.company_id from users where users.id = auth.uid())
-- pero `users` está VACÍA → NULL → ninguna empresa ve sus datos.
--
-- SOLUCIÓN: identidad del dueño = company_id = auth.uid()
-- (companies.id = auth.uid(); y quote_requests.company_id referencia companies.id,
--  por lo que para el dueño quote_requests.company_id = auth.uid() — base de las
--  variantes anidadas de abajo).
--
-- NO se tocan: las policies del CONDUCTOR (usan `staff`, no `users`) ni el INSERT
-- anon de quote_requests.
--
-- COLUMNAS CONFIRMADAS POR DIAGNÓSTICO:
--   · CON company_id (5): clientes, company_settings, cost_variables, staff, vehicles
--   · SIN company_id (5):
--       - vía quote_request_id → quote_requests: service_assignments, service_logs,
--         quote_cost_overrides, vehicle_cost_snapshots
--       - vía service_assignment_id → service_assignments → quote_requests: service_incidents


-- ============================================================
-- PARTE 1 — Eliminar SOLO las policies del dueño que dependen de `users`
-- (las del conductor usan `staff` → no se tocan)
-- ============================================================
do $$
declare pol record;
begin
  for pol in
    select tablename, policyname from pg_policies
    where schemaname='public'
      and tablename in ('clientes','company_settings','cost_variables','staff','vehicles',
        'service_assignments','service_incidents','service_logs',
        'quote_cost_overrides','vehicle_cost_snapshots')
      and (coalesce(qual,'') ilike '%users%' or coalesce(with_check,'') ilike '%users%')
  loop
    raise notice 'DROP policy "%" on % (dependía de users)', pol.policyname, pol.tablename;
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;


-- ============================================================
-- PARTE 2 — Recrear la policy del DUEÑO con la condición correcta por tabla
-- ============================================================

-- 2a. DIRECTA (tienen company_id): clientes, staff, vehicles.
--     (company_settings y cost_variables NO se recrean aquí: ya tienen su policy
--      buena "company_settings por empresa" / "cost_variables por empresa" con
--      auth.uid(); la Parte 1 solo les quita la de `users` y deja la buena.)
drop policy if exists "owner por company_id" on clientes;
create policy "owner por company_id" on clientes for all to authenticated
  using (company_id = auth.uid()) with check (company_id = auth.uid());

drop policy if exists "owner por company_id" on staff;
create policy "owner por company_id" on staff for all to authenticated
  using (company_id = auth.uid()) with check (company_id = auth.uid());

drop policy if exists "owner por company_id" on vehicles;
create policy "owner por company_id" on vehicles for all to authenticated
  using (company_id = auth.uid()) with check (company_id = auth.uid());

-- 2b. ANIDADA vía quote_requests (tienen quote_request_id, no company_id):
--     service_assignments, service_logs, quote_cost_overrides, vehicle_cost_snapshots.
drop policy if exists "owner via quote_request" on service_assignments;
create policy "owner via quote_request" on service_assignments for all to authenticated
  using (quote_request_id in (select id from quote_requests where company_id = auth.uid()))
  with check (quote_request_id in (select id from quote_requests where company_id = auth.uid()));

drop policy if exists "owner via quote_request" on service_logs;
create policy "owner via quote_request" on service_logs for all to authenticated
  using (quote_request_id in (select id from quote_requests where company_id = auth.uid()))
  with check (quote_request_id in (select id from quote_requests where company_id = auth.uid()));

drop policy if exists "owner via quote_request" on quote_cost_overrides;
create policy "owner via quote_request" on quote_cost_overrides for all to authenticated
  using (quote_request_id in (select id from quote_requests where company_id = auth.uid()))
  with check (quote_request_id in (select id from quote_requests where company_id = auth.uid()));

drop policy if exists "owner via quote_request" on vehicle_cost_snapshots;
create policy "owner via quote_request" on vehicle_cost_snapshots for all to authenticated
  using (quote_request_id in (select id from quote_requests where company_id = auth.uid()))
  with check (quote_request_id in (select id from quote_requests where company_id = auth.uid()));

-- 2c. DOBLEMENTE ANIDADA: service_incidents (service_assignment_id → service_assignments
--     → quote_requests). Misma estructura que su policy "Gestor see company incidents",
--     pero con qr.company_id = auth.uid().
drop policy if exists "owner via assignment" on service_incidents;
create policy "owner via assignment" on service_incidents for all to authenticated
  using (
    service_assignment_id in (
      select sa.id from service_assignments sa
      where sa.quote_request_id in (select id from quote_requests where company_id = auth.uid())
    )
  )
  with check (
    service_assignment_id in (
      select sa.id from service_assignments sa
      where sa.quote_request_id in (select id from quote_requests where company_id = auth.uid())
    )
  );


-- ============================================================
-- PARTE 3 — companies: UPDATE/SELECT del dueño + cerrar exposición pública (HOLE 1)
-- ============================================================
-- 3a. Dueño lee/actualiza SU fila (id = auth.uid()).
--     (Si ya ejecutaste companies-owner-rls.sql, estas son redundantes e inofensivas;
--      el diagnóstico de policies lo mostrará. Renombradas para no colisionar.)
drop policy if exists "owner companies update" on companies;
create policy "owner companies update" on companies for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "owner companies select" on companies;
create policy "owner companies select" on companies for select to authenticated
  using (id = auth.uid());

-- 3b. HOLE 1 — "Empresas públicas legibles" (SELECT public qual=true) expone TODOS
--     los campos de TODAS las empresas. RLS no filtra columnas, pero los GRANTs sí:
--     limitamos a `anon` a leer SOLO columnas públicas. El form público sigue
--     funcionando (selecciona id/name/logo_url/color_primario y name/active); los
--     campos sensibles (email, phone, cif, address, notification_emails) dejan de ser
--     legibles por anon. No rompe el admin (authenticated conserva columnas completas).
revoke select on public.companies from anon;
grant select (id, slug, name, logo_url, color_primario, active) on public.companies to anon;

--     RESIDUAL (coordinar con cambio de código, NO incluido para no romper el admin):
--     "Empresas públicas legibles" sigue dejando que cualquier AUTENTICADO (otra
--     empresa) lea filas ajenas con columnas completas. Cierre completo:
--       (1) drop policy "Empresas públicas legibles" on companies;
--       (2) create policy "companies lectura pública anon" on companies
--             for select to anon using (true);            -- + el grant de columnas de 3b
--       (3) create policy "companies de su empresa (conductor)" on companies
--             for select to authenticated
--             using (id = (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid);
--       (4) admin: mover el listado de /admin a una ruta service-role (como
--             quotes-overview), o policy temporal por email.


-- ============================================================
-- PARTE 4 — admin_sessions: cerrar lectura abierta (HOLE 2)
-- ============================================================
-- "Usuarios autenticados pueden leer" (SELECT qual=true) deja a cualquier autenticado
-- leer TODAS las sesiones de impersonación. Acotar a las propias. (INSERT/DELETE no se
-- tocan; getCompanyIdServer filtra por admin_user_id=auth.uid(), el admin sigue leyendo
-- las suyas.)
drop policy if exists "Usuarios autenticados pueden leer" on admin_sessions;
create policy "admin_sessions solo propias" on admin_sessions for select to authenticated
  using (admin_user_id = auth.uid());


-- ============================================================
-- VERIFICACIÓN (ejecutar después)
-- ============================================================
-- (i) Ninguna policy debe referenciar ya `users` en las tablas objetivo:
-- select tablename, policyname, qual, with_check from pg_policies
-- where schemaname='public'
--   and tablename in ('clientes','company_settings','cost_variables','staff','vehicles',
--     'service_assignments','service_incidents','service_logs','quote_cost_overrides','vehicle_cost_snapshots')
--   and (qual ilike '%users%' or with_check ilike '%users%');   -- debe devolver 0 filas
-- (ii) Estado final de policies por tabla (debe verse: 1 owner + la del conductor donde aplique):
-- select tablename, policyname, cmd, roles from pg_policies
-- where schemaname='public' and tablename in (...) order by tablename, cmd;
-- (iii) anon ya NO lee columnas sensibles (debe fallar con anon key):
--       select email from companies limit 1;
-- (iv) Logueado como empresa: ver clientes, staff, vehicles, servicios, etc.

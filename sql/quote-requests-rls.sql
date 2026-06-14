-- ============================================================
-- quote_requests: cerrar el agujero de privacidad (anon NO debe poder leer)
-- Ejecutar en el SQL Editor de Supabase.  ⚠️ LEER LA NOTA DEL ADMIN ABAJO.
-- ============================================================
--
-- PROBLEMA: con la anon key se pueden LEER solicitudes de clientes (nombre,
-- email, teléfono, rutas) de TODAS las empresas. Se confirmó leyendo 9 filas
-- con la anon key. Causa: o RLS está desactivado, o hay una policy de SELECT
-- demasiado abierta (p.ej. `for select to public/anon using (true)`).
-- (El DIAGNÓSTICO de abajo lo confirma.)
--
-- ACCESO CORRECTO QUE DEJAMOS:
--   · anon (formulario público): INSERT sí, SELECT NO.
--   · empresa dueña: SELECT + UPDATE de SUS solicitudes (company_id = auth.uid()).
--   · conductor: SELECT de las de su empresa (company_id va en user_metadata del JWT).
--   · admin: vía service role (ignora RLS) → NO lleva policy (ver NOTA).

-- ---------- DIAGNÓSTICO (ejecútalo aparte ANTES, para ver el porqué) ----------
-- ¿RLS activado?
-- select relname, relrowsecurity as rls_on from pg_class where relname = 'quote_requests';
-- ¿Qué policies hay? (busca un SELECT a anon/public, o ausencia total de RLS)
-- select policyname, cmd, permissive, roles, qual, with_check
--   from pg_policies where tablename = 'quote_requests' order by cmd, policyname;

-- ---------- CORRECCIÓN ----------
-- Empezamos en limpio: se eliminan TODAS las policies actuales de quote_requests
-- (así no queda ninguna de SELECT abierta), y se recrean EXACTAMENTE las 4
-- necesarias. Tras esto, el estado final es inequívoco y revisable.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'quote_requests'
  loop
    execute format('drop policy %I on public.quote_requests', pol.policyname);
  end loop;
end $$;

alter table quote_requests enable row level security;

-- 1) anon: puede ENVIAR el formulario público (INSERT). SIN SELECT.
--    (Si algún usuario logueado tuviera que enviar el form público también,
--     cambiar `to anon` por `to anon, authenticated`. El INSERT no es el riesgo
--     de privacidad; el riesgo era el SELECT.)
create policy "quote_requests: alta pública (insert)" on quote_requests
  for insert to anon
  with check (true);

-- 2) empresa dueña: VER sus solicitudes (company_id = su propio id de auth).
create policy "quote_requests: empresa lee las suyas" on quote_requests
  for select to authenticated
  using (company_id = auth.uid());

-- 3) empresa dueña: ACTUALIZAR sus solicitudes (estado, vehículo, precio, notas).
create policy "quote_requests: empresa actualiza las suyas" on quote_requests
  for update to authenticated
  using (company_id = auth.uid())
  with check (company_id = auth.uid());

-- 4) conductor: VER las solicitudes de su empresa (su company va en user_metadata
--    del JWT, igual que el portal usa user.user_metadata.company_id).
create policy "quote_requests: conductor lee las de su empresa" on quote_requests
  for select to authenticated
  using (company_id = (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid);

-- ---------- VERIFICACIÓN ----------
-- Debe listar SOLO estas 4 policies; ninguna de SELECT para anon/public.
-- select policyname, cmd, roles, qual, with_check
--   from pg_policies where tablename = 'quote_requests' order by cmd, policyname;
--
-- Comprobación funcional sugerida:
--   · anon: enviar el formulario público → OK (insert).  Leer → 0 filas / bloqueado.
--   · empresa: panel muestra SUS solicitudes y puede cambiar estado/precio.
--   · conductor: ve en su portal las de su empresa.

-- ============================================================
-- NOTA — ADMIN (resuelto con la OPCIÓN A)
-- app/admin/page.tsx leía TODAS las quote_requests con el cliente del navegador
-- (rol authenticated del admin). Con estas policies eso deja de funcionar (el
-- admin no es dueño ni tiene user_metadata.company_id) — A PROPÓSITO.
-- La lectura global del panel admin se ha movido a la ruta
--   /api/admin/quotes-overview  (usa SUPABASE_SERVICE_ROLE_KEY, ignora RLS),
-- así que el admin NO necesita policy aquí. Por eso este SQL NO incluye ninguna
-- policy para el admin.
-- IMPORTANTE: desplegar ese cambio de código ANTES o JUNTO con ejecutar este SQL,
-- o los KPIs/gráfico del panel admin se quedarán sin datos hasta el deploy.
-- ============================================================

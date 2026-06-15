-- =============================================================================
-- sql/rls-companies-tenant-isolation.sql   (TANDA 1 — seguridad)
-- Cierre del residual de `companies` (HOLE 1): aislamiento entre empresas.
--
-- PROBLEMA: la policy "Empresas públicas legibles" (SELECT, qual = true, rol public)
-- deja que CUALQUIER usuario AUTENTICADO (otra empresa) lea filas de empresas ajenas
-- con TODAS las columnas (email, cif, phone, address, notification_emails...). El
-- revoke/grant de la tanda anterior (Parte 3b) solo limitó a `anon`.
--
-- RESULTADO TRAS ESTE SCRIPT — policies SELECT en companies:
--   · Dueño (authenticated)      → su fila      (id = auth.uid())                  [ya existe]
--   · Conductor (authenticated)  → su empresa   (id = user_metadata.company_id)
--   · Superadmin (authenticated) → TODAS         (app_metadata.role = 'superadmin')
--   · anon                       → todas las filas, SOLO columnas públicas (grant 3b)
--   · service role               → ignora RLS (rutas /api/admin/*)                [intacto]
-- Una empresa normal deja de poder leer filas ajenas. El panel admin Y la impersonación
-- siguen funcionando SIN cambios de código, porque el admin se identifica por ROLE en el
-- JWT (no por email) — el código puede seguir usando email en esta tanda.
--
-- ⚠️ PRE-REQUISITO IMPRESCINDIBLE (paso (a) del orden): tu usuario admin debe tener ya
--    app_metadata.role = 'superadmin' Y haber re-logueado para que su JWT lo lleve. Si
--    ejecutas este DROP sin eso, te quedas sin leer companies como admin. Verifica el
--    JWT (ver snippet del navegador) ANTES de ejecutar este bloque.
--
-- PRE-REQUISITOS ya aplicados en tandas anteriores (este script NO los repite):
--   · "companies: dueno lee su fila"      (select, id = auth.uid())  [companies-owner-rls.sql]
--   · "companies: dueno actualiza su fila" (update, id = auth.uid())
--   · revoke select on companies from anon;
--     grant select (id, slug, name, logo_url, color_primario, active) on companies to anon; [3b]
-- =============================================================================

begin;

-- (1) Cerrar el agujero: lectura pública con qual = true (rol public ⇒ incluye authenticated).
drop policy if exists "Empresas públicas legibles" on public.companies;

-- (2) Lectura pública SOLO para anon (formulario white-label /[slug] y QuoteForm).
--     El grant de columnas de la Parte 3b limita a anon a columnas públicas, así que
--     aunque el USING sea (true), anon NO puede leer email/cif/phone/address.
drop policy if exists "companies lectura publica anon" on public.companies;
create policy "companies lectura publica anon" on public.companies
  for select to anon
  using (true);

-- (3) Conductor: lee su empresa vía user_metadata.company_id del JWT
--     (app/conductor/* hace companies.eq(id, user_metadata.company_id)).
--     NOTA (pasada futura): user_metadata es modificable por el propio usuario; este
--     company_id debería migrar a app_metadata para robustez. Fuera del alcance de hoy.
drop policy if exists "companies de su empresa (conductor)" on public.companies;
create policy "companies de su empresa (conductor)" on public.companies
  for select to authenticated
  using (id = (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid);

-- (4) Superadmin POR ROLE: lee TODAS las empresas (panel /admin + impersonación).
--     app_metadata SOLO lo cambia el service-role → seguro para autorización (§1.8).
--     El email puede cambiar libremente sin tocar esta policy.
drop policy if exists "companies superadmin lee todas" on public.companies;
create policy "companies superadmin lee todas" on public.companies
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

commit;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN (ejecutar aparte tras el commit, en el SQL Editor):
--   select policyname, roles, cmd, qual
--     from pg_policies where tablename = 'companies' order by cmd, policyname;
-- SELECT debe mostrar: dueno lee su fila · conductor · anon · superadmin.
-- NO debe aparecer "Empresas públicas legibles".
--
-- PRUEBA cross-tenant: NO se puede comprobar desde el SQL Editor (corre como service
-- role y ve todo). Hazlo en la app, logueado como una EMPRESA NORMAL (no admin): su
-- dashboard debe seguir funcionando (lee su propia empresa) y no debe poder leer otras.
--
-- ROLLBACK de emergencia (si el admin se quedara sin acceso por algún motivo):
--   create policy "Empresas públicas legibles" on public.companies for select using (true);
-- (reabre temporalmente la lectura; reaplica este script cuando el JWT del admin tenga el role).
-- -----------------------------------------------------------------------------

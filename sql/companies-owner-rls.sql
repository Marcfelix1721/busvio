-- ============================================================
-- companies: policy de UPDATE/SELECT para el DUEÑO de su propia fila
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================
--
-- CAUSA DEL BUCLE DEL ONBOARDING: companies tiene RLS ACTIVADO pero sin policy
-- de UPDATE para el dueño. El wizard escribe onboarding_completado=true con la
-- sesión de la empresa → el UPDATE no falla pero afecta 0 filas → el dashboard
-- lo sigue viendo incompleto → vuelve a mostrar el wizard → bucle.
--
-- COEXISTENCIA (NO se elimina ni se toca ninguna policy existente):
--   · Lectura pública anon por slug (formulario público)      → intacta
--   · Lectura del portal del conductor                        → intacta
--   · Lectura/gestión del admin (vía API con service role)    → intacta (ignora RLS)
-- Solo AÑADIMOS dos policies permisivas con nombres propios. En Postgres las
-- policies permisivas se combinan con OR por comando, así que esto SOLO SUMA
-- acceso para el dueño; no restringe a nadie.
--
-- NO tocamos 'enable row level security' a propósito: ya está activado (que el
-- UPDATE del dueño afecte 0 filas es la prueba). Así evitamos cualquier riesgo
-- de romper la lectura anon/conductor/admin si estuviera, por lo que sea, en
-- otro estado.

-- ---------- DIAGNÓSTICO (ejecútalo aparte ANTES para ver lo que ya hay) ----------
-- select policyname, cmd, permissive, roles, qual, with_check
--   from pg_policies where tablename = 'companies' order by cmd, policyname;

-- ---------- CORRECCIÓN (solo AÑADE; idempotente por nombre propio) ----------

-- El dueño (companies.id = auth.uid()) puede ACTUALIZAR su propia fila
-- (onboarding_completado, last_login, datos de empresa, color, logo, etc.).
drop policy if exists "companies: dueno actualiza su fila" on companies;
create policy "companies: dueno actualiza su fila" on companies
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- El dueño puede LEER su propia fila (defensivo y acotado; la lectura ya
-- funcionaba vía otra policy, esto no la sustituye, solo la complementa).
drop policy if exists "companies: dueno lee su fila" on companies;
create policy "companies: dueno lee su fila" on companies
  for select to authenticated
  using (id = auth.uid());

-- ---------- VERIFICACIÓN (deberías ver las 2 policies nuevas + las que ya había) ----------
-- select policyname, cmd, permissive, roles, qual, with_check
--   from pg_policies where tablename = 'companies' order by cmd, policyname;


-- ============================================================
-- DEFENSIVO (pre-aprobado): que 'active' no dependa de un default frágil.
-- Solo toca NULLs → NO reactiva empresas desactivadas por el admin (active=false).
-- ============================================================
alter table companies alter column active set default true;
update companies set active = true where active is null;

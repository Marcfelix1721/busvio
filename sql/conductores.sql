-- Gestión de conductores (tabla staff) — ejecutar en el SQL Editor de Supabase

-- 1. Estados nuevos del panel (se mantiene 'activo' por compatibilidad)
alter table staff drop constraint if exists staff_estado_check;
alter table staff add constraint staff_estado_check
  check (estado in ('disponible','en_servicio','descanso','vacaciones','baja','activo'));

-- 2. Columnas adicionales de la ficha del conductor
alter table staff add column if not exists email text;
alter table staff add column if not exists photo_url text;
alter table staff add column if not exists fecha_nacimiento date;
alter table staff add column if not exists direccion text;
alter table staff add column if not exists contacto_emergencia_nombre text;
alter table staff add column if not exists contacto_emergencia_telefono text;
alter table staff add column if not exists fecha_alta date;
alter table staff add column if not exists tipo_contrato text;
alter table staff add column if not exists salario numeric;
alter table staff add column if not exists horas_max_semanales numeric;
alter table staff add column if not exists notas_internas text;

-- 3. Documentos del conductor
create table if not exists staff_documentos (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  company_id uuid not null,
  tipo text not null,
  nombre text,
  archivo_url text,
  fecha_emision date,
  fecha_vencimiento date,
  notas text,
  created_at timestamptz not null default now()
);
create index if not exists staff_documentos_staff_idx on staff_documentos(staff_id);

alter table staff_documentos enable row level security;
drop policy if exists "staff_documentos por empresa" on staff_documentos;
create policy "staff_documentos por empresa" on staff_documentos
  for all to authenticated
  using (company_id = auth.uid()) with check (company_id = auth.uid());

-- 4. Buckets de Storage (foto pública, documentos privados)
insert into storage.buckets (id, name, public) values ('driver-photos','driver-photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('driver-documents','driver-documents', false)
  on conflict (id) do nothing;

drop policy if exists "driver photos rw" on storage.objects;
create policy "driver photos rw" on storage.objects for all to authenticated
  using (bucket_id = 'driver-photos') with check (bucket_id = 'driver-photos');

drop policy if exists "driver documents rw" on storage.objects;
create policy "driver documents rw" on storage.objects for all to authenticated
  using (bucket_id = 'driver-documents') with check (bucket_id = 'driver-documents');

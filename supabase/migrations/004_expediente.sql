-- Expediente digital — fuente única de verdad estructurada
-- Idempotente: se puede ejecutar varias veces sin error

create table if not exists public.expedientes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  data jsonb not null default '{}',
  version integer not null default 1,
  completitud_score integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_expedientes_user on public.expedientes(user_id);

alter table public.expedientes enable row level security;

drop policy if exists "Users can view own expediente" on public.expedientes;
create policy "Users can view own expediente" on public.expedientes
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own expediente" on public.expedientes;
create policy "Users can insert own expediente" on public.expedientes
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own expediente" on public.expedientes;
create policy "Users can update own expediente" on public.expedientes
  for update using (auth.uid() = user_id);

drop trigger if exists expedientes_updated_at on public.expedientes;
create trigger expedientes_updated_at before update on public.expedientes
  for each row execute function public.update_updated_at();

comment on column public.documents.document_type is
  'vida_laboral|bases_cotizacion|simulacion_jubilacion|resolucion_inss|certificado_empresa|nomina|prestacion_desempleo|resolucion_sepe|subsidio|convenio_especial|incapacidad_temporal|incapacidad_permanente|vida_laboral_internacional|certificado_europeo|declaracion_fiscal|otro';

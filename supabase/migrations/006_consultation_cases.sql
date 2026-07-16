-- Consultas de fundador: simular expediente de terceros sin cobrar
create table if not exists public.consultation_cases (
  id uuid primary key default uuid_generate_v4(),
  founder_id uuid not null references public.profiles(id) on delete cascade,
  client_name text not null,
  client_note text,
  expediente_data jsonb not null default '{}',
  life_path jsonb not null default '{
    "currentlyUnemployed": false,
    "subsidioMayores52From": "2099-01",
    "subsidioCotizacionBase": null,
    "desempleoBaseAntesSubsidio": 0
  }'::jsonb,
  completitud_score integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_consultation_cases_founder on public.consultation_cases(founder_id);

alter table public.consultation_cases enable row level security;

drop policy if exists "Founders manage own consultations" on public.consultation_cases;
create policy "Founders manage own consultations" on public.consultation_cases
  for all using (auth.uid() = founder_id);

drop trigger if exists consultation_cases_updated_at on public.consultation_cases;
create trigger consultation_cases_updated_at before update on public.consultation_cases
  for each row execute function public.update_updated_at();

alter table public.documents
  add column if not exists consultation_case_id uuid references public.consultation_cases(id) on delete cascade;

create index if not exists idx_documents_consultation on public.documents(consultation_case_id);

comment on table public.consultation_cases is
  'Expedientes de terceros gestionados por el fundador (asesoría gratuita).';

-- ============================================================
-- PLANMIJUBILACION — Schema inicial
-- ============================================================

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLA: profiles (extiende auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  phone text,
  locale text default 'es',
  stripe_customer_id text,
  subscription_status text default 'free', -- free | premium | cancelled
  subscription_plan_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLA: documents (documentos subidos por el usuario)
-- ============================================================
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_path text not null, -- ruta en Supabase Storage
  document_type text, -- 'vida_laboral' | 'bases' | 'nomina' | 'resolucion' | 'otro'
  ocr_status text default 'pending', -- pending | processing | completed | failed
  ocr_data jsonb, -- datos extraídos por OCR
  ocr_confidence numeric(3,2), -- 0.00 - 1.00
  ocr_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_documents_user on public.documents(user_id);
create index idx_documents_ocr_status on public.documents(ocr_status);

-- ============================================================
-- TABLA: extracted_data (datos consolidados del usuario)
-- ============================================================
create table public.extracted_data (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  -- Datos personales
  full_name text,
  birth_date date,
  age integer,
  -- Datos laborales
  current_company text,
  regimen text, -- 'general' | 'autonomos' | 'agrario' | 'hogar'
  grupo_cotizacion text,
  currently_working boolean,
  is_self_employed boolean,
  -- Datos económicos
  annual_salary numeric(10,2),
  monthly_base numeric(10,2),
  bases_last_24_months numeric(10,2)[], -- array de 24 bases
  -- Cotización
  years_contributed integer,
  months_contributed integer,
  -- Lagunas
  gaps jsonb, -- [{ "from": "2012-03", "to": "2012-08", "months": 6 }]
  -- Convenios
  special_agreements jsonb,
  -- Metadata
  sources text[], -- nombres de documentos procesados
  confidence numeric(3,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLA: scenarios (escenarios calculados)
-- ============================================================
create table public.scenarios (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  scenario_type text not null, -- 'today' | '6m' | '1y' | 'ordinary' | 'convenio' | 'paro' | 'delayed'
  retirement_age numeric(4,2) not null,
  monthly_pension numeric(10,2) not null,
  total_lifetime numeric(12,2) not null,
  is_recommended boolean default false,
  metadata jsonb,
  created_at timestamptz default now()
);

create index idx_scenarios_user on public.scenarios(user_id);

-- ============================================================
-- TABLA: chat_messages (historial del chat IA)
-- ============================================================
create table public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb, -- tokens usados, modelo, etc.
  created_at timestamptz default now()
);

create index idx_chat_user on public.chat_messages(user_id, created_at desc);

-- ============================================================
-- TABLA: alerts (alertas personalizadas)
-- ============================================================
create table public.alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, -- 'opportunity' | 'warning' | 'info' | 'gap'
  title text not null,
  description text,
  metadata jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index idx_alerts_user on public.alerts(user_id, is_read);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.extracted_data enable row level security;
alter table public.scenarios enable row level security;
alter table public.chat_messages enable row level security;
alter table public.alerts enable row level security;

-- Políticas: cada usuario solo ve sus propios datos
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can view own documents" on public.documents
  for select using (auth.uid() = user_id);

create policy "Users can insert own documents" on public.documents
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own documents" on public.documents
  for delete using (auth.uid() = user_id);

create policy "Users can view own extracted data" on public.extracted_data
  for select using (auth.uid() = user_id);

create policy "Users can upsert own extracted data" on public.extracted_data
  for insert with check (auth.uid() = user_id);

create policy "Users can update own extracted data" on public.extracted_data
  for update using (auth.uid() = user_id);

create policy "Users can view own scenarios" on public.scenarios
  for select using (auth.uid() = user_id);

create policy "Users can insert own scenarios" on public.scenarios
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own scenarios" on public.scenarios
  for delete using (auth.uid() = user_id);

create policy "Users can view own chat" on public.chat_messages
  for select using (auth.uid() = user_id);

create policy "Users can insert own chat" on public.chat_messages
  for insert with check (auth.uid() = user_id);

create policy "Users can view own alerts" on public.alerts
  for select using (auth.uid() = user_id);

create policy "Users can update own alerts" on public.alerts
  for update using (auth.uid() = user_id);

-- ============================================================
-- FUNCIONES AUXILIARES
-- ============================================================

-- Auto-crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Actualizar updated_at automáticamente
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger documents_updated_at before update on public.documents
  for each row execute function public.update_updated_at();

create trigger extracted_data_updated_at before update on public.extracted_data
  for each row execute function public.update_updated_at();
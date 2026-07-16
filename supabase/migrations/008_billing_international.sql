-- Precios configurables, pedidos de servicio y documentos de facturación

create table if not exists public.pricing_rules (
  service_key text primary key,
  label text not null,
  description text not null default '',
  price_cents integer not null,
  currency text not null default 'eur',
  discount_mode text not null default 'full' check (discount_mode in ('free', 'reduced', 'full')),
  active boolean not null default true,
  metadata jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table if not exists public.document_sequences (
  prefix text not null,
  year integer not null,
  last_number integer not null default 0,
  primary key (prefix, year)
);

create table if not exists public.service_orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_key text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  amount_cents integer not null,
  discount_mode text not null default 'full',
  stripe_session_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz default now(),
  paid_at timestamptz
);

create index if not exists idx_service_orders_user on public.service_orders(user_id);

create table if not exists public.billing_documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.service_orders(id) on delete set null,
  doc_type text not null check (doc_type in ('invoice', 'receipt', 'report_cover')),
  doc_number text not null unique,
  payload jsonb not null,
  html_snapshot text,
  created_at timestamptz default now()
);

create index if not exists idx_billing_documents_user on public.billing_documents(user_id);

alter table public.pricing_rules enable row level security;
alter table public.service_orders enable row level security;
alter table public.billing_documents enable row level security;

drop policy if exists "Pricing rules readable by authenticated" on public.pricing_rules;
create policy "Pricing rules readable by authenticated" on public.pricing_rules
  for select using (auth.role() = 'authenticated');

drop policy if exists "Users read own orders" on public.service_orders;
create policy "Users read own orders" on public.service_orders
  for select using (auth.uid() = user_id);

drop policy if exists "Users read own billing docs" on public.billing_documents;
create policy "Users read own billing docs" on public.billing_documents
  for select using (auth.uid() = user_id);

-- Precios iniciales (modificables en Supabase sin redeploy)
insert into public.pricing_rules (service_key, label, description, price_cents, discount_mode) values
  ('informe_estandar', 'Informe estándar', 'Informe personalizado de planificación de jubilación (nacional).', 2990, 'full'),
  ('informe_internacional', 'Informe internacional', 'Análisis con cotizaciones en varios países.', 4990, 'full'),
  ('informe_premium', 'Informe premium', 'Simulaciones múltiples y recomendaciones ampliadas.', 7990, 'full'),
  ('revision_internacional', 'Revisión internacional de jubilación', 'Estudio exclusivo multi-país con revisión documental.', 4990, 'full')
on conflict (service_key) do update set
  label = excluded.label,
  description = excluded.description,
  price_cents = excluded.price_cents,
  updated_at = now();

comment on table public.pricing_rules is 'Tarifas de informes y consultas — editable sin cambiar código.';

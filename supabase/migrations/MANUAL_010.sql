-- Ejecutar en Supabase SQL Editor si db:push falla.
-- Equivalente a 010_contact_submissions.sql

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  consent_privacy boolean not null default false,
  status text not null default 'new'
    check (status in ('new', 'read', 'replied', 'archived')),
  ip_hash text,
  user_agent text,
  attachments jsonb not null default '[]'::jsonb
);

create index if not exists contact_submissions_created_at_idx
  on public.contact_submissions (created_at desc);

create index if not exists contact_submissions_status_idx
  on public.contact_submissions (status);

alter table public.contact_submissions enable row level security;

drop policy if exists "No public select contact" on public.contact_submissions;
create policy "No public select contact" on public.contact_submissions
  for select using (false);

drop policy if exists "No public insert contact" on public.contact_submissions;
create policy "No public insert contact" on public.contact_submissions
  for insert with check (false);

drop policy if exists "No public update contact" on public.contact_submissions;
create policy "No public update contact" on public.contact_submissions
  for update using (false);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contact-encrypted',
  'contact-encrypted',
  false,
  15728640,
  array['application/octet-stream']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- Ejecutar en Supabase SQL Editor si db:push falla
alter table public.consultation_cases
  add column if not exists client_birth_date date;

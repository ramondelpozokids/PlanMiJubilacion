-- Fecha de nacimiento en consultas de asesoría
alter table public.consultation_cases
  add column if not exists client_birth_date date;

comment on column public.consultation_cases.client_birth_date is
  'Fecha de nacimiento del cliente (amigo/familiar) para cálculo de jubilación';

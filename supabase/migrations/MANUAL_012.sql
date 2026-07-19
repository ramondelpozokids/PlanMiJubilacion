-- MANUAL: ejecutar en Supabase SQL Editor si la migración 012 no se aplica sola.
-- Vincula facturas / pedidos a consultas de familiares-amigos

alter table public.billing_documents
  add column if not exists consultation_case_id uuid
  references public.consultation_cases(id) on delete set null;

create index if not exists idx_billing_docs_consultation
  on public.billing_documents(consultation_case_id);

alter table public.service_orders
  add column if not exists consultation_case_id uuid
  references public.consultation_cases(id) on delete set null;

create index if not exists idx_service_orders_consultation
  on public.service_orders(consultation_case_id);

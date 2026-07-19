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

comment on column public.billing_documents.consultation_case_id is
  'Consulta (familiar/amigo) a la que pertenece esta factura/recibo/portada';
comment on column public.service_orders.consultation_case_id is
  'Consulta asociada al cobro del informe';

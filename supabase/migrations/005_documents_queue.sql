-- SIP Fase 2: idempotencia y cola documental
alter table public.documents
  add column if not exists content_hash text,
  add column if not exists processing_attempts integer default 0,
  add column if not exists processed_at timestamptz;

create index if not exists idx_documents_content_hash
  on public.documents(user_id, content_hash);

comment on column public.documents.content_hash is
  'SHA-256 del binario — evita re-OCR idéntico';
comment on column public.documents.processing_attempts is
  'Intentos de procesamiento (cola)';
comment on column public.documents.processed_at is
  'Última vez completado OCR';

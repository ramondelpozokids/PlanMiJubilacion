-- Los updates de ocr_status fallaban en silencio → documentos atascados en "processing"
-- Idempotente: se puede ejecutar varias veces sin error
drop policy if exists "Users can update own documents" on public.documents;

create policy "Users can update own documents" on public.documents
  for update using (auth.uid() = user_id);

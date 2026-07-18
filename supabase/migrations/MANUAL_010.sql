-- Ejecutar en SQL Editor si db:push no conecta
drop policy if exists "Users delete own billing docs" on public.billing_documents;
create policy "Users delete own billing docs" on public.billing_documents
  for delete using (auth.uid() = user_id);

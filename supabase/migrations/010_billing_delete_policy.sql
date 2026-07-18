-- Borrado de documentos de facturación propios (historial Facturas / Recibos)
drop policy if exists "Users delete own billing docs" on public.billing_documents;
create policy "Users delete own billing docs" on public.billing_documents
  for delete using (auth.uid() = user_id);

comment on policy "Users delete own billing docs" on public.billing_documents is
  'El usuario puede borrar sus facturas, recibos y portadas del historial';

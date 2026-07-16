-- Políticas de escritura + numeración correlativa atómica
-- Ejecutar en SQL Editor si db:push no conecta

create or replace function public.next_document_number(p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  if p_prefix not in ('FAC', 'REC', 'INF') then
    raise exception 'Prefijo inválido: %', p_prefix;
  end if;

  insert into public.document_sequences (prefix, year, last_number)
  values (p_prefix, y, 1)
  on conflict (prefix, year) do update
    set last_number = public.document_sequences.last_number + 1
  returning last_number into n;

  return p_prefix || '-' || y::text || '-' || lpad(n::text, 6, '0');
end;
$$;

grant execute on function public.next_document_number(text) to authenticated;
grant execute on function public.next_document_number(text) to service_role;

drop policy if exists "Users insert own orders" on public.service_orders;
create policy "Users insert own orders" on public.service_orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own orders" on public.service_orders;
create policy "Users update own orders" on public.service_orders
  for update using (auth.uid() = user_id);

drop policy if exists "Users insert own billing docs" on public.billing_documents;
create policy "Users insert own billing docs" on public.billing_documents
  for insert with check (auth.uid() = user_id);

comment on function public.next_document_number is
  'Numeración correlativa FAC/REC/INF-YYYY-NNNNNN';

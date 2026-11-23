-- Deixa a pasta "Demonstrativo de pagamento" visível apenas para o login admin.
-- Execute uma vez no Supabase: SQL Editor > New query > Run.

drop policy if exists "Usuarios logados leem documentos" on public.documentos;
create policy "Usuarios logados leem documentos"
  on public.documentos for select
  to authenticated
  using (
    categoria <> 'transicao-demonstrativo-de-pagamento'
    or split_part(auth.jwt() ->> 'email', '@', 1) = 'admin'
  );

drop policy if exists "Usuarios logados leem arquivos" on storage.objects;
create policy "Usuarios logados leem arquivos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documentos'
    and (
      split_part(name, '/', 1) <> 'transicao-demonstrativo-de-pagamento'
      or split_part(auth.jwt() ->> 'email', '@', 1) = 'admin'
    )
  );

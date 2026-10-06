-- Execute este arquivo uma vez no Supabase: SQL Editor > New query > Run.

-- Lista dos documentos exibidos no site.
create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  caminho text not null, -- caminho do arquivo dentro do bucket "documentos"
  categoria text not null, -- slug da categoria (ver lib/categorias.ts)
  criado_em timestamptz not null default now()
);

alter table public.documentos enable row level security;

-- Apenas usuários logados podem ler; ninguém altera pelo site.
drop policy if exists "Usuarios logados leem documentos" on public.documentos;
create policy "Usuarios logados leem documentos"
  on public.documentos for select
  to authenticated
  using (true);

-- Bucket privado onde ficam os arquivos.
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists "Usuarios logados leem arquivos" on storage.objects;
create policy "Usuarios logados leem arquivos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documentos');

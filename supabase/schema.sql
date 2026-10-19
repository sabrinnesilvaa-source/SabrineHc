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

-- Almoxarifado: itens e movimentações (entrada, saída e ajuste de inventário).
-- O saldo de cada item é a soma dos movimentos; nada é apagado, o estorno
-- lança um movimento inverso.
create table if not exists public.almox_itens (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null,
  unidade text not null default 'UN',
  minimo numeric not null default 0,
  local text,
  criado_em timestamptz not null default now()
);

create table if not exists public.almox_movimentos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.almox_itens (id),
  tipo text not null check (tipo in ('entrada', 'saida', 'ajuste')),
  qtd numeric not null, -- no ajuste vem com sinal (+ sobra, − falta)
  data date not null default current_date,
  origem_destino text, -- fornecedor/NF na entrada, setor na saída
  retirado_por text,
  obs text,
  estorno_de uuid references public.almox_movimentos (id),
  estornado boolean not null default false,
  motivo_estorno text,
  registrado_por text not null, -- nome de quem lançou (usuário logado)
  registrado_email text not null,
  criado_em timestamptz not null default now()
);

alter table public.almox_itens enable row level security;
alter table public.almox_movimentos enable row level security;

drop policy if exists "Logados usam itens" on public.almox_itens;
create policy "Logados usam itens"
  on public.almox_itens for all
  to authenticated
  using (true) with check (true);

-- Movimentos: lê, inclui e marca estorno; nunca apaga.
drop policy if exists "Logados leem movimentos" on public.almox_movimentos;
create policy "Logados leem movimentos"
  on public.almox_movimentos for select to authenticated using (true);
drop policy if exists "Logados incluem movimentos" on public.almox_movimentos;
create policy "Logados incluem movimentos"
  on public.almox_movimentos for insert to authenticated with check (true);
drop policy if exists "Logados marcam estorno" on public.almox_movimentos;
create policy "Logados marcam estorno"
  on public.almox_movimentos for update to authenticated using (true) with check (true);

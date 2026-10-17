-- ============================================================================
-- Script SQL — Banco de Dados Supabase para o App Blueprint
-- Projeto Supabase: blueprint-app (Ref: jjnubvilupxybafkasuh | Região: sa-east-1)
-- ============================================================================

create table if not exists public.blueprint_actions (
  id uuid default gen_random_uuid() primary key,
  usuario text not null default 'Nilton',
  categoria text not null,
  criado_em timestamp with time zone default now()
);

-- Ativa Row Level Security (RLS)
alter table public.blueprint_actions enable row level security;

-- Políticas de acesso para o MVP (permite leitura e inserção via chave anon no app)
create policy "Permitir insercao de acoes no Blueprint"
  on public.blueprint_actions
  for insert
  with check (true);

create policy "Permitir leitura de acoes no Blueprint"
  on public.blueprint_actions
  for select
  using (true);

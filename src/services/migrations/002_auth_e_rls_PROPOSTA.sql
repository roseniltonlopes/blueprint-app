-- ============================================================================
-- PROPOSTA DE MIGRAÇÃO 002: autenticação, perfis e RLS por usuário
-- Projeto: blueprint-app (Supabase, sa-east-1)
--
-- STATUS: NÃO APLICADA e NÃO TESTADA no banco real.
-- Revise e teste primeiro em um projeto de desenvolvimento.
--
-- PRÉ-REQUISITO: login com Supabase Auth ativo no app (Fase 4).
-- Depois de aplicar, requisições com a chave anon e sem sessão perdem acesso
-- à tabela blueprint_actions. Linhas antigas (sem user_id) ficam invisíveis.
-- ============================================================================

begin;

-- 1. Perfis (preferências do usuário) -----------------------------------------
create table if not exists public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text,
  fuso        text        not null default 'America/Sao_Paulo',
  tema        text        not null default 'auto'
                check (tema in ('claro', 'escuro', 'auto')),
  destaque    text        not null default 'gradiente'
                check (destaque in ('gradiente', 'laranja', 'indigo')),
  meta_diaria smallint    not null default 5
                check (meta_diaria between 1 and 20),
  criado_em   timestamptz not null default now()
);

alter table public.perfis enable row level security;

create policy "perfis_select_proprio" on public.perfis
  for select to authenticated
  using (id = (select auth.uid()));

create policy "perfis_insert_proprio" on public.perfis
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "perfis_update_proprio" on public.perfis
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- 2. Ações: dono e nome livre da categoria "Outro" -------------------------------
alter table public.blueprint_actions
  add column if not exists user_id uuid
    references auth.users (id) on delete cascade
    default auth.uid(),
  add column if not exists rotulo text;

-- "not valid": valida apenas linhas novas, sem falhar por dados antigos.
alter table public.blueprint_actions
  add constraint blueprint_actions_categoria_valida
  check (categoria in ('Hidratação', 'Exercício', 'Descanso', 'Estudo', 'Outro'))
  not valid;

alter table public.blueprint_actions
  add constraint blueprint_actions_rotulo_valido
  check (
    (categoria = 'Outro' and rotulo is not null and char_length(btrim(rotulo)) between 1 and 40)
    or (categoria <> 'Outro' and rotulo is null)
  )
  not valid;

-- 3. Troca das policies abertas por policies por usuário -------------------------
drop policy if exists "Permitir insercao de acoes no Blueprint" on public.blueprint_actions;
drop policy if exists "Permitir leitura de acoes no Blueprint"  on public.blueprint_actions;

create policy "acoes_select_proprias" on public.blueprint_actions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "acoes_insert_proprias" on public.blueprint_actions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Necessária para o "Desfazer": só ações do próprio usuário e recentes.
create policy "acoes_delete_recentes_proprias" on public.blueprint_actions
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and criado_em > now() - interval '5 minutes'
  );

-- 4. Índice para calendário, histórico e mapa de calor ----------------------------
create index if not exists blueprint_actions_user_data_idx
  on public.blueprint_actions (user_id, criado_em desc);

commit;

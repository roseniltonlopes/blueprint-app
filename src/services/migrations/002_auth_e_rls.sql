-- ============================================================================
-- MIGRAÇÃO 002: autenticação, perfis e RLS por usuário
-- Projeto: blueprint-app (Supabase, sa-east-1)
--
-- STATUS: revisada na Etapa 7, NÃO APLICADA.
-- Rode primeiro em um projeto de DESENVOLVIMENTO (SQL Editor do painel).
--
-- O que muda em relação à proposta original (docs/02):
--  * categoria guarda o id estável usado pelo app ('hidratacao', 'outro'...),
--    não o nome de exibição com acento;
--  * GRANTs explícitos: tabelas novas em public deixam de ser expostas à API
--    automaticamente (changelog Supabase, 2026-04-28; vale para todos em 2026-10-30);
--  * "anon" perde todo acesso a blueprint_actions (antes lia e gravava tudo);
--  * coluna usuario deixa de ser obrigatória (o default 'Nilton' saiu);
--  * recebido_em (hora do servidor) controla a janela de 5 minutos do Desfazer,
--    em vez de criado_em, que vem do aparelho e pode estar adiantado;
--  * perfil criado por trigger no cadastro, com fuso validado, porque com
--    confirmação de e-mail ligada o app ainda não tem sessão para inserir;
--  * tema usa os mesmos valores do app ('light', 'dark', 'system').
--
-- Depois de aplicar: requisições sem login não enxergam mais nenhuma ação.
-- Linhas antigas (sem user_id) ficam invisíveis; veja o item 6.
-- ============================================================================

begin;

-- 0. Esquema privado para funções internas (fora da Data API) -----------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- 1. Perfis ----------------------------------------------------------------------
create table if not exists public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text check (nome is null or char_length(nome) between 1 and 80),
  fuso        text        not null default 'America/Sao_Paulo'
                check (char_length(fuso) between 1 and 64),
  tema        text        not null default 'system'
                check (tema in ('light', 'dark', 'system')),
  destaque    text        not null default 'gradiente'
                check (destaque in ('gradiente', 'laranja', 'indigo')),
  meta_diaria smallint    not null default 5
                check (meta_diaria between 1 and 20),
  criado_em   timestamptz not null default now()
);

alter table public.perfis enable row level security;

revoke all on table public.perfis from anon, authenticated;
grant select, insert, update on table public.perfis to authenticated;

create policy "perfis_select_proprio" on public.perfis
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "perfis_insert_proprio" on public.perfis
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "perfis_update_proprio" on public.perfis
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Cria o perfil no cadastro. Nome e fuso vêm do user_metadata (editável pelo
-- usuário): servem só para exibição, nunca para autorização.
create or replace function private.criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text := left(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), 80);
  v_fuso text := nullif(btrim(new.raw_user_meta_data ->> 'fuso'), '');
begin
  if v_fuso is null
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = v_fuso) then
    v_fuso := 'America/Sao_Paulo';
  end if;

  insert into public.perfis (id, nome, fuso)
  values (new.id, v_nome, v_fuso)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.criar_perfil_para_novo_usuario() from public, anon, authenticated;

drop trigger if exists ao_criar_usuario_criar_perfil on auth.users;
create trigger ao_criar_usuario_criar_perfil
  after insert on auth.users
  for each row execute function private.criar_perfil_para_novo_usuario();

-- 2. Ações: dono, nome livre do "Outro" e hora de chegada no servidor ----------
alter table public.blueprint_actions
  add column if not exists user_id uuid
    references auth.users (id) on delete cascade
    default auth.uid(),
  add column if not exists rotulo text,
  add column if not exists recebido_em timestamptz not null default now();

alter table public.blueprint_actions
  alter column usuario drop not null,
  alter column usuario drop default;

update public.blueprint_actions set criado_em = now() where criado_em is null;
alter table public.blueprint_actions alter column criado_em set not null;

-- "not valid": valida só as linhas novas, sem falhar por dados de teste antigos.
alter table public.blueprint_actions
  add constraint blueprint_actions_dono_obrigatorio
  check (user_id is not null)
  not valid;

alter table public.blueprint_actions
  add constraint blueprint_actions_categoria_valida
  check (categoria in ('hidratacao', 'exercicio', 'descanso', 'estudo', 'outro'))
  not valid;

alter table public.blueprint_actions
  add constraint blueprint_actions_rotulo_valido
  check (
    (categoria = 'outro' and rotulo is not null
      and rotulo = btrim(rotulo) and char_length(rotulo) between 1 and 40)
    or (categoria <> 'outro' and rotulo is null)
  )
  not valid;

-- Aceita registros feitos offline (passado), mas não datas no futuro.
alter table public.blueprint_actions
  add constraint blueprint_actions_criado_em_nao_futuro
  check (criado_em <= recebido_em + interval '10 minutes')
  not valid;

-- 3. Acesso: só usuários logados, cada um com as próprias linhas ----------------
drop policy if exists "Permitir insercao de acoes no Blueprint" on public.blueprint_actions;
drop policy if exists "Permitir leitura de acoes no Blueprint"  on public.blueprint_actions;

revoke all on table public.blueprint_actions from anon, authenticated;
grant select, insert, delete on table public.blueprint_actions to authenticated;

create policy "acoes_select_proprias" on public.blueprint_actions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "acoes_insert_proprias" on public.blueprint_actions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- "Desfazer": só ações próprias que chegaram ao servidor há menos de 5 minutos.
create policy "acoes_delete_recentes_proprias" on public.blueprint_actions
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and recebido_em > now() - interval '5 minutes'
  );

-- 4. Índice para histórico, calendário, mapa de calor e para o RLS --------------
create index if not exists blueprint_actions_user_data_idx
  on public.blueprint_actions (user_id, criado_em desc);

commit;

-- 5. Conferência (rode depois do commit) ----------------------------------------
-- select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' and tablename in ('perfis', 'blueprint_actions');
-- select tablename, policyname, cmd, roles from pg_policies
--   where schemaname = 'public' order by tablename, policyname;

-- 6. Linhas antigas de teste (sem dono) -----------------------------------------
-- Ficam invisíveis para o app. Em DESENVOLVIMENTO, para apagá-las:
-- delete from public.blueprint_actions where user_id is null;

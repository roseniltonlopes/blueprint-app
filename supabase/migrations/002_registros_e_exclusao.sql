-- ============================================================================
-- Blueprint: registros de compromisso e exclusão de ações (Supabase)
--
-- STATUS: escrito, NÃO APLICADO. Quem aplica é o dono do projeto, depois de ler.
-- Depende do 001_schema_inicial.sql (já aplicado): usa auth.users, public.acoes e a
-- função private.tocar_atualizado_em().
--
-- COMO APLICAR:
--   1. Teste antes em um projeto de desenvolvimento (ou num branch do Supabase).
--   2. Painel do Supabase > SQL Editor > New query.
--   3. Cole este arquivo inteiro e clique em Run. Rode UMA vez.
--   4. Confira com as consultas do bloco CONFERÊNCIA (no fim deste arquivo).
--   Enquanto esta migração não for aplicada, o app mostra "O banco precisa da migração 002"
--   no Perfil e continua funcionando só com os dados do aparelho.
--
-- O QUE MUDA
--   * Nova tabela public.registros: o "Feito" e o "Não fui" de cada compromisso por dia,
--     espelhando RegistroCompromisso de src/domain/registros.ts.
--   * A policy de exclusão de ações deixa de ter a janela de 5 minutos.
--
-- DECISÕES
--   * O registro é a cópia do que aconteceu: guarda nome, categoria e horário da atividade.
--     Por isso atividade_id e origem_id NÃO têm chave estrangeira: apagar a atividade, a agenda
--     ou o compromisso depois não pode apagar nem bloquear o passado.
--   * acao_id também não tem chave estrangeira: a ação e o registro sobem em lotes separados e
--     a regra que liga os dois ("Feito" gera a ação) é do app.
--   * No máximo um registro por compromisso por dia: unique (user_id, origem, origem_id, data).
--   * A regra de negócio fica no app (src/domain/registros.ts). Os checks abaixo só impedem
--     linha malformada; não decidem nada.
-- ============================================================================

begin;

-- 1. Registros de compromisso ("Feito" e "Não fui") ------------------------------
create table public.registros (
  user_id        uuid        not null default auth.uid()
                   references auth.users (id) on delete cascade,
  id             text        not null check (char_length(id) between 1 and 64),
  -- "agenda": compromisso recorrente; "avulso": compromisso de um dia só.
  origem         text        not null check (origem in ('agenda', 'avulso')),
  origem_id      text        not null check (char_length(origem_id) between 1 and 64),
  -- Sem FK de propósito: o registro sobrevive à atividade apagada.
  atividade_id   text        not null check (char_length(atividade_id) between 1 and 64),
  nome_atividade text        not null
                   check (nome_atividade = btrim(nome_atividade)
                          and char_length(nome_atividade) between 1 and 40),
  categoria      text
                   check (categoria is null
                          or categoria in ('hidratacao', 'exercicio', 'descanso', 'estudo', 'outro')),
  data           date        not null,
  inicio         time        not null,
  fim            time,
  status         text        not null check (status in ('feito', 'nao_fui')),
  -- Ação de hábito gerada pelo "Feito" de uma atividade com categoria.
  acao_id        text        check (acao_id is null or char_length(acao_id) between 1 and 64),
  -- Instante da marcação, vindo do aparelho.
  registrado_em  timestamptz not null,
  atualizado_em  timestamptz not null default now(),
  primary key (user_id, id),
  constraint registros_horario_valido check (fim is null or fim > inicio),
  constraint registros_acao_so_no_feito check (acao_id is null or status = 'feito'),
  constraint registros_um_por_dia unique (user_id, origem, origem_id, data)
);

create index registros_usuario_data_idx on public.registros (user_id, data);

create trigger registros_atualizado_em
  before update on public.registros
  for each row execute function private.tocar_atualizado_em();

alter table public.registros enable row level security;

revoke all on table public.registros from anon, authenticated;
grant select, insert, update, delete on table public.registros to authenticated;

create policy "registros_proprios" on public.registros
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 2. Exclusão de ações sem janela de tempo ---------------------------------------
-- A 001 só deixava apagar a ação que chegou ao servidor há menos de 5 minutos (o Desfazer
-- do toast). Desde a etapa 2, o app também remove a ação quando um "Feito" vira "Não fui" ou
-- é desmarcado, e isso pode acontecer a qualquer hora (inclusive no dia seguinte, pela aba
-- Ontem). Com a janela, essa exclusão falharia no servidor e a ação voltaria para o aparelho
-- na sincronização seguinte. Quando apagar é uma regra do app; o banco só garante o dono.
drop policy "acoes_delete_recentes_proprias" on public.acoes;

create policy "acoes_delete_proprias" on public.acoes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;

-- ============================================================================
-- CONFERÊNCIA (rode depois do commit, uma consulta por vez)
-- ============================================================================

-- 1) registros com RLS ligado (rowsecurity = true):
-- select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' and tablename = 'registros';

-- 2) Políticas (esperado: registros_proprios em registros; acoes_delete_proprias em acoes e
--    nenhuma acoes_delete_recentes_proprias):
-- select tablename, policyname, cmd, roles from pg_policies
--   where schemaname = 'public' and tablename in ('registros', 'acoes')
--   order by tablename, policyname;

-- 3) "anon" continua sem nenhum privilégio (deve devolver 0 linhas):
-- select grantee, table_name, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and grantee = 'anon';

-- 4) Depois de sincronizar um "Feito" no app:
-- select id, origem, nome_atividade, data, inicio, status, acao_id from public.registros
--   order by data desc limit 10;

-- ============================================================================
-- DESFAZER (só em desenvolvimento). Apaga os registros sincronizados!
-- ============================================================================
-- begin;
--   drop table if exists public.registros;
--   drop policy if exists "acoes_delete_proprias" on public.acoes;
--   create policy "acoes_delete_recentes_proprias" on public.acoes
--     for delete to authenticated
--     using (
--       (select auth.uid()) = user_id
--       and recebido_em > now() - interval '5 minutes'
--     );
-- commit;

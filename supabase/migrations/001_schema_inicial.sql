-- ============================================================================
-- Blueprint: esquema inicial do banco (Supabase)
--
-- STATUS: escrito, NÃO APLICADO. Quem aplica é o dono do projeto, depois de ler.
--
-- COMO APLICAR (projeto novo, vazio):
--   1. Painel do Supabase > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em Run. Rode UMA vez.
--   3. Confira com as consultas do bloco CONFERÊNCIA (no fim deste arquivo).
--
-- IDEIA CENTRAL
--   Cada linha pertence a um usuário (coluna user_id = auth.uid()). O RLS (Row Level
--   Security) deixa cada pessoa enxergar e alterar SÓ as próprias linhas. A chave
--   "publishable" do app é pública por desenho: quem protege os dados é este arquivo.
--   A chave "anon" não tem acesso nenhum às tabelas.
--
-- DECISÕES
--   * Os ids são TEXTO, não uuid: o app já gera ids como "local-lx3k-1" no aparelho e
--     assim os dados que já existem sobem sem conversão (envio idempotente).
--   * A chave primária é (user_id, id). Duas pessoas podem ter o mesmo id sem conflito.
--   * As chaves estrangeiras também levam user_id. Isso impede que alguém aponte um
--     compromisso para a agenda de OUTRA pessoa (uma FK simples ignora o RLS).
--   * Horários são "time" sem fuso e datas são "date": são o relógio de parede da pessoa.
--   * Agendas que se sobrepõem NÃO são barradas aqui, só no app (domain/agenda.ts):
--     dividir uma agenda em curso muda duas linhas, e o banco recusaria no meio.
--   * Os dias de um compromisso são checados como subconjunto de 0..6 (0 = domingo);
--     repetição de dia é barrada no app.
--   * Apagar o usuário (Authentication > Users) apaga todas as linhas dele. Os ARQUIVOS
--     do Storage não são apagados junto: o painel pede para remover a pasta à parte.
-- ============================================================================

begin;

-- 0. Esquema privado para funções internas (fora da API) ----------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Carimba atualizado_em a cada UPDATE (serve para a sincronização escolher o mais novo).
create function private.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

revoke all on function private.tocar_atualizado_em() from public, anon, authenticated;

-- 1. Perfis: nome, foto e preferências (um por usuário) -----------------------
create table public.perfis (
  id            uuid primary key references auth.users (id) on delete cascade,
  nome          text
                  check (nome is null or (nome = btrim(nome) and char_length(nome) between 1 and 40)),
  -- Caminho do arquivo no bucket "avatares": sempre <id do usuário>/<arquivo>.
  foto_path     text
                  check (foto_path is null or starts_with(foto_path, id::text || '/')),
  fuso          text        not null default 'America/Sao_Paulo'
                  check (char_length(fuso) between 1 and 64),
  tema          text        not null default 'system'
                  check (tema in ('light', 'dark', 'system')),
  destaque      text        not null default 'gradiente'
                  check (destaque in ('gradiente', 'laranja', 'indigo')),
  meta_diaria   smallint    not null default 5
                  check (meta_diaria between 1 and 20),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger perfis_atualizado_em
  before update on public.perfis
  for each row execute function private.tocar_atualizado_em();

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

-- Cria o perfil quando a pessoa se cadastra. Com confirmação de e-mail ligada, o app
-- ainda não tem sessão nesse momento para inserir sozinho. O nome e o fuso vêm do
-- user_metadata (a pessoa pode editar): servem só para exibição, nunca para permissão.
create function private.criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text := left(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), 40);
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

create trigger ao_criar_usuario_criar_perfil
  after insert on auth.users
  for each row execute function private.criar_perfil_para_novo_usuario();

-- 2. Ações registradas (Hoje, Histórico, Calendário, Perfil) ------------------
create table public.acoes (
  user_id      uuid        not null default auth.uid()
                 references auth.users (id) on delete cascade,
  id           text        not null check (char_length(id) between 1 and 64),
  categoria    text        not null
                 check (categoria in ('hidratacao', 'exercicio', 'descanso', 'estudo', 'outro')),
  -- Nome livre: obrigatório (1 a 40) só no "outro"; nas demais categorias fica nulo.
  rotulo       text,
  -- Instante em que a pessoa registrou, vindo do aparelho (pode ser de quando estava offline).
  criado_em    timestamptz not null,
  -- Instante em que o servidor recebeu. Controla a janela do Desfazer. O app não envia.
  recebido_em  timestamptz not null default now(),
  primary key (user_id, id),
  constraint acoes_rotulo_valido check (
    (categoria = 'outro' and rotulo is not null
       and rotulo = btrim(rotulo) and char_length(rotulo) between 1 and 40)
    or (categoria <> 'outro' and rotulo is null)
  ),
  -- Aceita registro feito offline (passado), mas não data no futuro.
  constraint acoes_criado_em_nao_futuro check (criado_em <= recebido_em + interval '10 minutes')
);

create index acoes_usuario_data_idx on public.acoes (user_id, criado_em desc);

alter table public.acoes enable row level security;

revoke all on table public.acoes from anon, authenticated;
grant select, delete on table public.acoes to authenticated;
-- Só estas colunas podem ser enviadas: recebido_em é sempre a hora do servidor.
grant insert (user_id, id, categoria, rotulo, criado_em) on table public.acoes to authenticated;

create policy "acoes_select_proprias" on public.acoes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "acoes_insert_proprias" on public.acoes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- "Desfazer": só ação própria que chegou ao servidor há menos de 5 minutos.
create policy "acoes_delete_recentes_proprias" on public.acoes
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and recebido_em > now() - interval '5 minutes'
  );

-- 3. Atividades: o catálogo do que a pessoa faz (Academia, Aula, Trabalho...) ---
create table public.atividades (
  user_id       uuid        not null default auth.uid()
                  references auth.users (id) on delete cascade,
  id            text        not null check (char_length(id) between 1 and 64),
  nome          text        not null
                  check (nome = btrim(nome) and char_length(nome) between 1 and 40),
  icone         text        not null
                  check (icone in ('exercicio', 'estudo', 'hidratacao', 'descanso', 'outro', 'sol', 'lua')),
  -- Liga a atividade a uma categoria do Histórico, ou fica nulo.
  categoria     text
                  check (categoria is null
                         or categoria in ('hidratacao', 'exercicio', 'descanso', 'estudo', 'outro')),
  criada_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (user_id, id)
);

-- Não pode haver duas atividades com o mesmo nome (sem diferenciar maiúsculas).
create unique index atividades_nome_unico on public.atividades (user_id, lower(nome));

create trigger atividades_atualizado_em
  before update on public.atividades
  for each row execute function private.tocar_atualizado_em();

-- 4. Agendas: um período (em geral um mês) com seus compromissos --------------
create table public.agendas (
  user_id       uuid        not null default auth.uid()
                  references auth.users (id) on delete cascade,
  id            text        not null check (char_length(id) between 1 and 64),
  nome          text        not null
                  check (nome = btrim(nome) and char_length(nome) between 1 and 80),
  inicio        date        not null,
  fim           date        not null,
  criada_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (user_id, id),
  constraint agendas_periodo_valido check (fim >= inicio)
);

create index agendas_usuario_inicio_idx on public.agendas (user_id, inicio);

create trigger agendas_atualizado_em
  before update on public.agendas
  for each row execute function private.tocar_atualizado_em();

-- 5. Compromissos: repetem toda semana nos dias escolhidos --------------------
create table public.compromissos (
  user_id          uuid        not null default auth.uid()
                     references auth.users (id) on delete cascade,
  id               text        not null check (char_length(id) between 1 and 64),
  agenda_id        text        not null,
  atividade_id     text        not null,
  -- 0 = domingo ... 6 = sábado. Pelo menos um dia.
  dias             smallint[]  not null
                     check (cardinality(dias) between 1 and 7
                            and dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  inicio           time        not null,
  fim              time,
  detalhe          text        check (detalhe is null or char_length(detalhe) <= 60),
  -- Minutos de aviso antes do início; nulo = sem aviso.
  antecedencia_min smallint    check (antecedencia_min is null or antecedencia_min between 0 and 120),
  atualizado_em    timestamptz not null default now(),
  primary key (user_id, id),
  constraint compromissos_horario_valido check (fim is null or fim > inicio),
  -- A agenda e a atividade precisam ser DO MESMO usuário (a FK leva o user_id).
  constraint compromissos_agenda_fk foreign key (user_id, agenda_id)
    references public.agendas (user_id, id) on delete cascade,
  -- Não deixa apagar uma atividade que ainda é usada por um compromisso.
  constraint compromissos_atividade_fk foreign key (user_id, atividade_id)
    references public.atividades (user_id, id) on delete restrict
);

create index compromissos_agenda_idx on public.compromissos (user_id, agenda_id);
create index compromissos_atividade_idx on public.compromissos (user_id, atividade_id);

create trigger compromissos_atualizado_em
  before update on public.compromissos
  for each row execute function private.tocar_atualizado_em();

-- 6. Avulsos: compromisso de um dia só, fora da agenda ------------------------
create table public.avulsos (
  user_id       uuid        not null default auth.uid()
                  references auth.users (id) on delete cascade,
  id            text        not null check (char_length(id) between 1 and 64),
  atividade_id  text        not null,
  data          date        not null,
  inicio        time        not null,
  fim           time,
  detalhe       text        check (detalhe is null or char_length(detalhe) <= 60),
  atualizado_em timestamptz not null default now(),
  primary key (user_id, id),
  constraint avulsos_horario_valido check (fim is null or fim > inicio),
  constraint avulsos_atividade_fk foreign key (user_id, atividade_id)
    references public.atividades (user_id, id) on delete restrict
);

create index avulsos_usuario_data_idx on public.avulsos (user_id, data);
create index avulsos_atividade_idx on public.avulsos (user_id, atividade_id);

create trigger avulsos_atualizado_em
  before update on public.avulsos
  for each row execute function private.tocar_atualizado_em();

-- 7. RLS das tabelas da agenda: cada pessoa só mexe nas próprias linhas ---------
alter table public.atividades   enable row level security;
alter table public.agendas      enable row level security;
alter table public.compromissos enable row level security;
alter table public.avulsos      enable row level security;

revoke all on table public.atividades, public.agendas, public.compromissos, public.avulsos
  from anon, authenticated;
grant select, insert, update, delete
  on table public.atividades, public.agendas, public.compromissos, public.avulsos
  to authenticated;

create policy "atividades_proprias" on public.atividades
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "agendas_proprias" on public.agendas
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "compromissos_proprios" on public.compromissos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "avulsos_proprios" on public.avulsos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 8. Fotos de perfil (Storage) ---------------------------------------------------
-- Bucket PRIVADO: ninguém abre a foto de outra pessoa pela URL. O app pede uma URL
-- assinada e temporária. Cada pessoa só mexe na própria pasta: <id do usuário>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatares',
  'avatares',
  false,
  512000,                                         -- 500 KB (a foto do app tem ~50 KB)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "avatares_select_proprio" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatares_insert_proprio" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatares_update_proprio" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatares_delete_proprio" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;

-- ============================================================================
-- CONFERÊNCIA (rode depois do commit, uma consulta por vez)
-- ============================================================================

-- 1) Todas as tabelas devem aparecer com rowsecurity = true:
-- select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' order by tablename;

-- 2) Políticas criadas (esperado: 3 em perfis, 3 em acoes, 1 em cada tabela da agenda):
-- select tablename, policyname, cmd, roles from pg_policies
--   where schemaname in ('public', 'storage') order by tablename, policyname;

-- 3) "anon" NÃO pode ter nenhum privilégio nas tabelas (deve devolver 0 linhas):
-- select grantee, table_name, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and grantee = 'anon';

-- 4) Depois de criar uma conta no app, o perfil dela deve existir:
-- select id, nome, fuso, tema from public.perfis;

-- ============================================================================
-- DESFAZER TUDO (só em desenvolvimento, para recomeçar do zero). Apaga os dados!
-- ============================================================================
-- begin;
--   drop trigger if exists ao_criar_usuario_criar_perfil on auth.users;
--   drop table if exists public.avulsos, public.compromissos, public.agendas,
--     public.atividades, public.acoes, public.perfis cascade;
--   drop function if exists private.criar_perfil_para_novo_usuario();
--   drop function if exists private.tocar_atualizado_em();
--   delete from storage.objects where bucket_id = 'avatares';
--   delete from storage.buckets where id = 'avatares';
-- commit;

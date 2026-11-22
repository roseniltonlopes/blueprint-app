-- ============================================================================
-- Blueprint: aceite dos termos, aviso nos avulsos e exclusão da própria conta
--
-- STATUS: escrito, NÃO APLICADO. Quem aplica é o dono do projeto, depois de ler.
-- Depende de 001_schema_inicial.sql e 002_registros_e_exclusao.sql (já aplicadas).
--
-- COMO APLICAR:
--   1. Painel do Supabase > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em Run. Rode UMA vez.
--   3. Confira com as consultas do bloco CONFERÊNCIA (no fim deste arquivo).
--
-- O QUE MUDA
--   1. perfis ganha termos_versao e termos_aceitos_em (LGPD: qual versão foi aceita e quando).
--   2. O gatilho de cadastro grava o aceite. A data é a do servidor (now()), nunca a do aparelho.
--   3. avulsos ganha antecedencia_min (aviso antes do compromisso de um dia só).
--   4. public.excluir_minha_conta(): a pessoa logada apaga a própria conta e todos os dados.
-- ============================================================================

begin;

-- 1. Aceite dos termos no perfil ---------------------------------------------
alter table public.perfis
  add column termos_versao     text
    check (termos_versao is null or char_length(termos_versao) between 1 and 20),
  add column termos_aceitos_em timestamptz,
  add constraint perfis_aceite_completo
    check ((termos_versao is null) = (termos_aceitos_em is null));

-- O aceite só é gravado pelo gatilho de cadastro: o app não consegue escrever nem alterar essas
-- colunas. "id" fica no UPDATE porque o upsert do nome (sincronização) reescreve a chave; o RLS
-- da 001 continua impedindo trocar para o id de outra pessoa.
revoke insert, update on table public.perfis from authenticated;
grant insert (id, nome, foto_path, fuso, tema, destaque, meta_diaria) on table public.perfis
  to authenticated;
grant update (id, nome, foto_path, fuso, tema, destaque, meta_diaria) on table public.perfis
  to authenticated;

-- 2. Gatilho de cadastro: mesmo comportamento da 001, mais o aceite dos termos ---
-- O app envia termos_versao no user_metadata do signUp, só depois de a pessoa marcar a caixa
-- "Li e aceito". A data do aceite é a hora do servidor no momento do cadastro.
create or replace function private.criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome   text := left(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), 40);
  v_fuso   text := nullif(btrim(new.raw_user_meta_data ->> 'fuso'), '');
  v_termos text := nullif(btrim(new.raw_user_meta_data ->> 'termos_versao'), '');
begin
  if v_fuso is null
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = v_fuso) then
    v_fuso := 'America/Sao_Paulo';
  end if;

  if v_termos is not null and char_length(v_termos) > 20 then
    v_termos := null;
  end if;

  insert into public.perfis (id, nome, fuso, termos_versao, termos_aceitos_em)
  values (
    new.id,
    v_nome,
    v_fuso,
    v_termos,
    case when v_termos is null then null else now() end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.criar_perfil_para_novo_usuario() from public, anon, authenticated;

-- 3. Aviso antes também nos compromissos de um dia só --------------------------
alter table public.avulsos
  add column antecedencia_min smallint
    check (antecedencia_min is null or antecedencia_min between 0 and 120);

-- 4. Excluir a própria conta ---------------------------------------------------
-- SEGURANÇA
--   * Não recebe parâmetro: só apaga quem está logado (auth.uid()). Ninguém apaga outra conta.
--   * security definer com search_path vazio: roda com permissão de apagar em auth.users sem
--     expor a chave service_role no app, e sem risco de sequestro por objetos de outro schema.
--   * Só "authenticated" pode executar; "anon" e "public" não.
-- ORDEM
--   compromissos e avulsos apontam para atividades com "on delete restrict" (001). Deixar só o
--   cascade de auth.users apagar tudo poderia remover atividades antes dos compromissos e a
--   restrição barraria a exclusão. Por isso apaga dos filhos para os pais e, no fim, o usuário.
-- LIMITAÇÃO
--   O token de acesso já emitido continua válido até expirar (cerca de 1 hora), mas sem usuário,
--   sem sessão de renovação e sem dados. O app sai da conta logo depois.
create function public.excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
begin
  if v_usuario is null then
    raise exception 'Sem sessão: entre na conta para excluí-la.'
      using errcode = '42501';
  end if;

  delete from public.registros    where user_id = v_usuario;
  delete from public.acoes        where user_id = v_usuario;
  delete from public.avulsos      where user_id = v_usuario;
  delete from public.compromissos where user_id = v_usuario;
  delete from public.agendas      where user_id = v_usuario;
  delete from public.atividades   where user_id = v_usuario;
  delete from public.perfis       where id      = v_usuario;
  -- Sessões, identidades e fatores do Auth saem junto, pelo cascade do próprio Supabase.
  delete from auth.users          where id      = v_usuario;
end;
$$;

revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;

commit;

-- ============================================================================
-- CONFERÊNCIA (rode depois do commit, uma consulta por vez)
-- ============================================================================

-- 1) Colunas novas (esperado: termos_versao e termos_aceitos_em em perfis; antecedencia_min em avulsos):
-- select table_name, column_name, data_type from information_schema.columns
--   where table_schema = 'public'
--     and column_name in ('termos_versao', 'termos_aceitos_em', 'antecedencia_min')
--   order by table_name, column_name;

-- 2) Quem pode executar a exclusão (esperado: authenticated e postgres; nunca anon):
-- select grantee, privilege_type from information_schema.routine_privileges
--   where routine_schema = 'public' and routine_name = 'excluir_minha_conta';

-- 3) A função é security definer com search_path vazio (esperado: true e {search_path=""}):
-- select prosecdef, proconfig from pg_proc where proname = 'excluir_minha_conta';

-- 4) Depois de criar uma conta pelo app, o aceite foi gravado:
-- select id, termos_versao, termos_aceitos_em from public.perfis order by criado_em desc limit 5;

-- ============================================================================
-- DESFAZER (só em desenvolvimento)
-- ============================================================================
-- begin;
--   drop function if exists public.excluir_minha_conta();
--   alter table public.avulsos drop column if exists antecedencia_min;
--   revoke insert, update on table public.perfis from authenticated;
--   grant insert, update on table public.perfis to authenticated;
--   alter table public.perfis drop constraint if exists perfis_aceite_completo;
--   alter table public.perfis drop column if exists termos_aceitos_em;
--   alter table public.perfis drop column if exists termos_versao;
--   -- Para a função de cadastro, rode de novo o bloco dela que está na 001.
-- commit;

-- ============================================================================
-- Blueprint: data de nascimento no perfil
--
-- STATUS: escrito, NÃO APLICADO. Quem aplica é o dono do projeto, depois de ler.
-- Depende de 001, 002 e 003 (já aplicadas).
--
-- COMO APLICAR:
--   1. Teste antes num projeto de desenvolvimento do Supabase.
--   2. Painel do Supabase > SQL Editor > New query.
--   3. Cole este arquivo inteiro e clique em Run. Rode UMA vez.
--   4. Confira com as consultas do bloco CONFERÊNCIA (no fim deste arquivo).
--
-- O QUE MUDA
--   1. perfis ganha data_nascimento (date). O app 1.2.0 pede a data no cadastro.
--   2. O gatilho de cadastro passa a gravar a data que vem no user_metadata (data_nascimento,
--      no formato AAAA-MM-DD). Data inválida, futura ou fora de 13 a 120 anos vira null.
--   3. Contas criadas pelo app 1.2.0 antes desta migração já têm a data nos metadados: o passo 3
--      copia a data e o nome (quando o perfil está sem nome) para a tabela.
--   4. O app não escreve a coluna: ela fica fora dos grants de INSERT e UPDATE da 003.
--
-- ENQUANTO NÃO FOR APLICADA: o app funciona normalmente. A data fica só no user_metadata da
-- conta (auth.users.raw_user_meta_data), e o nome continua indo para perfis.nome pelo gatilho.
-- ============================================================================

begin;

-- 1. Coluna nova ----------------------------------------------------------------
alter table public.perfis
  add column data_nascimento date
    check (data_nascimento is null or data_nascimento >= date '1900-01-01');

-- 2. Data do user_metadata, conferida. Devolve null para qualquer valor fora da regra.
create or replace function private.data_nascimento_do_metadata(p_metadata jsonb)
returns date
language plpgsql
stable
set search_path = ''
as $$
declare
  v_texto text := btrim(p_metadata ->> 'data_nascimento');
  v_data  date;
begin
  if v_texto is null or v_texto !~ '^\d{4}-\d{2}-\d{2}$' then
    return null;
  end if;
  begin
    v_data := v_texto::date;
  exception when others then
    return null;
  end;
  -- Mesma regra do app (src/domain/conta.ts): de 13 a 120 anos.
  if v_data > (current_date - interval '13 years')::date
     or v_data < (current_date - interval '121 years')::date then
    return null;
  end if;
  return v_data;
end;
$$;

revoke all on function private.data_nascimento_do_metadata(jsonb) from public, anon, authenticated;

-- Gatilho de cadastro: mesmo comportamento da 003, mais a data de nascimento.
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
  v_nasc   date := private.data_nascimento_do_metadata(new.raw_user_meta_data);
begin
  if v_fuso is null
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = v_fuso) then
    v_fuso := 'America/Sao_Paulo';
  end if;

  if v_termos is not null and char_length(v_termos) > 20 then
    v_termos := null;
  end if;

  insert into public.perfis (id, nome, fuso, termos_versao, termos_aceitos_em, data_nascimento)
  values (
    new.id,
    v_nome,
    v_fuso,
    v_termos,
    case when v_termos is null then null else now() end,
    v_nasc
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.criar_perfil_para_novo_usuario() from public, anon, authenticated;

-- 3. Contas criadas antes desta migração -----------------------------------------
update public.perfis p
set data_nascimento = coalesce(p.data_nascimento,
                               private.data_nascimento_do_metadata(u.raw_user_meta_data)),
    nome = coalesce(p.nome, left(nullif(btrim(u.raw_user_meta_data ->> 'nome'), ''), 40))
from auth.users u
where u.id = p.id
  and (p.data_nascimento is null or p.nome is null);

commit;

-- ============================================================================
-- CONFERÊNCIA (rode depois do commit, uma consulta por vez)
-- ============================================================================

-- 1) Coluna nova (esperado: data_nascimento, date):
-- select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'perfis' and column_name = 'data_nascimento';

-- 2) O app não pode escrever a coluna (esperado: nenhuma linha):
-- select grantee, privilege_type from information_schema.column_privileges
--   where table_schema = 'public' and table_name = 'perfis'
--     and column_name = 'data_nascimento' and grantee = 'authenticated'
--     and privilege_type in ('INSERT', 'UPDATE');

-- 3) Depois de criar uma conta pelo app, nome e data foram gravados:
-- select id, nome, data_nascimento from public.perfis order by criado_em desc limit 5;

-- ============================================================================
-- DESFAZER (só em desenvolvimento)
-- ============================================================================
-- begin;
--   alter table public.perfis drop column if exists data_nascimento;
--   drop function if exists private.data_nascimento_do_metadata(jsonb);
--   -- Para a função de cadastro, rode de novo o bloco dela que está na 003.
-- commit;

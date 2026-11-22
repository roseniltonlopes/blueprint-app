import type { SupabaseClient } from "@supabase/supabase-js";
import { TABELAS, type LinhasRemotas, type Tabela } from "../sincronizacao/foto";
import type { Passo } from "../sincronizacao/plano";
import { ErroDeSincronizacao, type PortaRemota } from "../sincronizacao/porta";

/** O PostgREST devolve no máximo 1000 linhas por pedido (padrão do Supabase). */
const TAMANHO_DA_PAGINA = 1000;
/** Lotes menores que a página para o corpo do pedido não ficar grande demais. */
const LOTE_DE_ENVIO = 500;
/** Os ids vão na URL do DELETE (filtro in.(...)): lotes pequenos para não estourar o limite. */
const LOTE_DE_EXCLUSAO = 100;

type RespostaDoPostgrest = {
  error: { message: string; code?: string; details?: string } | null;
  status: number;
};

/** Códigos do PostgREST e do Postgres para "a tabela não existe". */
const TABELA_AUSENTE = new Set(["PGRST205", "42P01"]);
/** JWT vencido ou inválido. */
const SESSAO_INVALIDA = new Set(["PGRST301", "PGRST302", "PGRST303"]);

/** Converte a resposta do PostgREST no motivo que o app sabe mostrar. */
export function falhaDaResposta(resposta: RespostaDoPostgrest): ErroDeSincronizacao | null {
  const { error, status } = resposta;
  if (error === null) return null;
  const codigo = error.code ?? "";
  // status 0: o fetch falhou (sem internet). 5xx: servidor fora do ar, vale tentar de novo.
  if (status === 0 || status >= 500) return new ErroDeSincronizacao("rede");
  if (TABELA_AUSENTE.has(codigo)) return new ErroDeSincronizacao("migracao", error.message);
  if (status === 401 || SESSAO_INVALIDA.has(codigo)) return new ErroDeSincronizacao("sessao");
  return new ErroDeSincronizacao("servidor", codigo || error.message);
}

function conferir(resposta: RespostaDoPostgrest): void {
  const falha = falhaDaResposta(resposta);
  if (falha !== null) throw falha;
}

function emLotes<T>(itens: readonly T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

/** Qualquer exceção fora do PostgREST (por exemplo TypeError de rede) vira um motivo claro. */
function comoFalha(erro: unknown): ErroDeSincronizacao {
  if (erro instanceof ErroDeSincronizacao) return erro;
  if (erro instanceof TypeError) return new ErroDeSincronizacao("rede");
  return new ErroDeSincronizacao("servidor", erro instanceof Error ? erro.message : undefined);
}

export function criarRemotoSupabase(cliente: SupabaseClient): PortaRemota {
  async function baixarTabela(tabela: Tabela, userId: string): Promise<unknown[]> {
    const linhas: unknown[] = [];
    for (let inicio = 0; ; inicio += TAMANHO_DA_PAGINA) {
      const resposta = await cliente
        .from(tabela)
        .select("*")
        .eq("user_id", userId)
        .order("id")
        .range(inicio, inicio + TAMANHO_DA_PAGINA - 1);
      conferir(resposta);
      const pagina = (resposta.data ?? []) as unknown[];
      linhas.push(...pagina);
      if (pagina.length < TAMANHO_DA_PAGINA) return linhas;
    }
  }

  return {
    async baixar(userId) {
      try {
        const listas: Partial<Record<Tabela, unknown[]>> = {};
        for (const tabela of TABELAS) {
          listas[tabela] = await baixarTabela(tabela, userId);
        }
        const perfil = await cliente.from("perfis").select("nome").eq("id", userId).maybeSingle();
        conferir(perfil);
        return {
          ...(listas as Record<Tabela, unknown[]>),
          perfil: perfil.data,
        } satisfies LinhasRemotas;
      } catch (erro) {
        throw comoFalha(erro);
      }
    },

    async executar(userId, passos: readonly Passo[]) {
      try {
        for (const passo of passos) {
          if (passo.tipo === "apagar") {
            for (const ids of emLotes(passo.ids, LOTE_DE_EXCLUSAO)) {
              conferir(
                await cliente.from(passo.tabela).delete().eq("user_id", userId).in("id", ids),
              );
            }
          } else if (passo.tipo === "enviar") {
            for (const linhas of emLotes(passo.linhas, LOTE_DE_ENVIO)) {
              // Ações só são inseridas (o banco não dá UPDATE): repetida é ignorada.
              conferir(
                await cliente.from(passo.tabela).upsert(linhas, {
                  onConflict: "user_id,id",
                  ignoreDuplicates: passo.tabela === "acoes",
                }),
              );
            }
          } else {
            // A linha do perfil é criada pelo gatilho do cadastro; o upsert cobre se faltar.
            conferir(
              await cliente
                .from("perfis")
                .upsert({ id: userId, nome: passo.nome }, { onConflict: "id" }),
            );
          }
        }
      } catch (erro) {
        throw comoFalha(erro);
      }
    },
  };
}

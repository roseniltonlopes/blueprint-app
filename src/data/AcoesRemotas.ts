import type { SupabaseClient } from "@supabase/supabase-js";
import type { Acao } from "../domain/acoes";
import type { CategoriaId } from "../domain/categorias";

/** Porta para as ações da conta no servidor. O RLS garante que só a conta logada é afetada. */
export interface AcoesRemotas {
  /** Envio idempotente: ids que já existem no servidor são ignorados */
  enviar(acoes: readonly Acao[]): Promise<void>;
  excluir(ids: readonly string[]): Promise<void>;
  listar(): Promise<Acao[]>;
}

const TABELA = "blueprint_actions";
const PAGINA = 1000;
const LOTE = 200;

type LinhaDaTabela = {
  id: string;
  categoria: CategoriaId;
  rotulo: string | null;
  criado_em: string;
};

function paraLinha(acao: Acao) {
  return {
    id: acao.id,
    categoria: acao.categoria,
    rotulo: acao.categoria === "outro" ? (acao.rotulo ?? "Outro") : null,
    criado_em: acao.criadoEm,
  };
}

function deLinha(linha: LinhaDaTabela): Acao {
  return {
    id: linha.id,
    categoria: linha.categoria,
    criadoEm: new Date(linha.criado_em).toISOString(),
    ...(linha.rotulo !== null ? { rotulo: linha.rotulo } : {}),
    sincronizada: true,
  };
}

function emLotes<T>(lista: readonly T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) {
    lotes.push(lista.slice(i, i + tamanho));
  }
  return lotes;
}

export function criarAcoesRemotasSupabase(supabase: SupabaseClient): AcoesRemotas {
  return {
    async enviar(acoes) {
      for (const lote of emLotes(acoes, LOTE)) {
        const { error } = await supabase
          .from(TABELA)
          .upsert(lote.map(paraLinha), { onConflict: "id", ignoreDuplicates: true });
        if (error) throw error;
      }
    },

    async excluir(ids) {
      for (const lote of emLotes(ids, LOTE)) {
        const { error } = await supabase.from(TABELA).delete().in("id", lote);
        if (error) throw error;
      }
    },

    async listar() {
      // O servidor devolve no máximo 1000 linhas por pedido: busca em páginas.
      const todas: Acao[] = [];
      for (let inicio = 0; ; inicio += PAGINA) {
        const { data, error } = await supabase
          .from(TABELA)
          .select("id, categoria, rotulo, criado_em")
          .order("criado_em", { ascending: true })
          .order("id", { ascending: true })
          .range(inicio, inicio + PAGINA - 1);
        if (error) throw error;
        const linhas = (data ?? []) as LinhaDaTabela[];
        todas.push(...linhas.map(deLinha));
        if (linhas.length < PAGINA) {
          return todas;
        }
      }
    },
  };
}

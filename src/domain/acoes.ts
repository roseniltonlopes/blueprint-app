import type { CategoriaId } from "./categorias";
import { chaveDoDia } from "./datas";

export type Acao = {
  id: string;
  categoria: CategoriaId;
  /** Nome livre, obrigatório apenas para "Outro" (1 a 40 caracteres) */
  rotulo?: string;
  /** Instante do registro em ISO 8601 */
  criadoEm: string;
};

export const META_DIARIA_PADRAO = 5;
export const ROTULO_MAX = 40;

export type ContagemPorCategoria = Record<CategoriaId, number>;

export function contagemVazia(): ContagemPorCategoria {
  return { hidratacao: 0, exercicio: 0, descanso: 0, estudo: 0, outro: 0 };
}

/** Ações cujo registro cai no dia indicado pela chave AAAA-MM-DD (ver chaveDoDia). */
export function acoesDoDia(acoes: readonly Acao[], chave: string): Acao[] {
  return acoes.filter((acao) => chaveDoDia(new Date(acao.criadoEm)) === chave);
}

export function contarPorCategoria(acoes: readonly Acao[]): ContagemPorCategoria {
  const contagem = contagemVazia();
  for (const acao of acoes) {
    contagem[acao.categoria] += 1;
  }
  return contagem;
}

/** Texto de apoio do cartão de progresso (docs/03, telas 2, 3 e 5). */
export function mensagemDeProgresso(total: number, meta: number = META_DIARIA_PADRAO): string {
  if (total <= 0) {
    return "Toque em uma categoria para começar o plano.";
  }
  const faltam = meta - total;
  if (faltam <= 0) {
    return "Meta do dia concluída.";
  }
  return faltam === 1 ? "Falta 1 para fechar o dia." : `Faltam ${faltam} para fechar o dia.`;
}

/** Normaliza o nome livre do "Outro". Retorna null quando fica fora de 1 a 40 caracteres. */
export function normalizarRotulo(texto: string): string | null {
  const limpo = texto.trim();
  return limpo.length >= 1 && limpo.length <= ROTULO_MAX ? limpo : null;
}

// Estado e reducer

export type EstadoAcoes = {
  acoes: Acao[];
};

export type EventoAcoes = { tipo: "registrar"; acao: Acao } | { tipo: "remover"; id: string };

export const ESTADO_INICIAL: EstadoAcoes = { acoes: [] };

export function acoesReducer(estado: EstadoAcoes, evento: EventoAcoes): EstadoAcoes {
  switch (evento.tipo) {
    case "registrar":
      if (estado.acoes.some((acao) => acao.id === evento.acao.id)) {
        return estado;
      }
      return { acoes: [...estado.acoes, evento.acao] };
    case "remover":
      return { acoes: estado.acoes.filter((acao) => acao.id !== evento.id) };
  }
}

let sequencia = 0;

/** Identificador local único por sessão. O Supabase gera o id definitivo na Etapa 7. */
export function gerarIdLocal(agora: Date): string {
  sequencia += 1;
  return `local-${agora.getTime().toString(36)}-${sequencia.toString(36)}`;
}

export function criarAcao(categoria: CategoriaId, agora: Date, rotulo?: string): Acao {
  if (categoria === "outro" && rotulo !== undefined && normalizarRotulo(rotulo) === null) {
    throw new Error(`O nome da ação precisa ter de 1 a ${ROTULO_MAX} caracteres.`);
  }
  return {
    id: gerarIdLocal(agora),
    categoria,
    rotulo: rotulo === undefined ? undefined : (normalizarRotulo(rotulo) ?? undefined),
    criadoEm: agora.toISOString(),
  };
}

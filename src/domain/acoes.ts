import type { CategoriaId } from "./categorias";
import { chaveDoDia } from "./datas";

export type Acao = {
  /** UUID v4 gerado no aparelho; é também a chave no Supabase (envio idempotente) */
  id: string;
  categoria: CategoriaId;
  /** Nome livre, obrigatório para "Outro" e ausente nas demais (1 a 40 caracteres) */
  rotulo?: string;
  /** Instante do registro em ISO 8601 */
  criadoEm: string;
  /** true quando o servidor já tem esta ação */
  sincronizada?: boolean;
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ehUuid(id: string): boolean {
  return UUID.test(id);
}

export type GeradorDeId = () => string;

/**
 * Cria uma ação válida para o servidor: "Outro" exige nome; as demais categorias não têm nome.
 * O gerador de id vem de fora para o domínio não depender de módulo nativo.
 */
export function criarAcao(
  categoria: CategoriaId,
  agora: Date,
  rotulo: string | undefined,
  gerarId: GeradorDeId,
): Acao {
  if (categoria !== "outro") {
    return { id: gerarId(), categoria, criadoEm: agora.toISOString() };
  }
  const nome = rotulo === undefined ? null : normalizarRotulo(rotulo);
  if (nome === null) {
    throw new Error(`O nome da ação precisa ter de 1 a ${ROTULO_MAX} caracteres.`);
  }
  return { id: gerarId(), categoria, rotulo: nome, criadoEm: agora.toISOString() };
}

// Estado e reducer

export type EstadoAcoes = {
  acoes: Acao[];
  /** Ids removidos no aparelho que ainda precisam ser apagados no servidor */
  exclusoesPendentes: string[];
  /**
   * Ids removidos no aparelho. Filtram o que vem do servidor, para uma ação
   * desfeita não voltar se o servidor recusar a exclusão (janela de 5 minutos).
   */
  lapides: string[];
};

export const ESTADO_INICIAL: EstadoAcoes = { acoes: [], exclusoesPendentes: [], lapides: [] };

export type ResultadoDaSincronizacao = {
  /** Ids enviados com sucesso nesta rodada */
  enviadas: string[];
  /** Ids cuja exclusão foi enviada nesta rodada */
  excluidas: string[];
  /** Todas as ações da conta no servidor, lidas depois do envio */
  doServidor: Acao[];
};

export type EventoAcoes =
  | { tipo: "registrar"; acao: Acao }
  | { tipo: "remover"; id: string }
  | { tipo: "substituir"; acoes: Acao[] }
  | { tipo: "aplicarSincronizacao"; resultado: ResultadoDaSincronizacao }
  | { tipo: "limpar" };

function semRepetir(lista: readonly string[], novos: readonly string[]): string[] {
  return [...new Set([...lista, ...novos])];
}

function marcarRemovidas(estado: EstadoAcoes, ids: readonly string[]): EstadoAcoes {
  if (ids.length === 0) {
    return estado;
  }
  return {
    ...estado,
    exclusoesPendentes: semRepetir(estado.exclusoesPendentes, ids),
    lapides: semRepetir(estado.lapides, ids),
  };
}

/**
 * Junta o resultado de uma rodada com o estado atual. Ações criadas ou removidas
 * durante a rodada são preservadas: só mexe no que a rodada realmente tratou.
 */
export function aplicarSincronizacao(
  estado: EstadoAcoes,
  { enviadas, excluidas, doServidor }: ResultadoDaSincronizacao,
): EstadoAcoes {
  const lapides = new Set(estado.lapides);
  const foramEnviadas = new Set(enviadas);
  const servidor = new Map(
    doServidor.filter((a) => !lapides.has(a.id)).map((a) => [a.id, a] as const),
  );

  const locais = estado.acoes
    .map((a) => (foramEnviadas.has(a.id) ? { ...a, sincronizada: true } : a))
    // Sincronizada no aparelho e ausente no servidor: foi apagada em outro lugar.
    .filter((a) => !a.sincronizada || servidor.has(a.id));

  const idsLocais = new Set(locais.map((a) => a.id));
  const novasDoServidor = [...servidor.values()]
    .filter((a) => !idsLocais.has(a.id))
    .map((a) => ({ ...a, sincronizada: true }));

  const tratadas = new Set(excluidas);
  return {
    acoes: [...locais, ...novasDoServidor],
    exclusoesPendentes: estado.exclusoesPendentes.filter((id) => !tratadas.has(id)),
    lapides: estado.lapides,
  };
}

export function acoesReducer(estado: EstadoAcoes, evento: EventoAcoes): EstadoAcoes {
  switch (evento.tipo) {
    case "registrar":
      if (estado.acoes.some((acao) => acao.id === evento.acao.id)) {
        return estado;
      }
      return { ...estado, acoes: [...estado.acoes, evento.acao] };
    case "remover":
      if (!estado.acoes.some((acao) => acao.id === evento.id)) {
        return estado;
      }
      return marcarRemovidas(
        { ...estado, acoes: estado.acoes.filter((acao) => acao.id !== evento.id) },
        [evento.id],
      );
    case "substituir": {
      const mantidas = new Set(evento.acoes.map((a) => a.id));
      const removidas = estado.acoes.filter((a) => !mantidas.has(a.id)).map((a) => a.id);
      return marcarRemovidas({ ...estado, acoes: [...evento.acoes] }, removidas);
    }
    case "aplicarSincronizacao":
      return aplicarSincronizacao(estado, evento.resultado);
    case "limpar":
      return ESTADO_INICIAL;
  }
}

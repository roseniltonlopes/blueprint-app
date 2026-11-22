import {
  NOME_ATIVIDADE_MAX,
  dataValida,
  horaValida,
  minutosDoDia,
  type Ocorrencia,
} from "./agenda";
import { CATEGORIAS, type CategoriaId } from "./categorias";
import { chaveDoDia } from "./datas";

export const STATUS_DO_REGISTRO = ["feito", "nao_fui"] as const;

export type StatusDoRegistro = (typeof STATUS_DO_REGISTRO)[number];

/**
 * O que a pessoa marcou em um compromisso de um dia. Guarda uma cópia do nome, da categoria e do
 * horário: editar ou apagar a agenda depois não reescreve o passado.
 */
export type RegistroCompromisso = {
  id: string;
  origem: Ocorrencia["origem"];
  /** Id do compromisso (origem "agenda") ou do avulso (origem "avulso") */
  origemId: string;
  atividadeId: string;
  nomeAtividade: string;
  categoria: CategoriaId | null;
  /** AAAA-MM-DD */
  data: string;
  inicio: string;
  fim: string | null;
  status: StatusDoRegistro;
  /** Ação de hábito gerada pelo "Feito" de uma atividade com categoria */
  acaoId: string | null;
  /** Instante da marcação em ISO 8601 */
  registradoEm: string;
};

export type Resumo = {
  total: number;
  feitos: number;
  naoFui: number;
  pendentes: number;
};

/** Mesmo formato de `Ocorrencia.chave`: "agenda:<id>" ou "avulso:<id>". */
export function chaveDaOrigem(registro: Pick<RegistroCompromisso, "origem" | "origemId">): string {
  return `${registro.origem}:${registro.origemId}`;
}

export function registroDaOcorrencia(
  registros: readonly RegistroCompromisso[],
  chaveDaOcorrencia: string,
  data: string,
): RegistroCompromisso | undefined {
  return registros.find((r) => r.data === data && chaveDaOrigem(r) === chaveDaOcorrencia);
}

/** Hoje ou um dia que já passou. Dia futuro nunca é registrado. */
export function podeRegistrarNaData(data: string, hoje: Date): boolean {
  return dataValida(data) && data <= chaveDoDia(hoje);
}

export function validarRegistro(r: Omit<RegistroCompromisso, "id">): string | null {
  if (r.origem !== "agenda" && r.origem !== "avulso") {
    return "Origem do registro inválida";
  }
  if (r.origemId.length === 0 || r.atividadeId.length === 0) {
    return "Registro sem compromisso ou atividade";
  }
  const nome = r.nomeAtividade.trim();
  if (nome.length === 0 || nome.length > NOME_ATIVIDADE_MAX) {
    return "Nome da atividade inválido";
  }
  if (r.categoria !== null && !CATEGORIAS.some((c) => c.id === r.categoria)) {
    return "Categoria inválida";
  }
  if (!dataValida(r.data)) {
    return "Data do registro inválida";
  }
  if (!horaValida(r.inicio) || (r.fim !== null && !horaValida(r.fim))) {
    return "Horário do registro inválido";
  }
  if (r.fim !== null && minutosDoDia(r.fim) <= minutosDoDia(r.inicio)) {
    return "Horário do registro inválido";
  }
  if (!STATUS_DO_REGISTRO.includes(r.status)) {
    return "Situação do registro inválida";
  }
  if (r.acaoId !== null && (r.status !== "feito" || r.acaoId.length === 0)) {
    return "Só um registro feito pode ter ação de hábito";
  }
  if (Number.isNaN(Date.parse(r.registradoEm))) {
    return "Instante do registro inválido";
  }
  return null;
}

/** Tocar no status que já está marcado desmarca (volta a "sem registro"). */
export function proximoStatus(
  atual: StatusDoRegistro | null,
  tocado: StatusDoRegistro,
): StatusDoRegistro | null {
  return atual === tocado ? null : tocado;
}

/** Ação de hábito que o "Feito" gera. O rótulo só existe no "Outro" (regra das ações). */
export type AcaoAGerar = { categoria: CategoriaId; rotulo?: string };

export type PlanoDeMarcacao = {
  /** Registro que passa a valer; null quando a marcação foi desfeita */
  registro: RegistroCompromisso | null;
  /** Ação a criar. Quem cria preenche `registro.acaoId` com o id dela. */
  criarAcao: AcaoAGerar | null;
  /** Ação a remover, porque o registro deixou de ser "Feito" */
  removerAcaoId: string | null;
};

type EntradaDaMarcacao = {
  ocorrencia: Ocorrencia;
  data: string;
  anterior: RegistroCompromisso | null;
  tocado: StatusDoRegistro;
  agora: Date;
  novoId: () => string;
};

export type ResultadoDoPlano = { ok: true; valor: PlanoDeMarcacao } | { ok: false; erro: string };

export const ERRO_DIA_FUTURO = "Só é possível registrar hoje ou dias que já passaram";

/**
 * Decide o que muda ao tocar em "Feito" ou "Não fui". Só "Feito" de atividade com categoria
 * gera ação de hábito; sair de "Feito" remove a ação que ele gerou.
 */
export function planejarMarcacao({
  ocorrencia,
  data,
  anterior,
  tocado,
  agora,
  novoId,
}: EntradaDaMarcacao): ResultadoDoPlano {
  if (!podeRegistrarNaData(data, agora)) {
    return { ok: false, erro: ERRO_DIA_FUTURO };
  }
  const status = proximoStatus(anterior?.status ?? null, tocado);
  const acaoAtual = anterior?.acaoId ?? null;

  if (status === null) {
    return { ok: true, valor: { registro: null, criarAcao: null, removerAcaoId: acaoAtual } };
  }

  const { atividade } = ocorrencia;
  const precisaDeAcao = status === "feito" && atividade.categoria !== null;
  const criarAcao: AcaoAGerar | null =
    precisaDeAcao && acaoAtual === null && atividade.categoria !== null
      ? {
          categoria: atividade.categoria,
          ...(atividade.categoria === "outro" ? { rotulo: atividade.nome } : {}),
        }
      : null;

  const registro: RegistroCompromisso = {
    id: anterior?.id ?? novoId(),
    origem: ocorrencia.origem,
    origemId: ocorrencia.id,
    atividadeId: atividade.id,
    nomeAtividade: atividade.nome,
    categoria: atividade.categoria,
    data,
    inicio: ocorrencia.inicio,
    fim: ocorrencia.fim,
    status,
    acaoId: precisaDeAcao ? acaoAtual : null,
    registradoEm: agora.toISOString(),
  };
  return {
    ok: true,
    valor: {
      registro,
      criarAcao,
      removerAcaoId: !precisaDeAcao && acaoAtual !== null ? acaoAtual : null,
    },
  };
}

/** Troca o registro da ocorrência naquela data (ou remove, com `novo` null). */
export function substituirRegistro(
  registros: readonly RegistroCompromisso[],
  chaveDaOcorrencia: string,
  data: string,
  novo: RegistroCompromisso | null,
): RegistroCompromisso[] {
  const outros = registros.filter(
    (r) => !(r.data === data && chaveDaOrigem(r) === chaveDaOcorrencia),
  );
  return novo === null ? outros : [...outros, novo];
}

/**
 * Depois de dividir uma agenda "a partir de hoje", os compromissos ganham ids novos. Os registros
 * de hoje em diante passam a apontar para as cópias, para a marcação de hoje não sumir da tela.
 */
export function remapearRegistros(
  registros: readonly RegistroCompromisso[],
  idsNovos: Readonly<Record<string, string>>,
  aPartirDe: string,
): RegistroCompromisso[] {
  return registros.map((r) => {
    const novoId = r.origem === "agenda" ? idsNovos[r.origemId] : undefined;
    return novoId !== undefined && r.data >= aPartirDe ? { ...r, origemId: novoId } : r;
  });
}

/** Contagem do dia sobre o que está na agenda agora. Registro de compromisso removido não conta. */
export function resumoDoDia(
  ocorrencias: readonly Ocorrencia[],
  registros: readonly RegistroCompromisso[],
  data: string,
): Resumo {
  let feitos = 0;
  let naoFui = 0;
  for (const ocorrencia of ocorrencias) {
    const status = registroDaOcorrencia(registros, ocorrencia.chave, data)?.status;
    if (status === "feito") feitos += 1;
    if (status === "nao_fui") naoFui += 1;
  }
  return {
    total: ocorrencias.length,
    feitos,
    naoFui,
    pendentes: ocorrencias.length - feitos - naoFui,
  };
}

/** Texto do toast depois de marcar. */
export function mensagemDaMarcacao(nome: string, status: StatusDoRegistro | null): string {
  if (status === "feito") return `Feito: ${nome}`;
  if (status === "nao_fui") return `Não fui: ${nome}`;
  return `Registro removido: ${nome}`;
}

/** "Feitos: 2 de 5" */
export function textoDoResumo({ total, feitos }: Resumo): string {
  return `Feitos: ${feitos} de ${total}`;
}

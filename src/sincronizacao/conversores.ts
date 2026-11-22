/**
 * Conversores puros entre os tipos do app e as linhas das tabelas do Supabase
 * (supabase/migrations/001 e 002). A leitura valida com as mesmas regras dos repositórios locais:
 * linha inválida vira null e é ignorada por quem chama.
 */
import { acaoValida } from "../data/AcoesRepository";
import { ROTULO_MAX, type Acao } from "../domain/acoes";
import {
  ICONES_ATIVIDADE,
  NOME_ATIVIDADE_MAX,
  dataValida,
  validarAgenda,
  validarAvulso,
  validarCompromisso,
  type Agenda,
  type Atividade,
  type Avulso,
  type Compromisso,
  type DiaDaSemana,
  type IconeAtividade,
} from "../domain/agenda";
import { CATEGORIAS, type CategoriaId } from "../domain/categorias";
import { validarNome, normalizarNome } from "../domain/perfil";
import { validarRegistro, type RegistroCompromisso } from "../domain/registros";

/** Agenda sem a lista: no banco os compromissos ficam em tabela própria. */
export type AgendaSemCompromissos = Omit<Agenda, "compromissos">;
/** Compromisso com a agenda a que pertence (no app ele fica aninhado na agenda). */
export type CompromissoComAgenda = Compromisso & { agendaId: string };

export type AtividadeLinha = {
  user_id: string;
  id: string;
  nome: string;
  icone: string;
  categoria: string | null;
  criada_em: string;
};

export type AgendaLinha = {
  user_id: string;
  id: string;
  nome: string;
  inicio: string;
  fim: string;
};

export type CompromissoLinha = {
  user_id: string;
  id: string;
  agenda_id: string;
  atividade_id: string;
  dias: number[];
  inicio: string;
  fim: string | null;
  detalhe: string | null;
  antecedencia_min: number | null;
};

export type AvulsoLinha = {
  user_id: string;
  id: string;
  atividade_id: string;
  data: string;
  inicio: string;
  fim: string | null;
  detalhe: string | null;
  /** Coluna criada pela migração 003 */
  antecedencia_min: number | null;
};

export type RegistroLinha = {
  user_id: string;
  id: string;
  origem: string;
  origem_id: string;
  atividade_id: string;
  nome_atividade: string;
  categoria: string | null;
  data: string;
  inicio: string;
  fim: string | null;
  status: string;
  acao_id: string | null;
  registrado_em: string;
};

/** Sem recebido_em: o servidor carimba a hora em que recebeu. */
export type AcaoLinha = {
  user_id: string;
  id: string;
  categoria: string;
  rotulo: string | null;
  criado_em: string;
};

type Bruto = Record<string, unknown>;

function objeto(valor: unknown): Bruto | null {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Bruto)
    : null;
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.length > 0 ? valor : null;
}

/** undefined quando o valor não é texto nem nulo (linha inválida). */
function textoOuNulo(valor: unknown): string | null | undefined {
  if (valor === null) return null;
  return typeof valor === "string" ? valor : undefined;
}

/** "05:00:00" (time do Postgres) ou "05:00" viram "05:00". Outro formato vira null. */
export function horaDoBanco(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const partes = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(valor);
  return partes === null ? null : `${partes[1]}:${partes[2]}`;
}

/** Instante em ISO 8601 com "Z" (o Postgres devolve "+00:00" e microssegundos). */
export function instanteDoBanco(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const ms = Date.parse(valor);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** "2026-11-15" de uma coluna date; aceita só AAAA-MM-DD que existe no calendário. */
export function dataDoBanco(valor: unknown): string | null {
  return typeof valor === "string" && dataValida(valor) ? valor : null;
}

const CATEGORIAS_VALIDAS = new Set<string>(CATEGORIAS.map((c) => c.id));

function categoriaOuNula(valor: unknown): CategoriaId | null | undefined {
  if (valor === null) return null;
  return typeof valor === "string" && CATEGORIAS_VALIDAS.has(valor)
    ? (valor as CategoriaId)
    : undefined;
}

// Atividades ---------------------------------------------------------------------

export function atividadeParaLinha(a: Atividade, userId: string): AtividadeLinha {
  return {
    user_id: userId,
    id: a.id,
    nome: a.nome,
    icone: a.icone,
    categoria: a.categoria,
    criada_em: a.criadaEm,
  };
}

export function atividadeDaLinha(bruto: unknown): Atividade | null {
  const r = objeto(bruto);
  const id = r && texto(r.id);
  const nome = r && typeof r.nome === "string" ? r.nome.trim() : "";
  const criadaEm = r && instanteDoBanco(r.criada_em);
  const categoria = r ? categoriaOuNula(r.categoria) : undefined;
  if (
    !r ||
    !id ||
    nome.length === 0 ||
    nome.length > NOME_ATIVIDADE_MAX ||
    !criadaEm ||
    categoria === undefined
  ) {
    return null;
  }
  if (!ICONES_ATIVIDADE.includes(r.icone as IconeAtividade)) return null;
  return { id, nome, icone: r.icone as IconeAtividade, categoria, criadaEm };
}

// Agendas ------------------------------------------------------------------------

export function agendaParaLinha(a: AgendaSemCompromissos, userId: string): AgendaLinha {
  return { user_id: userId, id: a.id, nome: a.nome, inicio: a.inicio, fim: a.fim };
}

export function agendaDaLinha(bruto: unknown): AgendaSemCompromissos | null {
  const r = objeto(bruto);
  const id = r && texto(r.id);
  const nome = r && typeof r.nome === "string" ? r.nome.trim() : "";
  const inicio = r && dataDoBanco(r.inicio);
  const fim = r && dataDoBanco(r.fim);
  if (!id || !inicio || !fim) return null;
  const agenda = { id, nome, inicio, fim };
  return validarAgenda(agenda, []) === null ? agenda : null;
}

// Compromissos -------------------------------------------------------------------

export function compromissoParaLinha(c: CompromissoComAgenda, userId: string): CompromissoLinha {
  return {
    user_id: userId,
    id: c.id,
    agenda_id: c.agendaId,
    atividade_id: c.atividadeId,
    dias: [...c.dias],
    inicio: c.inicio,
    fim: c.fim,
    detalhe: c.detalhe ?? null,
    antecedencia_min: c.antecedenciaMin ?? null,
  };
}

export function compromissoDaLinha(bruto: unknown): CompromissoComAgenda | null {
  const r = objeto(bruto);
  const id = r && texto(r.id);
  const agendaId = r && texto(r.agenda_id);
  const atividadeId = r && texto(r.atividade_id);
  const inicio = r && horaDoBanco(r.inicio);
  const fim = r && (r.fim === null ? null : horaDoBanco(r.fim));
  const detalhe = r && textoOuNulo(r.detalhe);
  if (!r || !id || !agendaId || !atividadeId || !inicio) return null;
  if (r.fim !== null && fim === null) return null;
  if (detalhe === undefined || !Array.isArray(r.dias)) return null;
  if (r.antecedencia_min !== null && typeof r.antecedencia_min !== "number") return null;
  const compromisso: CompromissoComAgenda = {
    id,
    agendaId,
    atividadeId,
    dias: r.dias as DiaDaSemana[],
    inicio,
    fim,
    ...(detalhe !== null ? { detalhe } : {}),
    ...(typeof r.antecedencia_min === "number" ? { antecedenciaMin: r.antecedencia_min } : {}),
  };
  const { id: _id, agendaId: _agenda, ...conteudo } = compromisso;
  return validarCompromisso(conteudo) === null ? compromisso : null;
}

// Avulsos ------------------------------------------------------------------------

export function avulsoParaLinha(a: Avulso, userId: string): AvulsoLinha {
  return {
    user_id: userId,
    id: a.id,
    atividade_id: a.atividadeId,
    data: a.data,
    inicio: a.inicio,
    fim: a.fim,
    detalhe: a.detalhe ?? null,
    antecedencia_min: a.antecedenciaMin ?? null,
  };
}

export function avulsoDaLinha(bruto: unknown): Avulso | null {
  const r = objeto(bruto);
  const id = r && texto(r.id);
  const atividadeId = r && texto(r.atividade_id);
  const data = r && dataDoBanco(r.data);
  const inicio = r && horaDoBanco(r.inicio);
  const fim = r && (r.fim === null ? null : horaDoBanco(r.fim));
  const detalhe = r && textoOuNulo(r.detalhe);
  if (!r || !id || !atividadeId || !data || !inicio || detalhe === undefined) return null;
  if (r.fim !== null && fim === null) return null;
  // Antes da migração 003 a coluna não existe (undefined): o avulso fica sem aviso.
  const antecedencia = r.antecedencia_min;
  if (antecedencia !== undefined && antecedencia !== null && typeof antecedencia !== "number") {
    return null;
  }
  const avulso: Avulso = {
    id,
    atividadeId,
    data,
    inicio,
    fim: fim ?? null,
    ...(detalhe !== null ? { detalhe } : {}),
    ...(typeof antecedencia === "number" ? { antecedenciaMin: antecedencia } : {}),
  };
  const { id: _id, ...conteudo } = avulso;
  return validarAvulso(conteudo) === null ? avulso : null;
}

// Registros ----------------------------------------------------------------------

export function registroParaLinha(r: RegistroCompromisso, userId: string): RegistroLinha {
  return {
    user_id: userId,
    id: r.id,
    origem: r.origem,
    origem_id: r.origemId,
    atividade_id: r.atividadeId,
    nome_atividade: r.nomeAtividade,
    categoria: r.categoria,
    data: r.data,
    inicio: r.inicio,
    fim: r.fim,
    status: r.status,
    acao_id: r.acaoId,
    registrado_em: r.registradoEm,
  };
}

export function registroDaLinha(bruto: unknown): RegistroCompromisso | null {
  const r = objeto(bruto);
  const id = r && texto(r.id);
  const origemId = r && texto(r.origem_id);
  const atividadeId = r && texto(r.atividade_id);
  const nomeAtividade = r && typeof r.nome_atividade === "string" ? r.nome_atividade.trim() : "";
  const data = r && dataDoBanco(r.data);
  const inicio = r && horaDoBanco(r.inicio);
  const fim = r && (r.fim === null ? null : horaDoBanco(r.fim));
  const registradoEm = r && instanteDoBanco(r.registrado_em);
  const acaoId = r && textoOuNulo(r.acao_id);
  const categoria = r ? categoriaOuNula(r.categoria) : undefined;
  if (!r || !id || !origemId || !atividadeId || !data || !inicio || !registradoEm) return null;
  if (r.fim !== null && fim === null) return null;
  if (acaoId === undefined || categoria === undefined) return null;
  const registro: RegistroCompromisso = {
    id,
    origem: r.origem as RegistroCompromisso["origem"],
    origemId,
    atividadeId,
    nomeAtividade,
    categoria,
    data,
    inicio,
    fim: fim ?? null,
    status: r.status as RegistroCompromisso["status"],
    acaoId,
    registradoEm,
  };
  const { id: _id, ...conteudo } = registro;
  return validarRegistro(conteudo) === null ? registro : null;
}

// Ações --------------------------------------------------------------------------

/** O rótulo só existe no "outro" (regra do banco e do app). */
export function acaoParaLinha(a: Acao, userId: string): AcaoLinha {
  return {
    user_id: userId,
    id: a.id,
    categoria: a.categoria,
    rotulo: a.categoria === "outro" ? (a.rotulo ?? null) : null,
    criado_em: a.criadoEm,
  };
}

export function acaoDaLinha(bruto: unknown): Acao | null {
  const r = objeto(bruto);
  const criadoEm = r && instanteDoBanco(r.criado_em);
  const rotulo = r && textoOuNulo(r.rotulo);
  if (!r || !criadoEm || rotulo === undefined) return null;
  const acao = {
    id: r.id,
    categoria: r.categoria,
    criadoEm,
    ...(rotulo !== null ? { rotulo } : {}),
  };
  if (!acaoValida(acao)) return null;
  if (
    acao.categoria === "outro" &&
    (acao.rotulo === undefined || acao.rotulo.length > ROTULO_MAX)
  ) {
    return null;
  }
  return acao.categoria === "outro" ? acao : { id: acao.id, categoria: acao.categoria, criadoEm };
}

// Perfil -------------------------------------------------------------------------

/** Nome do perfil vindo de public.perfis: texto vazio ou ausente vira null. */
export function nomeDaLinha(bruto: unknown): string | null {
  const r = objeto(bruto);
  const nome = r && typeof r.nome === "string" ? normalizarNome(r.nome) : "";
  return validarNome(nome) === null ? nome : null;
}

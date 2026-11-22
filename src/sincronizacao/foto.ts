/**
 * Foto: o estado sincronizável em forma de tabelas (mapa id -> conteúdo normalizado), igual nos
 * três lados da mesclagem (base, aparelho e nuvem). Puro.
 */
import type { Acao } from "../domain/acoes";
import type { Atividade, Avulso, DadosAgenda } from "../domain/agenda";
import { normalizarNome } from "../domain/perfil";
import type { RegistroCompromisso } from "../domain/registros";
import {
  acaoDaLinha,
  agendaDaLinha,
  atividadeDaLinha,
  avulsoDaLinha,
  compromissoDaLinha,
  nomeDaLinha,
  registroDaLinha,
  type AgendaSemCompromissos,
  type CompromissoComAgenda,
} from "./conversores";

export const TABELAS = [
  "atividades",
  "agendas",
  "compromissos",
  "avulsos",
  "registros",
  "acoes",
] as const;

export type Tabela = (typeof TABELAS)[number];

export type Foto = {
  atividades: Map<string, Atividade>;
  agendas: Map<string, AgendaSemCompromissos>;
  compromissos: Map<string, CompromissoComAgenda>;
  avulsos: Map<string, Avulso>;
  registros: Map<string, RegistroCompromisso>;
  acoes: Map<string, Acao>;
  /** Nome do perfil; null quando a pessoa ainda não escolheu */
  nome: string | null;
};

/** O que o app guarda no aparelho e entra na sincronização. A foto do perfil fica de fora. */
export type EstadoSincronizavel = {
  acoes: readonly Acao[];
  agenda: DadosAgenda;
  nome: string;
};

/** Rótulo usado quando uma ação "outro" antiga não tem nome (o banco exige um). */
export const ROTULO_PADRAO_DO_OUTRO = "Outro";

export function fotoVazia(): Foto {
  return {
    atividades: new Map(),
    agendas: new Map(),
    compromissos: new Map(),
    avulsos: new Map(),
    registros: new Map(),
    acoes: new Map(),
    nome: null,
  };
}

/** Mesmo formato que sai dos conversores: campos opcionais ausentes, instantes em ISO com "Z". */
function normalizarAcao(acao: Acao): Acao {
  const criadoEm = new Date(acao.criadoEm).toISOString();
  if (acao.categoria !== "outro") {
    return { id: acao.id, categoria: acao.categoria, criadoEm };
  }
  const rotulo = acao.rotulo?.trim();
  return {
    id: acao.id,
    categoria: acao.categoria,
    criadoEm,
    rotulo: rotulo && rotulo.length > 0 ? rotulo : ROTULO_PADRAO_DO_OUTRO,
  };
}

function semOpcionaisVazios<T extends { detalhe?: string; antecedenciaMin?: number }>(item: T): T {
  const copia = { ...item };
  if (copia.detalhe === undefined) delete copia.detalhe;
  if (copia.antecedenciaMin === undefined) delete copia.antecedenciaMin;
  return copia;
}

function porId<T extends { id: string }>(itens: readonly T[]): Map<string, T> {
  return new Map(itens.map((item) => [item.id, item]));
}

export function fotoDoEstado({ acoes, agenda, nome }: EstadoSincronizavel): Foto {
  const compromissos: CompromissoComAgenda[] = [];
  for (const a of agenda.agendas) {
    for (const c of a.compromissos) {
      compromissos.push(semOpcionaisVazios({ ...c, dias: [...c.dias], agendaId: a.id }));
    }
  }
  const nomeLimpo = normalizarNome(nome);
  return {
    atividades: porId(
      agenda.atividades.map((a) => ({
        id: a.id,
        nome: a.nome,
        icone: a.icone,
        categoria: a.categoria,
        criadaEm: new Date(a.criadaEm).toISOString(),
      })),
    ),
    agendas: porId(
      agenda.agendas.map(({ id, nome: nomeDaAgenda, inicio, fim }) => ({
        id,
        nome: nomeDaAgenda,
        inicio,
        fim,
      })),
    ),
    compromissos: porId(compromissos),
    avulsos: porId(agenda.avulsos.map((v) => semOpcionaisVazios({ ...v }))),
    registros: porId(
      agenda.registros.map((r) => ({
        ...r,
        registradoEm: new Date(r.registradoEm).toISOString(),
      })),
    ),
    acoes: porId(acoes.map(normalizarAcao)),
    nome: nomeLimpo.length > 0 ? nomeLimpo : null,
  };
}

/** Linhas cruas da nuvem, uma lista por tabela, mais a linha do perfil. */
export type LinhasRemotas = Record<Tabela, readonly unknown[]> & { perfil: unknown };

export type FotoRemota = { foto: Foto; ignoradas: number };

function lerTabela<T extends { id: string }>(
  linhas: readonly unknown[],
  ler: (bruto: unknown) => T | null,
): { itens: Map<string, T>; ignoradas: number } {
  const itens = new Map<string, T>();
  let ignoradas = 0;
  for (const linha of linhas) {
    const item = ler(linha);
    if (item === null || itens.has(item.id)) {
      ignoradas += 1;
    } else {
      itens.set(item.id, item);
    }
  }
  return { itens, ignoradas };
}

/** Converte e valida as linhas da nuvem. Linha inválida é ignorada e contada. */
export function fotoDasLinhas(linhas: LinhasRemotas): FotoRemota {
  const atividades = lerTabela(linhas.atividades, atividadeDaLinha);
  const agendas = lerTabela(linhas.agendas, agendaDaLinha);
  const compromissos = lerTabela(linhas.compromissos, compromissoDaLinha);
  const avulsos = lerTabela(linhas.avulsos, avulsoDaLinha);
  const registros = lerTabela(linhas.registros, registroDaLinha);
  const acoes = lerTabela(linhas.acoes, acaoDaLinha);
  return {
    foto: {
      atividades: atividades.itens,
      agendas: agendas.itens,
      compromissos: compromissos.itens,
      avulsos: avulsos.itens,
      registros: registros.itens,
      acoes: acoes.itens,
      nome: nomeDaLinha(linhas.perfil),
    },
    ignoradas:
      atividades.ignoradas +
      agendas.ignoradas +
      compromissos.ignoradas +
      avulsos.ignoradas +
      registros.ignoradas +
      acoes.ignoradas,
  };
}

/** Ações em ordem de registro (o app mostra e conta a partir desta lista). */
export function acoesDaFoto(foto: Foto): Acao[] {
  return [...foto.acoes.values()].sort((a, b) =>
    a.criadoEm === b.criadoEm ? a.id.localeCompare(b.id) : a.criadoEm < b.criadoEm ? -1 : 1,
  );
}

/** Agenda no formato do app, com os compromissos aninhados de volta em cada agenda. */
export function agendaDaFoto(foto: Foto): DadosAgenda {
  const porAgenda = new Map<string, CompromissoComAgenda[]>();
  for (const c of foto.compromissos.values()) {
    porAgenda.set(c.agendaId, [...(porAgenda.get(c.agendaId) ?? []), c]);
  }
  return {
    atividades: [...foto.atividades.values()],
    agendas: [...foto.agendas.values()]
      .map((a) => ({
        ...a,
        compromissos: (porAgenda.get(a.id) ?? []).map(({ agendaId: _agendaId, ...c }) => c),
      }))
      .sort((a, b) => a.inicio.localeCompare(b.inicio)),
    avulsos: [...foto.avulsos.values()],
    registros: [...foto.registros.values()],
  };
}

// Serialização da base -------------------------------------------------------------

export const VERSAO_DA_BASE = 1;

type BaseSerializada = {
  versao: typeof VERSAO_DA_BASE;
  sincronizadoEm: string;
  nome: string | null;
} & Record<Tabela, unknown[]>;

export function serializarBase(foto: Foto, sincronizadoEm: Date): string {
  const conteudo: BaseSerializada = {
    versao: VERSAO_DA_BASE,
    sincronizadoEm: sincronizadoEm.toISOString(),
    nome: foto.nome,
    atividades: [...foto.atividades.values()],
    agendas: [...foto.agendas.values()],
    compromissos: [...foto.compromissos.values()],
    avulsos: [...foto.avulsos.values()],
    registros: [...foto.registros.values()],
    acoes: [...foto.acoes.values()],
  };
  return JSON.stringify(conteudo);
}

export type BaseLida = { foto: Foto; sincronizadoEm: Date };

function mapaDeIds<T>(lista: unknown): Map<string, T> | null {
  if (!Array.isArray(lista)) return null;
  const mapa = new Map<string, T>();
  for (const item of lista) {
    const id = typeof item === "object" && item !== null ? (item as { id?: unknown }).id : null;
    if (typeof id !== "string" || id.length === 0) return null;
    mapa.set(id, item as T);
  }
  return mapa;
}

/**
 * Lê a base gravada. Qualquer defeito devolve null: a próxima sincronização vira a "primeira"
 * (união dos dois lados, nada é apagado), que é o caminho seguro.
 */
export function lerBase(bruto: unknown): BaseLida | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  const b = bruto as Partial<BaseSerializada>;
  if (b.versao !== VERSAO_DA_BASE || typeof b.sincronizadoEm !== "string") return null;
  const sincronizadoEm = new Date(b.sincronizadoEm);
  if (Number.isNaN(sincronizadoEm.getTime())) return null;
  if (b.nome !== null && typeof b.nome !== "string") return null;
  const atividades = mapaDeIds<Atividade>(b.atividades);
  const agendas = mapaDeIds<AgendaSemCompromissos>(b.agendas);
  const compromissos = mapaDeIds<CompromissoComAgenda>(b.compromissos);
  const avulsos = mapaDeIds<Avulso>(b.avulsos);
  const registros = mapaDeIds<RegistroCompromisso>(b.registros);
  const acoes = mapaDeIds<Acao>(b.acoes);
  if (!atividades || !agendas || !compromissos || !avulsos || !registros || !acoes) return null;
  return {
    foto: { atividades, agendas, compromissos, avulsos, registros, acoes, nome: b.nome ?? null },
    sincronizadoEm,
  };
}

import {
  validarAgenda,
  validarAtividade,
  validarAvulso,
  validarCompromisso,
  type Atividade,
  type Avulso,
  type Compromisso,
  type DadosAgenda,
  type DiaDaSemana,
  type IconeAtividade,
} from "../domain/agenda";
import type { CategoriaId } from "../domain/categorias";
import {
  chaveDaOrigem,
  validarRegistro,
  type RegistroCompromisso,
  type StatusDoRegistro,
} from "../domain/registros";
import { criarFilaDeGravacao, lerJson, type ArmazenamentoChaveValor } from "./armazenamento";

/** Porta de persistência da agenda. A implementação remota (Supabase) entra na etapa 5. */
export interface AgendaRepository {
  carregar(): Promise<DadosAgenda>;
  salvar(dados: DadosAgenda): Promise<void>;
}

export const CHAVE_AGENDA = "blueprint:agenda";
/** 1: atividades, agendas e avulsos. 2: mais os registros de "Feito" e "Não fui". */
export const VERSAO_AGENDA = 2;
const VERSOES_LIDAS: readonly unknown[] = [1, VERSAO_AGENDA];
export const CHAVE_DESCARTADOS = `${CHAVE_AGENDA}:descartados`;

type Registro = Record<string, unknown>;

export type ResultadoDaLeituraAgenda = {
  dados: DadosAgenda;
  /** Itens descartados por estarem inválidos, repetidos ou órfãos */
  descartados: number;
  /** O conteúdo inteiro não foi reconhecido e foi guardado à parte */
  corrompido: boolean;
};

function vazios(): DadosAgenda {
  return { atividades: [], agendas: [], avulsos: [], registros: [] };
}

function registro(valor: unknown): Registro | null {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Registro)
    : null;
}

function lista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.length > 0 ? valor : null;
}

function textoOuNulo(valor: unknown): string | null | undefined {
  if (valor === null) return null;
  return typeof valor === "string" ? valor : undefined;
}

function opcionais(r: Registro) {
  return {
    ...(typeof r.detalhe === "string" ? { detalhe: r.detalhe } : {}),
  };
}

function lerAtividade(bruto: unknown): Atividade | null {
  const r = registro(bruto);
  const id = r && texto(r.id);
  const nome = r && texto(r.nome);
  const criadaEm = r && texto(r.criadaEm);
  if (!r || !id || !nome || !criadaEm || Number.isNaN(Date.parse(criadaEm))) return null;
  if (r.categoria !== null && typeof r.categoria !== "string") return null;
  return {
    id,
    nome: nome.trim(),
    icone: r.icone as IconeAtividade,
    categoria: r.categoria as CategoriaId | null,
    criadaEm: new Date(criadaEm).toISOString(),
  };
}

function lerCompromisso(bruto: unknown): Compromisso | null {
  const r = registro(bruto);
  const id = r && texto(r.id);
  const atividadeId = r && texto(r.atividadeId);
  const inicio = r && texto(r.inicio);
  const fim = r && textoOuNulo(r.fim);
  if (!r || !id || !atividadeId || !inicio || fim === undefined) return null;
  if (!Array.isArray(r.dias)) return null;
  const antecedenciaMin = typeof r.antecedenciaMin === "number" ? r.antecedenciaMin : undefined;
  const compromisso: Compromisso = {
    id,
    atividadeId,
    dias: r.dias as DiaDaSemana[],
    inicio,
    fim,
    ...opcionais(r),
    ...(antecedenciaMin !== undefined ? { antecedenciaMin } : {}),
  };
  const { id: _id, ...semId } = compromisso;
  return validarCompromisso(semId) === null ? compromisso : null;
}

function lerAvulso(bruto: unknown): Avulso | null {
  const r = registro(bruto);
  const id = r && texto(r.id);
  const atividadeId = r && texto(r.atividadeId);
  const data = r && texto(r.data);
  const inicio = r && texto(r.inicio);
  const fim = r && textoOuNulo(r.fim);
  if (!r || !id || !atividadeId || !data || !inicio || fim === undefined) return null;
  const avulso: Avulso = { id, atividadeId, data, inicio, fim, ...opcionais(r) };
  const { id: _id, ...semId } = avulso;
  return validarAvulso(semId) === null ? avulso : null;
}

function lerRegistro(bruto: unknown): RegistroCompromisso | null {
  const r = registro(bruto);
  const id = r && texto(r.id);
  const origemId = r && texto(r.origemId);
  const atividadeId = r && texto(r.atividadeId);
  const nomeAtividade = r && texto(r.nomeAtividade);
  const data = r && texto(r.data);
  const inicio = r && texto(r.inicio);
  const registradoEm = r && texto(r.registradoEm);
  const fim = r && textoOuNulo(r.fim);
  const acaoId = r && textoOuNulo(r.acaoId);
  if (!r || !id || !origemId || !atividadeId || !nomeAtividade || !data || !inicio) return null;
  if (!registradoEm || fim === undefined || acaoId === undefined) return null;
  if (r.categoria !== null && typeof r.categoria !== "string") return null;
  const lido: RegistroCompromisso = {
    id,
    origem: r.origem as RegistroCompromisso["origem"],
    origemId,
    atividadeId,
    nomeAtividade,
    categoria: r.categoria as CategoriaId | null,
    data,
    inicio,
    fim,
    status: r.status as StatusDoRegistro,
    acaoId,
    registradoEm,
  };
  const { id: _id, ...semId } = lido;
  return validarRegistro(semId) === null ? lido : null;
}

/**
 * Registros não dependem de a atividade ou o compromisso ainda existirem: são a cópia do que
 * aconteceu. Só são descartados se inválidos ou repetidos (mesmo id ou mesmo compromisso no dia).
 */
function lerRegistros(brutos: unknown[]): {
  registros: RegistroCompromisso[];
  descartados: number;
} {
  const registros: RegistroCompromisso[] = [];
  const ids = new Set<string>();
  const ocorrencias = new Set<string>();
  let descartados = 0;
  for (const item of brutos) {
    const lido = lerRegistro(item);
    const ocorrencia = lido && `${chaveDaOrigem(lido)}@${lido.data}`;
    if (lido && ocorrencia && !ids.has(lido.id) && !ocorrencias.has(ocorrencia)) {
      ids.add(lido.id);
      ocorrencias.add(ocorrencia);
      registros.push(lido);
    } else {
      descartados += 1;
    }
  }
  return { registros, descartados };
}

/**
 * Converte o conteúdo salvo para a versão atual. Devolve null quando o formato não é
 * reconhecido. Cada item é validado: o que for inválido, repetido ou órfão é descartado.
 * A versão 1 não tinha registros e é lida com a lista vazia.
 */
export function migrarAgenda(bruto: unknown): { dados: DadosAgenda; descartados: number } | null {
  const raiz = registro(bruto);
  if (!raiz || !VERSOES_LIDAS.includes(raiz.versao)) {
    return null;
  }

  let descartados = 0;
  const dados = vazios();

  const idsDeAtividades = new Set<string>();
  for (const item of lista(raiz.atividades)) {
    const atividade = lerAtividade(item);
    if (
      atividade &&
      !idsDeAtividades.has(atividade.id) &&
      validarAtividade(atividade, dados.atividades) === null
    ) {
      idsDeAtividades.add(atividade.id);
      dados.atividades.push(atividade);
    } else {
      descartados += 1;
    }
  }

  const agendasBrutas = lista(raiz.agendas)
    .map(registro)
    .filter((r): r is Registro => r !== null)
    .sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)));
  descartados += lista(raiz.agendas).length - agendasBrutas.length;

  const idsDeAgendas = new Set<string>();
  const idsDeCompromissos = new Set<string>();
  for (const r of agendasBrutas) {
    const id = texto(r.id);
    const nome = texto(r.nome);
    const inicio = texto(r.inicio);
    const fim = texto(r.fim);
    const cabecalho = id && nome && inicio && fim ? { id, nome, inicio, fim } : null;
    if (
      !cabecalho ||
      idsDeAgendas.has(cabecalho.id) ||
      validarAgenda(cabecalho, dados.agendas) !== null
    ) {
      descartados += 1;
      continue;
    }
    idsDeAgendas.add(cabecalho.id);

    const compromissos: Compromisso[] = [];
    for (const item of lista(r.compromissos)) {
      const compromisso = lerCompromisso(item);
      if (
        compromisso &&
        idsDeAtividades.has(compromisso.atividadeId) &&
        !idsDeCompromissos.has(compromisso.id)
      ) {
        idsDeCompromissos.add(compromisso.id);
        compromissos.push(compromisso);
      } else {
        descartados += 1;
      }
    }
    dados.agendas.push({ ...cabecalho, compromissos });
  }

  const idsDeAvulsos = new Set<string>();
  for (const item of lista(raiz.avulsos)) {
    const avulso = lerAvulso(item);
    if (avulso && idsDeAtividades.has(avulso.atividadeId) && !idsDeAvulsos.has(avulso.id)) {
      idsDeAvulsos.add(avulso.id);
      dados.avulsos.push(avulso);
    } else {
      descartados += 1;
    }
  }

  const lidos = lerRegistros(raiz.versao === 1 ? [] : lista(raiz.registros));
  dados.registros = lidos.registros;
  descartados += lidos.descartados;

  return { dados, descartados };
}

/**
 * Lê a agenda para o app abrir. Se a leitura falhar (disco ocupado, cópia de segurança sem
 * espaço), devolve agenda vazia e `gravar: false`: o app não deve regravar por cima de dados
 * que talvez estejam íntegros no disco.
 */
export async function carregarAgendaSegura(
  repositorio: AgendaRepository,
  aoAvisar: (mensagem: string) => void = console.warn,
): Promise<{ dados: DadosAgenda; gravar: boolean }> {
  try {
    return { dados: await repositorio.carregar(), gravar: true };
  } catch (erro) {
    const motivo = erro instanceof Error ? ` (${erro.message})` : "";
    aoAvisar(`Falha ao ler a agenda salva${motivo}; ela não será alterada nesta sessão.`);
    return { dados: vazios(), gravar: false };
  }
}

type Opcoes = {
  aoAvisar?: (mensagem: string) => void;
  agora?: () => Date;
};

export function criarAgendaRepositoryLocal(
  armazenamento: ArmazenamentoChaveValor,
  { aoAvisar = console.warn, agora = () => new Date() }: Opcoes = {},
): AgendaRepository & { ler(): Promise<ResultadoDaLeituraAgenda> } {
  const enfileirar = criarFilaDeGravacao();

  async function ler(): Promise<ResultadoDaLeituraAgenda> {
    const conteudo = await armazenamento.getItem(CHAVE_AGENDA);
    if (conteudo === null) {
      return { dados: vazios(), descartados: 0, corrompido: false };
    }

    const resultado = migrarAgenda(lerJson(conteudo));
    if (resultado === null) {
      // Guarda o conteúdo não reconhecido para diagnóstico em vez de apagar sem rastro.
      const copia = `${CHAVE_AGENDA}:corrompido:${agora().getTime()}`;
      await armazenamento.setItem(copia, conteudo);
      await armazenamento.removeItem(CHAVE_AGENDA);
      aoAvisar(`Dados da agenda ilegíveis; cópia guardada em ${copia}.`);
      return { dados: vazios(), descartados: 0, corrompido: true };
    }
    if (resultado.descartados > 0) {
      // A primeira mudança regrava o disco sem os itens descartados: guarda o conteúdo bruto antes.
      // Mantém a cópia mais antiga (a original) e, se não conseguir guardar, falha a leitura.
      if ((await armazenamento.getItem(CHAVE_DESCARTADOS)) === null) {
        await armazenamento.setItem(CHAVE_DESCARTADOS, conteudo);
      }
      aoAvisar(
        `${resultado.descartados} item(ns) inválido(s) da agenda descartado(s) ao carregar.`,
      );
    }
    return { ...resultado, corrompido: false };
  }

  return {
    ler,
    async carregar() {
      return (await ler()).dados;
    },
    salvar(dados) {
      const conteudo = JSON.stringify({ versao: VERSAO_AGENDA, ...dados });
      return enfileirar(() => armazenamento.setItem(CHAVE_AGENDA, conteudo));
    },
  };
}

import { CATEGORIAS, type CategoriaId } from "./categorias";
import { MESES, chaveDoDia, somarDias } from "./datas";

/** 0 = domingo, como em `Date.getDay()`. */
export type DiaDaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const ICONES_ATIVIDADE = [
  "exercicio",
  "estudo",
  "hidratacao",
  "descanso",
  "outro",
  "sol",
  "lua",
] as const;

export type IconeAtividade = (typeof ICONES_ATIVIDADE)[number];

/** Catálogo: o que a pessoa faz. Mantém a identidade entre agendas de meses diferentes. */
export type Atividade = {
  id: string;
  nome: string;
  icone: IconeAtividade;
  categoria: CategoriaId | null;
  criadaEm: string;
};

/** Ocorrência semanal recorrente dentro de uma agenda. */
export type Compromisso = {
  id: string;
  atividadeId: string;
  dias: DiaDaSemana[];
  inicio: string;
  fim: string | null;
  detalhe?: string;
  antecedenciaMin?: number;
};

/** Período com seus compromissos. */
export type Agenda = {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
  compromissos: Compromisso[];
};

/** Compromisso de um único dia, fora das agendas. */
export type Avulso = {
  id: string;
  atividadeId: string;
  data: string;
  inicio: string;
  fim: string | null;
  detalhe?: string;
};

export type DadosAgenda = {
  atividades: Atividade[];
  agendas: Agenda[];
  avulsos: Avulso[];
};

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string };

export const DADOS_AGENDA_VAZIOS: DadosAgenda = { atividades: [], agendas: [], avulsos: [] };

export const NOME_ATIVIDADE_MAX = 40;
export const DETALHE_MAX = 60;
export const ANTECEDENCIA_MAX = 120;

export const ERRO_HORARIO = "Informe um horário no formato HH:MM";
export const ERRO_TERMINO = "O término deve ser depois do início";
export const ERRO_PERIODO_OCUPADO = "Já existe agenda neste período";

const PADRAO_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PADRAO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function horaValida(hora: string): boolean {
  return PADRAO_HORA.test(hora);
}

/** Minutos desde a meia-noite de uma hora já validada. */
export function minutosDoDia(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** AAAA-MM-DD de um dia que existe no calendário (recusa 30 de fevereiro). */
export function dataValida(texto: string): boolean {
  const partes = PADRAO_DATA.exec(texto);
  if (partes === null) {
    return false;
  }
  const [ano, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}

function normalizarNome(nome: string): string {
  return nome.trim().toLowerCase();
}

function validarHorarios(inicio: string, fim: string | null): string | null {
  if (!horaValida(inicio) || (fim !== null && !horaValida(fim))) {
    return ERRO_HORARIO;
  }
  if (fim !== null && minutosDoDia(fim) <= minutosDoDia(inicio)) {
    return ERRO_TERMINO;
  }
  return null;
}

export function validarAtividade(
  atividade: Pick<Atividade, "nome" | "icone" | "categoria"> & { id?: string },
  existentes: readonly Atividade[],
): string | null {
  const nome = atividade.nome.trim();
  if (nome.length === 0) {
    return "Informe o nome da atividade";
  }
  if (nome.length > NOME_ATIVIDADE_MAX) {
    return `O nome pode ter até ${NOME_ATIVIDADE_MAX} caracteres`;
  }
  if (!ICONES_ATIVIDADE.includes(atividade.icone)) {
    return "Escolha um ícone da lista";
  }
  if (
    atividade.categoria !== null &&
    !CATEGORIAS.some((categoria) => categoria.id === atividade.categoria)
  ) {
    return "Escolha uma categoria da lista";
  }
  const repetida = existentes.some(
    (outra) => outra.id !== atividade.id && normalizarNome(outra.nome) === normalizarNome(nome),
  );
  return repetida ? "Já existe uma atividade com este nome" : null;
}

function validarDetalhe(detalhe: string | undefined): string | null {
  return detalhe !== undefined && detalhe.length > DETALHE_MAX
    ? `O detalhe pode ter até ${DETALHE_MAX} caracteres`
    : null;
}

export function validarCompromisso(c: Omit<Compromisso, "id">): string | null {
  if (c.dias.length === 0) {
    return "Escolha pelo menos um dia";
  }
  const diasValidos = c.dias.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  if (!diasValidos || new Set(c.dias).size !== c.dias.length) {
    return "Os dias da semana são inválidos";
  }
  const erroHorario = validarHorarios(c.inicio, c.fim);
  if (erroHorario !== null) {
    return erroHorario;
  }
  const erroDetalhe = validarDetalhe(c.detalhe);
  if (erroDetalhe !== null) {
    return erroDetalhe;
  }
  if (
    c.antecedenciaMin !== undefined &&
    (!Number.isInteger(c.antecedenciaMin) ||
      c.antecedenciaMin < 0 ||
      c.antecedenciaMin > ANTECEDENCIA_MAX)
  ) {
    return `A antecedência deve ficar entre 0 e ${ANTECEDENCIA_MAX} minutos`;
  }
  return null;
}

export function validarAvulso(a: Omit<Avulso, "id">): string | null {
  if (!dataValida(a.data)) {
    return "Informe uma data válida";
  }
  return validarHorarios(a.inicio, a.fim) ?? validarDetalhe(a.detalhe);
}

type Periodo = { inicio: string; fim: string };

/** Períodos inclusivos em AAAA-MM-DD; compartilhar um único dia já é sobreposição. */
export function periodosSeSobrepoem(a: Periodo, b: Periodo): boolean {
  return a.inicio <= b.fim && b.inicio <= a.fim;
}

export function validarAgenda(
  agenda: { id?: string; nome: string; inicio: string; fim: string },
  outras: readonly Agenda[],
): string | null {
  if (agenda.nome.trim().length === 0) {
    return "Informe o nome da agenda";
  }
  if (!dataValida(agenda.inicio) || !dataValida(agenda.fim)) {
    return "Informe datas válidas no formato AAAA-MM-DD";
  }
  if (agenda.fim < agenda.inicio) {
    return "O fim do período deve ser igual ou depois do início";
  }
  const ocupado = outras.some(
    (outra) => outra.id !== agenda.id && periodosSeSobrepoem(agenda, outra),
  );
  return ocupado ? ERRO_PERIODO_OCUPADO : null;
}

/** Um compromisso de um dia específico, venha ele da agenda ou seja avulso. */
export type Ocorrencia = {
  /** "agenda:<id>" ou "avulso:<id>" */
  chave: string;
  origem: "agenda" | "avulso";
  id: string;
  agendaId: string | null;
  atividade: Atividade;
  inicio: string;
  fim: string | null;
  detalhe?: string;
  antecedenciaMin?: number;
};

export function agendaDaData(agendas: readonly Agenda[], data: Date): Agenda | undefined {
  const chave = chaveDoDia(data);
  return agendas.find((agenda) => agenda.inicio <= chave && chave <= agenda.fim);
}

function compararOcorrencias(a: Ocorrencia, b: Ocorrencia): number {
  if (a.inicio !== b.inicio) {
    return a.inicio < b.inicio ? -1 : 1;
  }
  if (a.fim !== b.fim) {
    if (a.fim === null) return -1;
    if (b.fim === null) return 1;
    return a.fim < b.fim ? -1 : 1;
  }
  return a.atividade.nome.localeCompare(b.atividade.nome);
}

/** Compromissos da agenda do dia que repetem naquele dia da semana, mais os avulsos da data. */
export function ocorrenciasDoDia(dados: DadosAgenda, data: Date): Ocorrencia[] {
  const chave = chaveDoDia(data);
  const atividades = new Map(dados.atividades.map((a) => [a.id, a]));
  const ocorrencias: Ocorrencia[] = [];

  const agenda = agendaDaData(dados.agendas, data);
  for (const c of agenda?.compromissos ?? []) {
    const atividade = atividades.get(c.atividadeId);
    if (atividade && c.dias.includes(data.getDay() as DiaDaSemana)) {
      ocorrencias.push({
        chave: `agenda:${c.id}`,
        origem: "agenda",
        id: c.id,
        agendaId: agenda?.id ?? null,
        atividade,
        inicio: c.inicio,
        fim: c.fim,
        ...(c.detalhe !== undefined ? { detalhe: c.detalhe } : {}),
        ...(c.antecedenciaMin !== undefined ? { antecedenciaMin: c.antecedenciaMin } : {}),
      });
    }
  }
  for (const v of dados.avulsos) {
    const atividade = atividades.get(v.atividadeId);
    if (atividade && v.data === chave) {
      ocorrencias.push({
        chave: `avulso:${v.id}`,
        origem: "avulso",
        id: v.id,
        agendaId: null,
        atividade,
        inicio: v.inicio,
        fim: v.fim,
        ...(v.detalhe !== undefined ? { detalhe: v.detalhe } : {}),
      });
    }
  }
  return ocorrencias.sort(compararOcorrencias);
}

type Horario = { inicio: string; fim: string | null };

function sobrepoeNoDia(a: Horario, b: Horario): boolean {
  const inicioA = minutosDoDia(a.inicio);
  const fimA = a.fim === null ? inicioA : minutosDoDia(a.fim);
  const inicioB = minutosDoDia(b.inicio);
  const fimB = b.fim === null ? inicioB : minutosDoDia(b.fim);
  if (inicioA === fimA && inicioB === fimB) return inicioA === inicioB;
  // Evento sem término é um instante: conflita se cai dentro do outro, mas encostar no fim não conta.
  if (inicioA === fimA) return inicioB <= inicioA && inicioA < fimB;
  if (inicioB === fimB) return inicioA <= inicioB && inicioB < fimA;
  return inicioA < fimB && inicioB < fimA;
}

/** Ids dos compromissos que dividem algum dia da semana com outro de horário sobreposto. */
export function compromissosEmConflito(compromissos: readonly Compromisso[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < compromissos.length; i++) {
    for (let j = i + 1; j < compromissos.length; j++) {
      const [a, b] = [compromissos[i], compromissos[j]];
      if (a.dias.some((dia) => b.dias.includes(dia)) && sobrepoeNoDia(a, b)) {
        ids.add(a.id);
        ids.add(b.id);
      }
    }
  }
  return ids;
}

/** Chaves das ocorrências cujos horários se sobrepõem a outra do mesmo dia. */
export function chavesEmConflito(ocorrencias: readonly Ocorrencia[]): Set<string> {
  const chaves = new Set<string>();
  for (let i = 0; i < ocorrencias.length; i++) {
    for (let j = i + 1; j < ocorrencias.length; j++) {
      if (sobrepoeNoDia(ocorrencias[i], ocorrencias[j])) {
        chaves.add(ocorrencias[i].chave);
        chaves.add(ocorrencias[j].chave);
      }
    }
  }
  return chaves;
}

/** "Novembro de 2026" (`mes` de 0 a 11, como em `Date`). */
export function nomeDeAgendaDoMes(ano: number, mes: number): string {
  const nome = MESES[mes];
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
}

function copiarCompromissos(
  compromissos: readonly Compromisso[],
  novoId: () => string,
): { copias: Compromisso[]; idsNovos: Record<string, string> } {
  const idsNovos: Record<string, string> = {};
  const copias = compromissos.map((c) => {
    const id = novoId();
    idsNovos[c.id] = id;
    return { ...c, id, dias: [...c.dias] };
  });
  return { copias, idsNovos };
}

/** Copia a agenda para o mês de calendário inteiro seguinte ao fim dela, mantendo as atividades. */
export function duplicarParaProximoMes(
  dados: DadosAgenda,
  agendaId: string,
  novoId: () => string,
): Resultado<Agenda> {
  const origem = dados.agendas.find((a) => a.id === agendaId);
  if (!origem) {
    return { ok: false, erro: "Agenda não encontrada" };
  }
  const [anoFim, mesFim] = origem.fim.split("-").map(Number);
  const primeiro = new Date(anoFim, mesFim, 1);
  const ultimo = new Date(anoFim, mesFim + 1, 0);
  const id = novoId();
  const nova: Agenda = {
    id,
    nome: nomeDeAgendaDoMes(primeiro.getFullYear(), primeiro.getMonth()),
    inicio: chaveDoDia(primeiro),
    fim: chaveDoDia(ultimo),
    compromissos: copiarCompromissos(origem.compromissos, novoId).copias,
  };
  const erro = validarAgenda(nova, dados.agendas);
  return erro === null ? { ok: true, valor: nova } : { ok: false, erro };
}

const SUFIXO_DE_DIVISAO = / \(a partir de \d{2}\/\d{2}\)$/;

/** Date local (meia-noite) de um AAAA-MM-DD válido, ou null. */
export function dataDaChave(chave: string): Date | null {
  if (!dataValida(chave)) {
    return null;
  }
  const [ano, mes, dia] = chave.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

/**
 * Trecho do mês de `dia` que nenhuma agenda cobre ao redor dele: começa no dia seguinte à agenda
 * que termina antes e termina na véspera da agenda que começa depois (sem passar do mês).
 */
export function periodoLivreDoMes(
  agendas: readonly Agenda[],
  dia: Date,
): { inicio: string; fim: string } {
  const chave = chaveDoDia(dia);
  const inicioDoMes = chaveDoDia(new Date(dia.getFullYear(), dia.getMonth(), 1));
  const fimDoMes = chaveDoDia(new Date(dia.getFullYear(), dia.getMonth() + 1, 0));
  let inicio = inicioDoMes;
  let fim = fimDoMes;
  for (const agenda of agendas) {
    const fimDaAgenda = dataDaChave(agenda.fim);
    const inicioDaAgenda = dataDaChave(agenda.inicio);
    if (fimDaAgenda && agenda.fim < chave && agenda.fim >= inicioDoMes) {
      const seguinte = chaveDoDia(somarDias(fimDaAgenda, 1));
      if (seguinte > inicio) inicio = seguinte;
    }
    if (inicioDaAgenda && agenda.inicio > chave && agenda.inicio <= fimDoMes) {
      const vespera = chaveDoDia(somarDias(inicioDaAgenda, -1));
      if (vespera < fim) fim = vespera;
    }
  }
  return { inicio, fim };
}

/** Já tem dias passados e ainda não terminou: editar "a partir de hoje" faz sentido. */
export function agendaEmCurso(agenda: Agenda, hoje: Date): boolean {
  const chave = chaveDoDia(hoje);
  return agenda.inicio < chave && chave <= agenda.fim;
}

/**
 * Divide a agenda em curso: a original termina ontem e uma nova começa hoje com cópias dos
 * compromissos. `idsNovos` liga o id de cada compromisso original ao da cópia.
 */
export function dividirAPartirDe(
  agenda: Agenda,
  hoje: Date,
  novoId: () => string,
): { anterior: Agenda; nova: Agenda; idsNovos: Record<string, string> } {
  const { copias, idsNovos } = copiarCompromissos(agenda.compromissos, novoId);
  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const nova: Agenda = {
    id: novoId(),
    nome: `${agenda.nome.replace(SUFIXO_DE_DIVISAO, "")} (a partir de ${dia}/${mes})`,
    inicio: chaveDoDia(hoje),
    fim: agenda.fim,
    compromissos: copias,
  };
  return { anterior: { ...agenda, fim: chaveDoDia(somarDias(hoje, -1)) }, nova, idsNovos };
}

export function atividadeEmUso(dados: DadosAgenda, atividadeId: string): boolean {
  return (
    dados.agendas.some((a) => a.compromissos.some((c) => c.atividadeId === atividadeId)) ||
    dados.avulsos.some((v) => v.atividadeId === atividadeId)
  );
}

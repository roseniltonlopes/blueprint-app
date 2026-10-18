import type { Acao } from "./acoes";
import { chaveDoDia, diasDaSemana, inicioDoDia, rotuloDoDia, somarDias } from "./datas";

/**
 * Regras de docs/05 seção 2 (sequência, melhor dia, agrupamento por dia).
 * Funções puras: Histórico, Calendário e Perfil usam as mesmas para os totais baterem.
 */

/** Quantidade de ações por chave de dia (AAAA-MM-DD). */
export function contarPorDia(acoes: readonly Acao[]): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const acao of acoes) {
    const chave = chaveDoDia(new Date(acao.criadoEm));
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return contagem;
}

export type DiaDoGrafico = {
  data: Date;
  total: number;
  ehHoje: boolean;
  futuro: boolean;
};

export function semanaDoGrafico(
  domingo: Date,
  porDia: ReadonlyMap<string, number>,
  hoje: Date,
): DiaDoGrafico[] {
  const chaveHoje = chaveDoDia(hoje);
  const inicioHoje = inicioDoDia(hoje).getTime();
  return diasDaSemana(domingo).map((data) => ({
    data,
    total: porDia.get(chaveDoDia(data)) ?? 0,
    ehHoje: chaveDoDia(data) === chaveHoje,
    futuro: data.getTime() > inicioHoje,
  }));
}

/**
 * Dias consecutivos com pelo menos 1 ação até hoje. Se hoje ainda está vazio,
 * a sequência vale até a meia-noite e conta a partir de ontem.
 */
export function sequenciaAtual(porDia: ReadonlyMap<string, number>, hoje: Date): number {
  let dia = inicioDoDia(hoje);
  if (!porDia.get(chaveDoDia(dia))) {
    dia = somarDias(dia, -1);
  }
  let sequencia = 0;
  while ((porDia.get(chaveDoDia(dia)) ?? 0) > 0) {
    sequencia += 1;
    dia = somarDias(dia, -1);
  }
  return sequencia;
}

/** Índice do dia com mais ações; empate fica com o mais recente. Null se nenhum tem ação. */
export function indiceDoMelhorDia(dias: readonly Pick<DiaDoGrafico, "total">[]): number | null {
  let melhor: number | null = null;
  dias.forEach((dia, i) => {
    if (dia.total > 0 && (melhor === null || dia.total >= dias[melhor].total)) {
      melhor = i;
    }
  });
  return melhor;
}

export type NivelDeIntensidade = 0 | 1 | 2 | 3 | 4;

/** 0 ações → 0; 1 a 2 → 1; 3 a 4 → 2; 5 → 3; 6 ou mais → 4 (docs/04, rampa). */
export function nivelDeIntensidade(total: number): NivelDeIntensidade {
  if (total <= 0) return 0;
  if (total <= 2) return 1;
  if (total <= 4) return 2;
  if (total === 5) return 3;
  return 4;
}

/** Soma de todas as ações. É o "ações registradas" do Perfil. */
export function totalGeral(porDia: ReadonlyMap<string, number>): number {
  let total = 0;
  for (const quantidade of porDia.values()) {
    total += quantidade;
  }
  return total;
}

export type ResumoDoMes = { total: number; diasComRegistro: number };

/** Total do mês e dias com pelo menos 1 ação. `mes` vai de 0 a 11. */
export function resumoDoMes(
  porDia: ReadonlyMap<string, number>,
  ano: number,
  mes: number,
): ResumoDoMes {
  const prefixo = `${ano}-${String(mes + 1).padStart(2, "0")}-`;
  let total = 0;
  let diasComRegistro = 0;
  for (const [chave, quantidade] of porDia) {
    if (chave.startsWith(prefixo) && quantidade > 0) {
      total += quantidade;
      diasComRegistro += 1;
    }
  }
  return { total, diasComRegistro };
}

export type CelulaDoMapa = {
  data: Date;
  total: number;
  nivel: NivelDeIntensidade;
  futuro: boolean;
};

/**
 * Mapa de calor: `semanas` colunas (domingo a sábado), a última é a semana atual.
 * Retorna as colunas da mais antiga para a mais recente.
 */
export function mapaDeCalor(
  porDia: ReadonlyMap<string, number>,
  hoje: Date,
  semanas = 12,
): CelulaDoMapa[][] {
  const inicioHoje = inicioDoDia(hoje).getTime();
  const domingoAtual = somarDias(inicioDoDia(hoje), -hoje.getDay());
  return Array.from({ length: semanas }, (_, coluna) => {
    const domingo = somarDias(domingoAtual, -7 * (semanas - 1 - coluna));
    return diasDaSemana(domingo).map((data) => {
      const total = porDia.get(chaveDoDia(data)) ?? 0;
      return { data, total, nivel: nivelDeIntensidade(total), futuro: data.getTime() > inicioHoje };
    });
  });
}

export type GrupoDoDia = {
  chave: string;
  titulo: string;
  total: number;
  data: Acao[];
};

/** Ações agrupadas por dia, do mais recente para o mais antigo (formato de SectionList). */
export function agruparPorDia(acoes: readonly Acao[], hoje: Date): GrupoDoDia[] {
  const ordenadas = [...acoes].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const grupos: GrupoDoDia[] = [];
  for (const acao of ordenadas) {
    const quando = new Date(acao.criadoEm);
    const chave = chaveDoDia(quando);
    let grupo = grupos[grupos.length - 1];
    if (!grupo || grupo.chave !== chave) {
      grupo = { chave, titulo: rotuloDoDia(quando, hoje), total: 0, data: [] };
      grupos.push(grupo);
    }
    grupo.data.push(acao);
    grupo.total += 1;
  }
  return grupos;
}

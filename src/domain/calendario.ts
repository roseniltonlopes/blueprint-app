/**
 * Ligação entre a Agenda e o Calendário. A Agenda é o plano (o que se pretende fazer em cada dia);
 * o Calendário mostra quanto desse plano foi cumprido, dia a dia. Funções puras.
 */
import { ocorrenciasDoDia, type DadosAgenda } from "./agenda";
import { chaveDoDia } from "./datas";
import { resumoDoDia } from "./registros";

export type PlanoDoDia = {
  /** Compromissos que a agenda previa para o dia */
  planejados: number;
  feitos: number;
  naoFeitos: number;
  /** De 0 a 100, arredondado; null quando o dia não tinha nada planejado */
  percentual: number | null;
};

export const SEM_PLANO: PlanoDoDia = { planejados: 0, feitos: 0, naoFeitos: 0, percentual: null };

/** Quanto do plano de um dia foi cumprido ("Feito" sobre o total de compromissos do dia). */
export function planoDoDia(dados: DadosAgenda, dia: Date): PlanoDoDia {
  const ocorrencias = ocorrenciasDoDia(dados, dia);
  if (ocorrencias.length === 0) return SEM_PLANO;
  const resumo = resumoDoDia(ocorrencias, dados.registros, chaveDoDia(dia));
  return {
    planejados: resumo.total,
    feitos: resumo.feitos,
    naoFeitos: resumo.naoFui,
    percentual: Math.round((resumo.feitos / resumo.total) * 100),
  };
}

/** Plano de cada dia do mês (mes de 0 a 11), pela chave AAAA-MM-DD. Dias sem plano ficam de fora. */
export function planoDoMes(dados: DadosAgenda, ano: number, mes: number): Map<string, PlanoDoDia> {
  const porDia = new Map<string, PlanoDoDia>();
  const dias = new Date(ano, mes + 1, 0).getDate();
  for (let dia = 1; dia <= dias; dia += 1) {
    const data = new Date(ano, mes, dia);
    const plano = planoDoDia(dados, data);
    if (plano.planejados > 0) porDia.set(chaveDoDia(data), plano);
  }
  return porDia;
}

export type NivelDoCumprimento = 0 | 1 | 2 | 3 | 4;

/**
 * Nível da cor do dia: 0 nada feito, 1 até 33%, 2 até 66%, 3 até 99% e 4 tudo feito.
 * Dia sem plano também é 0; quem desenha decide mostrá-lo sem cor.
 */
export function nivelDoCumprimento(percentual: number | null): NivelDoCumprimento {
  if (percentual === null || percentual <= 0) return 0;
  if (percentual <= 33) return 1;
  if (percentual <= 66) return 2;
  if (percentual < 100) return 3;
  return 4;
}

export type ResumoDoPlano = {
  planejados: number;
  feitos: number;
  /** null quando nenhum dia até hoje tinha plano */
  percentual: number | null;
};

/**
 * Cumprimento do mês só com os dias que já chegaram (até `hoje`, inclusive): o futuro ainda não
 * pode ter sido cumprido e puxaria a porcentagem para baixo.
 */
export function resumoDoPlano(porDia: ReadonlyMap<string, PlanoDoDia>, hoje: Date): ResumoDoPlano {
  const limite = chaveDoDia(hoje);
  let planejados = 0;
  let feitos = 0;
  for (const [chave, plano] of porDia) {
    if (chave > limite) continue;
    planejados += plano.planejados;
    feitos += plano.feitos;
  }
  return {
    planejados,
    feitos,
    percentual: planejados === 0 ? null : Math.round((feitos / planejados) * 100),
  };
}

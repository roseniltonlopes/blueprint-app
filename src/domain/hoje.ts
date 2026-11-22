import { minutosDoDia, type Ocorrencia } from "./agenda";
import { registroDaOcorrencia, type RegistroCompromisso } from "./registros";

/** Compromisso sem horário de término ("Acordar 04:30") conta como "agora" por esta janela. */
export const JANELA_SEM_TERMINO_MIN = 30;

/** "Bom dia" até 11:59, "Boa tarde" até 17:59, "Boa noite" no resto. */
export function saudacao(agora: Date): string {
  const hora = agora.getHours();
  if (hora >= 5 && hora < 12) {
    return "Bom dia";
  }
  if (hora >= 12 && hora < 18) {
    return "Boa tarde";
  }
  return "Boa noite";
}

/** 40 → "40 min"; 60 → "1h"; 220 → "3h40". */
export function formatarDuracao(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  if (total < 60) {
    return `${total} min`;
  }
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, "0")}`;
}

export type DestaqueDoDia =
  | {
      tipo: "agora";
      ocorrencia: Ocorrencia;
      minutosRestantes: number;
      /** Fração já decorrida, de 0 a 1 */
      progresso: number;
      depois: Ocorrencia | null;
    }
  | {
      tipo: "proximo";
      ocorrencia: Ocorrencia;
      minutosParaComecar: number;
      depois: Ocorrencia | null;
    };

function fimEfetivo(ocorrencia: Ocorrencia): number {
  const inicio = minutosDoDia(ocorrencia.inicio);
  return ocorrencia.fim === null ? inicio + JANELA_SEM_TERMINO_MIN : minutosDoDia(ocorrencia.fim);
}

/**
 * O compromisso que merece o topo da Home: o que está acontecendo agora e ainda não foi marcado;
 * senão, o próximo do dia ainda sem marcação. Sem nenhum dos dois, não há destaque.
 * `ocorrencias` vem em ordem de horário (como `ocorrenciasDoDia` devolve).
 */
export function destaqueDoDia(
  ocorrencias: readonly Ocorrencia[],
  registros: readonly RegistroCompromisso[],
  data: string,
  agora: Date,
): DestaqueDoDia | null {
  const minutoAtual = agora.getHours() * 60 + agora.getMinutes();
  const pendentes = ocorrencias.filter(
    (o) => registroDaOcorrencia(registros, o.chave, data) === undefined,
  );
  const depoisDe = (minuto: number, ignorar: string) =>
    pendentes.find((o) => o.chave !== ignorar && minutosDoDia(o.inicio) > minuto) ?? null;

  const emCurso = pendentes.find((o) => {
    const inicio = minutosDoDia(o.inicio);
    return inicio <= minutoAtual && minutoAtual < fimEfetivo(o);
  });
  if (emCurso) {
    const inicio = minutosDoDia(emCurso.inicio);
    const fim = fimEfetivo(emCurso);
    return {
      tipo: "agora",
      ocorrencia: emCurso,
      minutosRestantes: fim - minutoAtual,
      progresso: Math.min(1, Math.max(0, (minutoAtual - inicio) / (fim - inicio))),
      depois: depoisDe(minutoAtual, emCurso.chave),
    };
  }

  const proximo = pendentes.find((o) => minutosDoDia(o.inicio) > minutoAtual);
  if (proximo) {
    const inicio = minutosDoDia(proximo.inicio);
    return {
      tipo: "proximo",
      ocorrencia: proximo,
      minutosParaComecar: inicio - minutoAtual,
      depois: depoisDe(inicio, proximo.chave),
    };
  }
  return null;
}

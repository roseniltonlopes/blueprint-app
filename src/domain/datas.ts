/**
 * Datas no formato do app. O "dia" segue o relógio do aparelho até a Etapa 7,
 * quando passa a usar o fuso do perfil (docs/05, regra "Dia").
 * A formatação é manual para não depender do suporte a Intl de cada motor JS.
 */

const DIAS_DA_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

/** Chave do dia local no formato AAAA-MM-DD. */
export function chaveDoDia(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** "Sábado, 17 de outubro" */
export function formatarDataCabecalho(data: Date): string {
  return `${DIAS_DA_SEMANA[data.getDay()]}, ${data.getDate()} de ${MESES[data.getMonth()]}`;
}

/** "15:58" */
export function formatarHora(data: Date): string {
  const horas = String(data.getHours()).padStart(2, "0");
  const minutos = String(data.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
}

/** Abreviações do gráfico semanal, de domingo a sábado. */
export const DIAS_ABREVIADOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

/** Meia-noite local do dia de `data`. */
export function inicioDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

/** Soma dias de calendário (seguro na troca de horário de verão). */
export function somarDias(data: Date, dias: number): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

/** Domingo da semana de `data` (a semana do design vai de domingo a sábado). */
export function inicioDaSemana(data: Date): Date {
  return somarDias(inicioDoDia(data), -data.getDay());
}

/** Os 7 dias, de domingo a sábado, da semana que começa em `domingo`. */
export function diasDaSemana(domingo: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(domingo, i));
}

/** "11 a 17 de outubro" ou "27 de setembro a 3 de outubro" (com ano se mudar de ano). */
export function formatarIntervalo(inicio: Date, fim: Date): string {
  const mesmoAno = inicio.getFullYear() === fim.getFullYear();
  if (mesmoAno && inicio.getMonth() === fim.getMonth()) {
    return `${inicio.getDate()} a ${fim.getDate()} de ${MESES[fim.getMonth()]}`;
  }
  const sufixoInicio = mesmoAno ? "" : ` de ${inicio.getFullYear()}`;
  const sufixoFim = mesmoAno ? "" : ` de ${fim.getFullYear()}`;
  return (
    `${inicio.getDate()} de ${MESES[inicio.getMonth()]}${sufixoInicio} a ` +
    `${fim.getDate()} de ${MESES[fim.getMonth()]}${sufixoFim}`
  );
}

/** Título de grupo na lista do histórico: "Hoje", "Ontem" ou "Quinta-feira, 15 de outubro". */
export function rotuloDoDia(dia: Date, hoje: Date): string {
  const chave = chaveDoDia(dia);
  if (chave === chaveDoDia(hoje)) {
    return "Hoje";
  }
  if (chave === chaveDoDia(somarDias(hoje, -1))) {
    return "Ontem";
  }
  return formatarDataCabecalho(dia);
}

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

import { minutosDoDia, ocorrenciasDoDia, type DadosAgenda, type Ocorrencia } from "./agenda";
import { chaveDoDia, inicioDoDia, somarDias } from "./datas";
import { registroDaOcorrencia } from "./registros";

/** Janela de agendamento: o app reagenda ao abrir e a cada mudança da agenda. */
export const DIAS_DE_ALERTAS = 14;
/** Bem abaixo do limite de alarmes por app no Android (500). */
export const MAX_ALERTAS = 120;

export type AlertaPlanejado = {
  /** "<chave da ocorrência>@<AAAA-MM-DD>": único por compromisso e dia */
  id: string;
  chaveDaOcorrencia: string;
  /** AAAA-MM-DD do compromisso (não do aviso, que pode cair na véspera) */
  data: string;
  quando: Date;
  titulo: string;
  corpo: string;
};

/** Dados que viajam dentro da notificação para o botão "Feito" saber o que marcar. */
export type DadosDoAlerta = { chave: string; data: string };

/** "15 min", "1 h" ou "1 h 30 min". */
export function formatarAntecedencia(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

function textoDoAlerta(ocorrencia: Ocorrencia, antecedencia: number) {
  const titulo = `${ocorrencia.atividade.nome} às ${ocorrencia.inicio}`;
  const inicio =
    antecedencia === 0 ? "Está na hora." : `Começa em ${formatarAntecedencia(antecedencia)}.`;
  const corpo = ocorrencia.detalhe ? `${inicio} ${ocorrencia.detalhe}` : inicio;
  return { titulo, corpo };
}

/**
 * Alertas dos próximos dias, em ordem de horário. Só entram compromissos com "Avisar antes"
 * preenchido, cujo aviso ainda não passou e que ainda não foram marcados naquele dia.
 */
export function planejarAlertas(
  dados: DadosAgenda,
  agora: Date,
  dias: number = DIAS_DE_ALERTAS,
  maximo: number = MAX_ALERTAS,
): AlertaPlanejado[] {
  const alertas: AlertaPlanejado[] = [];
  const hoje = inicioDoDia(agora);
  for (let i = 0; i < dias; i++) {
    const dia = somarDias(hoje, i);
    const data = chaveDoDia(dia);
    for (const ocorrencia of ocorrenciasDoDia(dados, dia)) {
      const antecedencia = ocorrencia.antecedenciaMin;
      if (antecedencia === undefined) continue;
      if (registroDaOcorrencia(dados.registros, ocorrencia.chave, data)) continue;
      // Date ajusta minutos negativos para a véspera (aviso das 23:50 para um compromisso às 00:10).
      const quando = new Date(
        dia.getFullYear(),
        dia.getMonth(),
        dia.getDate(),
        0,
        minutosDoDia(ocorrencia.inicio) - antecedencia,
      );
      if (quando.getTime() <= agora.getTime()) continue;
      alertas.push({
        id: `${ocorrencia.chave}@${data}`,
        chaveDaOcorrencia: ocorrencia.chave,
        data,
        quando,
        ...textoDoAlerta(ocorrencia, antecedencia),
      });
    }
  }
  return alertas.sort((a, b) => a.quando.getTime() - b.quando.getTime()).slice(0, maximo);
}

/** Lê os dados de uma notificação; qualquer formato inesperado vira null. */
export function lerDadosDoAlerta(bruto: unknown): DadosDoAlerta | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  const { chave, data } = bruto as Record<string, unknown>;
  if (typeof chave !== "string" || !/^(agenda|avulso):.+/.test(chave)) return null;
  if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  return { chave, data };
}

import { chaveDoDia } from "../domain/datas";
import type { MotivoDaFalha } from "./porta";

export type EstadoDaSincronizacao =
  /** Sem conta, sem nuvem configurada ou sem sessão */
  | { tipo: "desligada" }
  /** Com sessão, esperando a primeira sincronização desta abertura */
  | { tipo: "aguardando" }
  | { tipo: "sincronizando" }
  | { tipo: "sincronizada"; em: Date }
  | { tipo: "falhou"; motivo: MotivoDaFalha; mensagem: string }
  /** Os dados do aparelho são de outra conta: só continua com a confirmação da pessoa */
  | { tipo: "confirmarTroca"; email: string }
  /** Os dados do aparelho não puderam ser lidos: sincronizar apagaria a nuvem */
  | { tipo: "pausada"; mensagem: string };

function hora(data: Date): string {
  const h = String(data.getHours()).padStart(2, "0");
  const m = String(data.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** "Sincronizado às 15:58" hoje; "Sincronizado em 20/11 às 15:58" em outro dia. */
export function textoDaUltimaSincronizacao(em: Date, hoje: Date): string {
  if (chaveDoDia(em) === chaveDoDia(hoje)) return `Sincronizado às ${hora(em)}`;
  const dia = String(em.getDate()).padStart(2, "0");
  const mes = String(em.getMonth() + 1).padStart(2, "0");
  return `Sincronizado em ${dia}/${mes} às ${hora(em)}`;
}

/** Linha de estado do cartão da conta. */
export function textoDoEstado(
  estado: EstadoDaSincronizacao,
  ultima: Date | null,
  hoje: Date,
): string {
  switch (estado.tipo) {
    case "desligada":
      return "";
    case "aguardando":
      return ultima === null ? "Ainda não sincronizado" : textoDaUltimaSincronizacao(ultima, hoje);
    case "sincronizando":
      return "Sincronizando";
    case "sincronizada":
      return textoDaUltimaSincronizacao(estado.em, hoje);
    case "falhou":
    case "pausada":
      return estado.mensagem;
    case "confirmarTroca":
      return `Os dados deste aparelho serão trocados pelos da conta ${estado.email}`;
  }
}

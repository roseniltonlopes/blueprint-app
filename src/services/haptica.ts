import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Retorno tátil do app. Os tipos dizem o que aconteceu, não como vibrar:
 * - selecao: trocar aba, ligar um dia, escolher uma opção
 * - confirmar: algo foi registrado (Feito, registro rápido)
 * - rejeitar: "Não fiz"
 */
export type TipoDeHaptica = "selecao" | "confirmar" | "rejeitar";

export type EfeitoDeHaptica =
  | { api: "android"; tipo: Haptics.AndroidHaptics }
  | { api: "selecao" }
  | { api: "notificacao"; tipo: Haptics.NotificationFeedbackType }
  | null;

/**
 * No Android usa `performAndroidHapticsAsync`, que segue o motor háptico do sistema e não pede a
 * permissão VIBRATE. No iOS usa os geradores nativos. Na web não há retorno tátil.
 */
export function efeitoDaHaptica(tipo: TipoDeHaptica, plataforma: string): EfeitoDeHaptica {
  if (plataforma === "android") {
    const porTipo: Record<TipoDeHaptica, Haptics.AndroidHaptics> = {
      selecao: Haptics.AndroidHaptics.Segment_Tick,
      confirmar: Haptics.AndroidHaptics.Confirm,
      rejeitar: Haptics.AndroidHaptics.Reject,
    };
    return { api: "android", tipo: porTipo[tipo] };
  }
  if (plataforma === "ios") {
    if (tipo === "selecao") {
      return { api: "selecao" };
    }
    return {
      api: "notificacao",
      tipo:
        tipo === "confirmar"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
    };
  }
  return null;
}

/**
 * Dispara o retorno tátil sem bloquear a interface. Falha de háptico (aparelho sem motor, API
 * antiga) não é erro para a pessoa: só fica registrada no console de desenvolvimento.
 */
export function tocarHaptica(tipo: TipoDeHaptica): void {
  const efeito = efeitoDaHaptica(tipo, Platform.OS);
  if (efeito === null) {
    return;
  }
  let promessa: Promise<void>;
  switch (efeito.api) {
    case "android":
      promessa = Haptics.performAndroidHapticsAsync(efeito.tipo);
      break;
    case "selecao":
      promessa = Haptics.selectionAsync();
      break;
    case "notificacao":
      promessa = Haptics.notificationAsync(efeito.tipo);
      break;
  }
  promessa.catch((erro: unknown) => {
    if (__DEV__) {
      console.warn("Retorno tátil indisponível.", erro);
    }
  });
}

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { lerDadosDoAlerta, type AlertaPlanejado, type DadosDoAlerta } from "../domain/alertas";

export type EstadoDaPermissao = "concedida" | "negada" | "perguntar";

/** Toque no botão "Feito" de uma notificação (ou na própria notificação, com `feito` false). */
export type RespostaDeAlerta = DadosDoAlerta & { feito: boolean };

/** Porta dos alertas. A implementação real usa expo-notifications; os testes usam uma falsa. */
export interface ServicoDeAlertas {
  preparar(): Promise<void>;
  permissao(): Promise<EstadoDaPermissao>;
  pedirPermissao(): Promise<EstadoDaPermissao>;
  /** Troca todos os alertas agendados pelos da lista. */
  reagendar(alertas: readonly AlertaPlanejado[]): Promise<void>;
  /** Avisa cada resposta, inclusive a que abriu o app fechado. Devolve a função de cancelar. */
  aoResponder(ouvinte: (resposta: RespostaDeAlerta) => void): () => void;
}

export const CANAL_ALERTAS = "compromissos";
export const CATEGORIA_COMPROMISSO = "compromisso";
export const ACAO_FEITO = "feito";

function estadoDe(status: Notifications.NotificationPermissionsStatus): EstadoDaPermissao {
  if (status.granted) return "concedida";
  return status.canAskAgain ? "perguntar" : "negada";
}

function respostaDe(resposta: Notifications.NotificationResponse): RespostaDeAlerta | null {
  const dados = lerDadosDoAlerta(resposta.notification.request.content.data);
  return dados && { ...dados, feito: resposta.actionIdentifier === ACAO_FEITO };
}

/** Na web não há agendamento local: o serviço não faz nada e responde "negada". */
const servicoInativo: ServicoDeAlertas = {
  preparar: async () => {},
  permissao: async () => "negada",
  pedirPermissao: async () => "negada",
  reagendar: async () => {},
  aoResponder: () => () => {},
};

export function criarServicoDeAlertas(): ServicoDeAlertas {
  if (Platform.OS === "web") {
    return servicoInativo;
  }
  return {
    async preparar() {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(CANAL_ALERTAS, {
          name: "Compromissos da agenda",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "default",
          vibrationPattern: [0, 250, 250, 250],
        });
      }
      // "Feito" abre o app: com opensAppToForeground false, a resposta se perde se o app
      // estiver fechado (documentado em NotificationAction, expo-notifications 57).
      await Notifications.setNotificationCategoryAsync(CATEGORIA_COMPROMISSO, [
        { identifier: ACAO_FEITO, buttonTitle: "Feito", options: { opensAppToForeground: true } },
      ]);
    },
    async permissao() {
      return estadoDe(await Notifications.getPermissionsAsync());
    },
    async pedirPermissao() {
      return estadoDe(await Notifications.requestPermissionsAsync());
    },
    async reagendar(alertas) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      for (const alerta of alertas) {
        const dados: DadosDoAlerta = { chave: alerta.chaveDaOcorrencia, data: alerta.data };
        await Notifications.scheduleNotificationAsync({
          identifier: alerta.id,
          content: {
            title: alerta.titulo,
            body: alerta.corpo,
            data: dados,
            sound: "default",
            categoryIdentifier: CATEGORIA_COMPROMISSO,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: alerta.quando,
            channelId: CANAL_ALERTAS,
          },
        });
      }
    },
    aoResponder(ouvinte) {
      const tratar = (bruta: Notifications.NotificationResponse) => {
        const resposta = respostaDe(bruta);
        if (resposta) ouvinte(resposta);
      };
      // A resposta que abriu o app fechado chega antes do ouvinte existir: lê e limpa.
      Notifications.getLastNotificationResponseAsync()
        .then((ultima) => {
          if (ultima) {
            tratar(ultima);
            return Notifications.clearLastNotificationResponseAsync();
          }
          return undefined;
        })
        .catch((erro: unknown) => console.warn("Falha ao ler a última resposta de alerta.", erro));
      const inscricao = Notifications.addNotificationResponseReceivedListener((bruta) => {
        tratar(bruta);
        Notifications.clearLastNotificationResponseAsync().catch(() => {});
      });
      return () => inscricao.remove();
    },
  };
}

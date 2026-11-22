import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { planejarAlertas } from "../domain/alertas";
import { chaveDoDia } from "../domain/datas";
import type { EstadoDaPermissao, RespostaDeAlerta, ServicoDeAlertas } from "../services/alertas";
import { useAgenda } from "./useAgenda";

export type UseAlertas = {
  /** null enquanto o sistema ainda não respondeu */
  permissao: EstadoDaPermissao | null;
  pedirPermissao: () => Promise<void>;
};

const AlertasContext = createContext<UseAlertas | null>(null);

/** Espera a agenda parar de mudar (por exemplo, vários dias ligados em sequência). */
const ESPERA_PARA_REAGENDAR_MS = 400;

type AlertasProviderProps = {
  children: ReactNode;
  servico: ServicoDeAlertas;
};

/**
 * Mantém os alertas do sistema iguais à agenda: reagenda a cada mudança e quando o app volta ao
 * primeiro plano (a janela de dias anda). O botão "Feito" da notificação marca o compromisso,
 * só no próprio dia e sem desmarcar o que já estava feito.
 * Precisa estar dentro de um AgendaProvider.
 */
export function AlertasProvider({ children, servico }: AlertasProviderProps) {
  const { dados, relogio, registroDe, marcar } = useAgenda();
  const [permissao, setPermissao] = useState<EstadoDaPermissao | null>(null);
  const [voltas, setVoltas] = useState(0);

  const conferirPermissao = useCallback(() => {
    servico
      .permissao()
      .then(setPermissao)
      .catch((erro: unknown) => console.warn("Falha ao consultar a permissão de alertas.", erro));
  }, [servico]);

  useEffect(() => {
    servico
      .preparar()
      .catch((erro: unknown) => console.warn("Falha ao preparar os alertas.", erro))
      .finally(conferirPermissao);
  }, [servico, conferirPermissao]);

  useEffect(() => {
    const inscricao = AppState.addEventListener("change", (estado) => {
      if (estado === "active") {
        conferirPermissao();
        setVoltas((n) => n + 1);
      }
    });
    return () => inscricao.remove();
  }, [conferirPermissao]);

  useEffect(() => {
    if (permissao !== "concedida") return undefined;
    const espera = setTimeout(() => {
      servico.reagendar(planejarAlertas(dados, relogio())).catch((erro: unknown) => {
        console.warn("Não foi possível agendar os alertas.", erro);
      });
    }, ESPERA_PARA_REAGENDAR_MS);
    return () => clearTimeout(espera);
  }, [dados, permissao, voltas, relogio, servico]);

  // O ouvinte vive enquanto o serviço existir; a função chamada é sempre a mais nova.
  const responder = useRef<(resposta: RespostaDeAlerta) => void>(() => {});
  useEffect(() => {
    responder.current = (resposta) => {
      const agora = relogio();
      if (!resposta.feito || resposta.data !== chaveDoDia(agora)) return;
      if (registroDe(resposta.chave, agora)?.status === "feito") return;
      const resultado = marcar(resposta.chave, "feito");
      if (!resultado.ok) console.warn(`Alerta sem compromisso correspondente: ${resultado.erro}`);
    };
  }, [marcar, registroDe, relogio]);

  useEffect(() => servico.aoResponder((resposta) => responder.current(resposta)), [servico]);

  const pedirPermissao = useCallback(async () => {
    try {
      setPermissao(await servico.pedirPermissao());
    } catch (erro) {
      console.warn("Falha ao pedir a permissão de alertas.", erro);
    }
  }, [servico]);

  const valor = useMemo<UseAlertas>(
    () => ({ permissao, pedirPermissao }),
    [permissao, pedirPermissao],
  );

  return <AlertasContext.Provider value={valor}>{children}</AlertasContext.Provider>;
}

export function useAlertas(): UseAlertas {
  const contexto = useContext(AlertasContext);
  if (!contexto) {
    throw new Error("useAlertas precisa estar dentro de um AlertasProvider.");
  }
  return contexto;
}

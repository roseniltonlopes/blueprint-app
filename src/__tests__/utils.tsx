import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Acao } from "../domain/acoes";
import { AcoesProvider, type Relogio } from "../hooks/useAcoes";
import { ThemeProvider, type ThemeMode } from "../theme/ThemeProvider";

const METRICAS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Sábado, 17 de outubro de 2026, 15:58 no fuso do processo. */
export const AGORA = new Date(2026, 9, 17, 15, 58);

export function relogioFixo(data = AGORA): Relogio {
  return () => new Date(data.getTime());
}

type Opcoes = {
  modo?: ThemeMode;
  relogio?: Relogio;
  acoes?: Acao[];
};

export function renderComTema(ui: ReactElement, opcoes: Opcoes = {}) {
  const { modo = "light", relogio = relogioFixo(), acoes = [] } = opcoes;
  return render(
    <SafeAreaProvider initialMetrics={METRICAS}>
      <ThemeProvider initialMode={modo}>
        <AcoesProvider relogio={relogio} acoesIniciais={acoes}>
          {ui}
        </AcoesProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

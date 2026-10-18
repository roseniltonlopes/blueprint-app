import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { criarAcao, type Acao, type GeradorDeId } from "../domain/acoes";
import type { CategoriaId } from "../domain/categorias";
import { AcoesProvider, type Relogio } from "../hooks/useAcoes";
import { ThemeProvider, type ThemeMode } from "../theme/ThemeProvider";

export const METRICAS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Sábado, 17 de outubro de 2026, 15:58 no fuso do processo. */
export const AGORA = new Date(2026, 9, 17, 15, 58);

export function relogioFixo(data = AGORA): Relogio {
  return () => new Date(data.getTime());
}

let contador = 0;
/** UUIDs v4 válidos e previsíveis. */
export const gerarIdDeTeste: GeradorDeId = () => {
  contador += 1;
  return `00000000-0000-4000-8000-${contador.toString(16).padStart(12, "0")}`;
};

/** Ação válida para testes; "Outro" ganha nome padrão. */
export function nova(categoria: CategoriaId, quando: Date, rotulo?: string): Acao {
  return criarAcao(
    categoria,
    quando,
    rotulo ?? (categoria === "outro" ? "Outro" : undefined),
    gerarIdDeTeste,
  );
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
        <AcoesProvider
          relogio={relogio}
          gerarId={gerarIdDeTeste}
          estadoInicial={{ acoes, exclusoesPendentes: [], lapides: [] }}
        >
          {ui}
        </AcoesProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

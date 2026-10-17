import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, type ThemeMode } from "../theme/ThemeProvider";

const METRICAS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export function renderComTema(ui: ReactElement, initialMode: ThemeMode = "light") {
  return render(
    <SafeAreaProvider initialMetrics={METRICAS}>
      <ThemeProvider initialMode={initialMode}>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

/** Relógio fixo: sábado, 17 de outubro de 2026, 15:58 no fuso do processo. */
export function relogioFixo(data = new Date(2026, 9, 17, 15, 58)) {
  return () => new Date(data.getTime());
}

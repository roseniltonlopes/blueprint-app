import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import {
  BRAND,
  SHADOWS,
  THEMES,
  type ColorScheme,
  type ThemeColors,
  type ThemeShadows,
} from "../styles/theme";

export type ThemeMode = ColorScheme | "system";

/** Cor de destaque escolhida no Perfil (docs/05 F21). */
export type Destaque = "gradiente" | "laranja" | "indigo";

export type ThemeContextValue = {
  /** Preferência escolhida pela pessoa */
  mode: ThemeMode;
  /** Esquema efetivamente aplicado depois de resolver "system" */
  scheme: ColorScheme;
  destaque: Destaque;
  colors: ThemeColors;
  shadows: ThemeShadows;
  setMode: (mode: ThemeMode) => void;
  setDestaque: (destaque: Destaque) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * O destaque troca o gradiente (anel, barra de hoje, avatar). A rampa de
 * intensidade do calendário e do mapa de calor não muda, para manter a legenda.
 */
export function aplicarDestaque(base: ThemeColors, destaque: Destaque): ThemeColors {
  switch (destaque) {
    case "gradiente":
      return base;
    case "laranja":
      return { ...base, gradient: [BRAND.orange, BRAND.orange] };
    case "indigo":
      // No escuro usa o início clareado da rampa: o índigo puro some contra o preto.
      return { ...base, gradient: [base.ramp[0], base.ramp[0]] };
  }
}

type ThemeProviderProps = {
  children: ReactNode;
  initialMode?: ThemeMode;
  initialDestaque?: Destaque;
};

export function ThemeProvider({
  children,
  initialMode = "system",
  initialDestaque = "gradiente",
}: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const [destaque, setDestaque] = useState<Destaque>(initialDestaque);
  const systemScheme = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ColorScheme =
      mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;
    return {
      mode,
      scheme,
      destaque,
      colors: aplicarDestaque(THEMES[scheme], destaque),
      shadows: SHADOWS[scheme],
      setMode,
      setDestaque,
    };
  }, [mode, systemScheme, destaque]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme precisa estar dentro de um ThemeProvider.");
  }
  return context;
}

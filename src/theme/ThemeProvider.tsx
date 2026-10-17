import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import {
  SHADOWS,
  THEMES,
  type ColorScheme,
  type ThemeColors,
  type ThemeShadows,
} from "../styles/theme";

export type ThemeMode = ColorScheme | "system";

export type ThemeContextValue = {
  /** Preferência escolhida pela pessoa */
  mode: ThemeMode;
  /** Esquema efetivamente aplicado depois de resolver "system" */
  scheme: ColorScheme;
  colors: ThemeColors;
  shadows: ThemeShadows;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  initialMode?: ThemeMode;
};

export function ThemeProvider({ children, initialMode = "system" }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const systemScheme = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ColorScheme =
      mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;
    return { mode, scheme, colors: THEMES[scheme], shadows: SHADOWS[scheme], setMode };
  }, [mode, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme precisa estar dentro de um ThemeProvider.");
  }
  return context;
}

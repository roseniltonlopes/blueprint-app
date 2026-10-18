import {
  Sora_300Light,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  useFonts,
} from "@expo-google-fonts/sora";
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AcoesProvider } from "./src/hooks/useAcoes";
import Abas from "./src/navigation/Abas";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";

SplashScreen.preventAutoHideAsync().catch(() => {
  // A splash já pode ter sido escondida (ex.: recarga rápida); não há o que fazer.
});

function Root() {
  const { scheme, colors } = useTheme();

  // Fundo da navegação igual ao do tema evita piscar branco na troca de aba.
  const temaNavegacao = useMemo<Theme>(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, background: colors.bg, card: colors.card, text: colors.ink },
    };
  }, [scheme, colors]);

  return (
    <NavigationContainer theme={temaNavegacao}>
      <Abas />
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_300Light,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
  });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontError) {
      console.warn("Falha ao carregar a fonte Sora; usando a fonte do sistema.", fontError);
    }
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready, fontError]);

  if (!ready) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AcoesProvider>
          <Root />
        </AcoesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

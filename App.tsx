import {
  Sora_300Light,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  useFonts,
} from "@expo-google-fonts/sora";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import HomeScreen from "./src/screens/HomeScreen";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";

SplashScreen.preventAutoHideAsync().catch(() => {
  // A splash já pode ter sido escondida (ex.: recarga rápida); não há o que fazer.
});

function Root() {
  const { scheme } = useTheme();
  return (
    <>
      <HomeScreen />
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </>
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
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

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
import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { repositorios, type Preferencias } from "./src/data";
import { PREFERENCIAS_PADRAO } from "./src/data/PreferenciasRepository";
import type { Acao } from "./src/domain/acoes";
import { AcoesProvider } from "./src/hooks/useAcoes";
import Abas from "./src/navigation/Abas";
import { ThemeProvider, useTheme, type Destaque, type ThemeMode } from "./src/theme/ThemeProvider";

SplashScreen.preventAutoHideAsync().catch(() => {
  // A splash já pode ter sido escondida (ex.: recarga rápida); não há o que fazer.
});

type DadosIniciais = { preferencias: Preferencias; acoes: Acao[] };

/** Lê preferências e ações do aparelho. Falhas viram valores padrão: o app sempre abre. */
function useDadosIniciais(): DadosIniciais | null {
  const [dados, setDados] = useState<DadosIniciais | null>(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      repositorios.preferencias.carregar().catch((erro: unknown) => {
        console.warn("Falha ao ler preferências; usando o padrão.", erro);
        return { ...PREFERENCIAS_PADRAO };
      }),
      repositorios.acoes.carregar().catch((erro: unknown) => {
        console.warn("Falha ao ler ações salvas; começando vazio.", erro);
        return [] as Acao[];
      }),
    ]).then(([preferencias, acoes]) => {
      if (ativo) {
        setDados({ preferencias, acoes });
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  return dados;
}

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
  const dados = useDadosIniciais();
  const ready = (fontsLoaded || fontError !== null) && dados !== null;
  const meta = dados?.preferencias.meta ?? PREFERENCIAS_PADRAO.meta;

  const salvarPreferencias = useCallback(
    ({ modo, destaque }: { modo: ThemeMode; destaque: Destaque }) => {
      repositorios.preferencias.salvar({ modo, destaque, meta }).catch((erro: unknown) => {
        console.warn("Não foi possível salvar as preferências.", erro);
      });
    },
    [meta],
  );

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
      <ThemeProvider
        initialMode={dados.preferencias.modo}
        initialDestaque={dados.preferencias.destaque}
        aoMudar={salvarPreferencias}
      >
        <AcoesProvider acoesIniciais={dados.acoes} meta={meta} repositorio={repositorios.acoes}>
          <Root />
        </AcoesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

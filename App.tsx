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
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { ContaProvider, type Conta } from "./src/auth/ContaContext";
import { criarAutenticacaoSupabase } from "./src/auth/supabaseAuth";
import type { Usuario } from "./src/auth/tipos";
import { repositorios, type Preferencias } from "./src/data";
import { criarAcoesRemotasSupabase } from "./src/data/AcoesRemotas";
import { PREFERENCIAS_PADRAO } from "./src/data/PreferenciasRepository";
import type { EstadoAcoes } from "./src/domain/acoes";
import { gerarUuid } from "./src/domain/ids";
import { AcoesProvider } from "./src/hooks/useAcoes";
import Abas from "./src/navigation/Abas";
import AuthScreen from "./src/screens/AuthScreen";
import { supabase } from "./src/services/supabase";
import { ThemeProvider, useTheme, type Destaque, type ThemeMode } from "./src/theme/ThemeProvider";

SplashScreen.preventAutoHideAsync().catch(() => {
  // A splash já pode ter sido escondida (ex.: recarga rápida); não há o que fazer.
});

const servicoDeAutenticacao = supabase ? criarAutenticacaoSupabase(supabase) : null;
const acoesRemotas = supabase ? criarAcoesRemotasSupabase(supabase) : null;

function esconderSplash() {
  SplashScreen.hideAsync().catch(() => {});
}

/** Lê as preferências do aparelho. Falha vira padrão: o app sempre abre. */
function usePreferenciasIniciais(): Preferencias | null {
  const [preferencias, setPreferencias] = useState<Preferencias | null>(null);
  useEffect(() => {
    let ativo = true;
    repositorios.preferencias
      .carregar()
      .catch((erro: unknown) => {
        console.warn("Falha ao ler preferências; usando o padrão.", erro);
        return { ...PREFERENCIAS_PADRAO };
      })
      .then((lidas) => {
        if (ativo) setPreferencias(lidas);
      });
    return () => {
      ativo = false;
    };
  }, []);
  return preferencias;
}

/** Lê o estado das ações (da conta ou do modo sem conta). */
function useEstadoDasAcoes(usuarioId: string | null): EstadoAcoes | null {
  const [estado, setEstado] = useState<{ dono: string | null; valor: EstadoAcoes } | null>(null);
  useEffect(() => {
    let ativo = true;
    const leitura = usuarioId
      ? repositorios.carregarEstadoDaConta(usuarioId)
      : repositorios.acoesSemConta.carregar();
    leitura
      .catch((erro: unknown) => {
        console.warn("Falha ao ler ações salvas; começando vazio.", erro);
        return { acoes: [], exclusoesPendentes: [], lapides: [] } satisfies EstadoAcoes;
      })
      .then((valor) => {
        if (ativo) setEstado({ dono: usuarioId, valor });
      });
    return () => {
      ativo = false;
    };
  }, [usuarioId]);
  // Enquanto lê os dados de outra conta, não devolve os da anterior.
  return estado && estado.dono === usuarioId ? estado.valor : null;
}

function Navegacao() {
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
    </NavigationContainer>
  );
}

function Carregando() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}

function AreaDoApp({ usuario, meta }: { usuario: Usuario | null; meta: number }) {
  const { sair } = useAuth();
  const estado = useEstadoDasAcoes(usuario?.id ?? null);

  useEffect(() => {
    if (estado) esconderSplash();
  }, [estado]);

  const conta = useMemo<Conta | null>(
    () =>
      usuario
        ? {
            usuario,
            sair: async () => {
              await sair();
              await repositorios.apagarDadosDaConta(usuario.id).catch((erro: unknown) => {
                console.warn("Não foi possível apagar os dados da conta no aparelho.", erro);
              });
            },
          }
        : null,
    [usuario, sair],
  );

  if (!estado) {
    return <Carregando />;
  }

  const conteudo = (
    <AcoesProvider
      // Uma instância por conta: o estado de uma pessoa nunca vaza para outra.
      key={usuario?.id ?? "sem-conta"}
      estadoInicial={estado}
      meta={meta}
      gerarId={gerarUuid}
      repositorio={usuario ? repositorios.acoesDaConta(usuario.id) : repositorios.acoesSemConta}
      remotas={usuario ? acoesRemotas : null}
    >
      <Navegacao />
    </AcoesProvider>
  );

  return conta ? <ContaProvider conta={conta}>{conteudo}</ContaProvider> : conteudo;
}

function Portao({ meta }: { meta: number }) {
  const { estado } = useAuth();

  useEffect(() => {
    if (estado.situacao === "desconectado") esconderSplash();
  }, [estado.situacao]);

  switch (estado.situacao) {
    case "carregando":
      return null;
    case "desconectado":
      return <AuthScreen />;
    case "conectado":
      return <AreaDoApp usuario={estado.usuario} meta={meta} />;
    case "indisponivel":
      return <AreaDoApp usuario={null} meta={meta} />;
  }
}

function BarraDeStatus() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

function Provedores({
  preferencias,
  children,
}: {
  preferencias: Preferencias;
  children: ReactNode;
}) {
  const salvarPreferencias = useCallback(
    ({ modo, destaque }: { modo: ThemeMode; destaque: Destaque }) => {
      repositorios.preferencias
        .salvar({ modo, destaque, meta: preferencias.meta })
        .catch((erro: unknown) => console.warn("Não foi possível salvar as preferências.", erro));
    },
    [preferencias.meta],
  );

  return (
    <SafeAreaProvider>
      <ThemeProvider
        initialMode={preferencias.modo}
        initialDestaque={preferencias.destaque}
        aoMudar={salvarPreferencias}
      >
        <AuthProvider servico={servicoDeAutenticacao}>{children}</AuthProvider>
        <BarraDeStatus />
      </ThemeProvider>
    </SafeAreaProvider>
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
  const preferencias = usePreferenciasIniciais();

  useEffect(() => {
    if (fontError) {
      console.warn("Falha ao carregar a fonte Sora; usando a fonte do sistema.", fontError);
    }
  }, [fontError]);

  if (!(fontsLoaded || fontError !== null) || !preferencias) {
    return null;
  }

  return (
    <Provedores preferencias={preferencias}>
      <Portao meta={preferencias.meta} />
    </Provedores>
  );
}

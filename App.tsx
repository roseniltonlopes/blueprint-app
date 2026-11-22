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
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { repositorios, type Preferencias } from "./src/data";
import { PREFERENCIAS_PADRAO } from "./src/data/PreferenciasRepository";
import type { Acao } from "./src/domain/acoes";
import { carregarAgendaSegura } from "./src/data/AgendaRepository";
import type { DadosAgenda } from "./src/domain/agenda";
import { PERFIL_PADRAO, type Perfil } from "./src/domain/perfil";
import { AcoesProvider } from "./src/hooks/useAcoes";
import { AgendaProvider } from "./src/hooks/useAgenda";
import { AlertasProvider } from "./src/hooks/useAlertas";
import { ContaProvider } from "./src/hooks/useConta";
import { PerfilProvider } from "./src/hooks/usePerfil";
import { SincronizacaoProvider, type NuvemDaSincronizacao } from "./src/hooks/useSincronizacao";
import Raiz from "./src/navigation/Raiz";
import { criarServicoDeAlertas } from "./src/services/alertas";
import { criarAutenticacaoSupabase } from "./src/services/contaSupabase";
import { criarRemotoSupabase } from "./src/services/remotoSupabase";
import { supabase } from "./src/services/supabase";
import { ThemeProvider, useTheme, type Destaque, type ThemeMode } from "./src/theme/ThemeProvider";

const servicoDeAlertas = criarServicoDeAlertas();

// Sem as variáveis do Supabase no .env, a conta fica indisponível e o app funciona só local.
const autenticacao = supabase === null ? null : criarAutenticacaoSupabase(supabase);
const nuvem: NuvemDaSincronizacao | null =
  supabase === null
    ? null
    : { remoto: criarRemotoSupabase(supabase), repositorio: repositorios.sincronizacao };

const PERSISTENCIA_LOCAL = {
  acoes: repositorios.acoes,
  agenda: repositorios.agenda,
  perfil: repositorios.perfil,
};

const DADOS_ILEGIVEIS =
  "Sincronização pausada: os dados deste aparelho não puderam ser lidos. Feche e abra o app de novo.";

SplashScreen.preventAutoHideAsync().catch(() => {
  // A splash já pode ter sido escondida (ex.: recarga rápida); não há o que fazer.
});

type DadosIniciais = {
  preferencias: Preferencias;
  acoes: Acao[];
  agenda: DadosAgenda;
  perfil: Perfil;
  /** false quando a leitura da agenda falhou: não regravar por cima do que está no disco */
  agendaGravavel: boolean;
  /** false quando a leitura das ações falhou: sincronizar apagaria as ações da nuvem */
  acoesLidas: boolean;
};

/** Lê preferências, ações e agenda do aparelho. Falhas viram valores padrão: o app sempre abre. */
function useDadosIniciais(): DadosIniciais | null {
  const [dados, setDados] = useState<DadosIniciais | null>(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      repositorios.preferencias.carregar().catch((erro: unknown) => {
        console.warn("Falha ao ler preferências; usando o padrão.", erro);
        return { ...PREFERENCIAS_PADRAO };
      }),
      repositorios.acoes.carregar().then(
        (acoes) => ({ acoes, lidas: true }),
        (erro: unknown) => {
          console.warn("Falha ao ler ações salvas; começando vazio.", erro);
          return { acoes: [] as Acao[], lidas: false };
        },
      ),
      carregarAgendaSegura(repositorios.agenda),
      repositorios.perfil.carregar().catch((erro: unknown) => {
        console.warn("Falha ao ler o perfil; usando o padrão.", erro);
        return { ...PERFIL_PADRAO };
      }),
    ]).then(([preferencias, { acoes, lidas }, { dados: agenda, gravar }, perfil]) => {
      if (ativo) {
        setDados({
          preferencias,
          acoes,
          agenda,
          perfil,
          agendaGravavel: gravar,
          acoesLidas: lidas,
        });
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
      <Raiz />
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

  // Com a leitura do aparelho falhando, o estado vazio na tela não é o real: sincronizar apagaria
  // a nuvem. A sincronização fica pausada até a próxima abertura.
  const sincronizavel = dados.agendaGravavel && dados.acoesLidas;

  return (
    <GestureHandlerRootView style={styles.raiz}>
      <SafeAreaProvider>
        <ContaProvider porta={autenticacao}>
          <ThemeProvider
            initialMode={dados.preferencias.modo}
            initialDestaque={dados.preferencias.destaque}
            aoMudar={salvarPreferencias}
          >
            <AcoesProvider acoesIniciais={dados.acoes} meta={meta} repositorio={repositorios.acoes}>
              <AgendaProvider
                agendaInicial={dados.agenda}
                repositorio={dados.agendaGravavel ? repositorios.agenda : undefined}
              >
                <AlertasProvider servico={servicoDeAlertas}>
                  <PerfilProvider perfilInicial={dados.perfil} repositorio={repositorios.perfil}>
                    <SincronizacaoProvider
                      nuvem={nuvem}
                      persistencia={sincronizavel ? PERSISTENCIA_LOCAL : undefined}
                      pausada={sincronizavel ? null : DADOS_ILEGIVEIS}
                    >
                      <Root />
                    </SincronizacaoProvider>
                  </PerfilProvider>
                </AlertasProvider>
              </AgendaProvider>
            </AcoesProvider>
          </ThemeProvider>
        </ContaProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
});

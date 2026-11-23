import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";
import MarcaBlueprint from "../components/MarcaBlueprint";
import { useConta } from "../hooks/useConta";
import { useTheme } from "../theme/ThemeProvider";
import AgendasScreen from "../screens/AgendasScreen";
import CompromissoScreen from "../screens/CompromissoScreen";
import ContaScreen from "../screens/ContaScreen";
import EntradaScreen from "../screens/EntradaScreen";
import PrivacidadeScreen from "../screens/PrivacidadeScreen";
import TermosScreen from "../screens/TermosScreen";
import Abas from "./Abas";

export type RaizParamList = {
  /** Primeira tela sem sessão: entrar ou criar a conta */
  Entrada: undefined;
  Abas: undefined;
  Compromisso: {
    compromissoId?: string;
    agendaId?: string;
    avulsoId?: string;
    /** AAAA-MM-DD */
    data?: string;
    /** Novo compromisso vindo da semana modelo: abre sem nenhum dia marcado */
    modelo?: boolean;
    /** Novo compromisso só na `data` (vem do Calendário, "Adicionar neste dia") */
    avulso?: boolean;
  };
  /** `nova` abre a tela já com o formulário de nova agenda; `data` (AAAA-MM-DD) escolhe o mês e o trecho livre */
  Agendas: { nova?: boolean; data?: string } | undefined;
  /** Entrar, criar conta e recuperar a senha (aberta pelo Perfil) */
  Conta: undefined;
  /** Termos de Uso e Política de Privacidade, embutidos no app (src/legal/textos.ts) */
  Termos: undefined;
  Privacidade: undefined;
};

const Stack = createNativeStackNavigator<RaizParamList>();

/** Enquanto a sessão salva é lida: só a marca, sem piscar a tela de entrada. */
function Carregando() {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.carregando, { backgroundColor: colors.bg }]}
      accessibilityLabel="Abrindo o Blueprint"
    >
      <MarcaBlueprint tamanho={72} />
    </View>
  );
}

/**
 * Pilha raiz com a porta de entrada: sem sessão, só a tela de entrar ou criar conta (e os textos
 * legais); com sessão, as abas e as telas de edição. A troca acontece sozinha quando a sessão
 * começa ou termina. Sem Supabase configurado (desenvolvimento sem .env), o app abre direto.
 */
export default function Raiz() {
  const { estado } = useConta();

  if (estado.situacao === "carregando") {
    return <Carregando />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {estado.situacao === "desconectado" ? (
        <Stack.Screen name="Entrada" component={EntradaScreen} options={{ title: "Entrar" }} />
      ) : (
        <>
          <Stack.Screen name="Abas" component={Abas} />
          <Stack.Screen name="Compromisso" component={CompromissoScreen} />
          <Stack.Screen name="Agendas" component={AgendasScreen} />
          <Stack.Screen name="Conta" component={ContaScreen} />
        </>
      )}
      <Stack.Screen name="Termos" component={TermosScreen} />
      <Stack.Screen name="Privacidade" component={PrivacidadeScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  carregando: { flex: 1, alignItems: "center", justifyContent: "center" },
});

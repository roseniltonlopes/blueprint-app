import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import BotaoTexto from "../components/BotaoTexto";
import FormularioDeConta from "../components/FormularioDeConta";
import MarcaBlueprint from "../components/MarcaBlueprint";
import type { RaizParamList } from "../navigation/Raiz";
import { SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Gradiente } from "../ui/Gradiente";
import { Icon } from "../ui/Icon";
import { entrada } from "../ui/motion";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";

type Props = NativeStackScreenProps<RaizParamList, "Entrada">;

/**
 * Primeira tela do app: entrar ou criar a conta. Só depois dela a agenda e os registros existem
 * para a pessoa. A troca para as abas é feita pela navegação quando a sessão começa.
 */
export default function EntradaScreen({ navigation }: Props) {
  const { colors } = useTheme();
  return (
    <Screen scroll contentStyle={styles.conteudo}>
      <Animated.View entering={entrada(0)}>
        <MarcaBlueprint tamanho={48} />
      </Animated.View>

      <Animated.View entering={entrada(60)} style={styles.chamada}>
        <Text variant="h1" accessibilityRole="header" style={styles.titulo}>
          {"Sua semana, "}
          <Text variant="h1" weight={700} style={styles.titulo}>
            cumprida.
          </Text>
        </Text>
        <View style={styles.faixa}>
          <Gradiente cores={colors.gradient} direcao="horizontal" />
        </View>
        <Text variant="support" color="mute">
          Entre ou crie sua conta para começar. A agenda, os lembretes e o histórico ficam salvos no
          celular e na nuvem.
        </Text>
      </Animated.View>

      <Animated.View entering={entrada(120)}>
        <FormularioDeConta
          aoEntrar={() => {
            // A navegação troca para as abas sozinha quando a sessão começa (Raiz.tsx).
          }}
          aoAbrirTermos={() => navigation.navigate("Termos")}
          aoAbrirPrivacidade={() => navigation.navigate("Privacidade")}
        />
      </Animated.View>

      <Animated.View entering={entrada(180)} style={styles.aviso}>
        <Icon name="alerta" color={colors.mute} size={18} />
        <Text variant="caption" color="mute" style={styles.textoDoAviso}>
          O primeiro acesso precisa de internet. Depois de entrar, o app funciona sem conexão.
        </Text>
      </Animated.View>

      <View style={styles.legais}>
        <BotaoTexto
          rotulo="Termos de Uso"
          aoPressionar={() => navigation.navigate("Termos")}
          variante="link"
        />
        <BotaoTexto
          rotulo="Política de Privacidade"
          aoPressionar={() => navigation.navigate("Privacidade")}
          variante="link"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: SPACING.lg, paddingTop: SPACING.xxl, paddingBottom: SPACING.lg },
  chamada: { gap: SPACING.md },
  titulo: { fontSize: 32, lineHeight: 38 },
  faixa: { width: 96, height: 6, borderRadius: 6, overflow: "hidden" },
  aviso: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm },
  textoDoAviso: { flex: 1 },
  legais: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
});

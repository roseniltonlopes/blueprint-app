import { Pressable, StyleSheet, View } from "react-native";
import { useAcoes } from "../hooks/useAcoes";
import { SIZES, SPACING } from "../styles/theme";
import { Text } from "../ui/Text";
import { gerarDadosDeExemplo } from "./dadosDeExemplo";

/** Só em desenvolvimento (HistoricoScreen carrega este módulo dentro de if (__DEV__)). */
export default function FerramentasDoHistorico() {
  const { substituir, relogio } = useAcoes();
  return (
    <View style={styles.dev}>
      <Text variant="caption" color="mute">
        DEV
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => substituir(gerarDadosDeExemplo(relogio()))}
        style={styles.devBotao}
      >
        <Text variant="caption" color="accentText" weight={600}>
          Gerar dados de exemplo
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => substituir([])} style={styles.devBotao}>
        <Text variant="caption" color="accentText" weight={600}>
          Limpar
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dev: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  devBotao: { minHeight: SIZES.touchMin, justifyContent: "center", paddingHorizontal: SPACING.sm },
});

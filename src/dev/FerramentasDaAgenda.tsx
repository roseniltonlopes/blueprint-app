import { Pressable, StyleSheet, View } from "react-native";
import { gerarIdLocal } from "../domain/acoes";
import { DADOS_AGENDA_VAZIOS } from "../domain/agenda";
import { useAgenda } from "../hooks/useAgenda";
import { SIZES, SPACING } from "../styles/theme";
import { Text } from "../ui";
import { gerarAgendaDeExemplo } from "./agendaDeExemplo";

/**
 * Só em desenvolvimento (AgendaScreen carrega este módulo dentro de if (__DEV__)): a agenda de
 * exemplo tem nomes e lugares reais e não pode ir no APK.
 */
export default function FerramentasDaAgenda() {
  const { substituir, relogio } = useAgenda();
  return (
    <View style={styles.dev}>
      <Text variant="caption" color="mute">
        DEV
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Carregar agenda de exemplo"
        onPress={() => substituir(gerarAgendaDeExemplo(() => gerarIdLocal(relogio()), relogio()))}
        style={styles.devBotao}
      >
        <Text variant="caption" color="accentText" weight={600}>
          Carregar agenda de exemplo
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Limpar agenda"
        onPress={() => substituir({ ...DADOS_AGENDA_VAZIOS })}
        style={styles.devBotao}
      >
        <Text variant="caption" color="accentText" weight={600}>
          Limpar agenda
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dev: { flexDirection: "row", alignItems: "center", gap: SPACING.lg, flexWrap: "wrap" },
  devBotao: { minHeight: SIZES.touchMin, justifyContent: "center" },
});

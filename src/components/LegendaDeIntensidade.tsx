import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../ui/Text";

/** "menos ▢▢▢▢▢ mais": os 5 níveis da rampa (nenhum registro e níveis 1 a 4). */
export default function LegendaDeIntensidade() {
  const { colors } = useTheme();
  const cores = [colors.hair, ...colors.ramp];
  return (
    <View style={styles.legenda} accessible accessibilityLabel="Legenda: de menos a mais ações">
      <Text variant="caption" color="mute">
        menos
      </Text>
      <View style={styles.amostras}>
        {cores.map((cor) => (
          <View key={cor} style={[styles.amostra, { backgroundColor: cor }]} />
        ))}
      </View>
      <Text variant="caption" color="mute">
        mais
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legenda: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
  amostras: { flexDirection: "row", gap: 4, marginHorizontal: 4 },
  amostra: { width: 14, height: 14, borderRadius: 4 },
});

import { StyleSheet, View } from "react-native";
import { SPACING } from "../styles/theme";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";

export type ItemDoResumo = { valor: string; rotulo: string };

/** Faixa de números com legenda (Histórico e Calendário). */
export default function Resumo({ itens }: { itens: readonly ItemDoResumo[] }) {
  return (
    <Card radius="category" style={styles.resumo}>
      {itens.map((item) => (
        <View
          key={item.rotulo}
          style={styles.item}
          accessible
          accessibilityLabel={`${item.valor} ${item.rotulo}`}
        >
          <Text variant="ring" style={styles.valor} numberOfLines={1}>
            {item.valor}
          </Text>
          <Text variant="caption" color="mute">
            {item.rotulo}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  resumo: { flexDirection: "row", padding: 0, borderRadius: 20 },
  item: { flex: 1, paddingVertical: SPACING.md, paddingHorizontal: 14, gap: 2 },
  valor: { fontSize: 28, lineHeight: 32, letterSpacing: -0.84 },
});

import { StyleSheet, View } from "react-native";
import { RADIUS, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";
import type { ItemDoResumo } from "./Resumo";

type DestaqueDoMesProps = {
  total: number;
  /** "ações no mês" */
  rotulo: string;
  /** "3 a mais que no mês anterior"; null quando não há mês anterior para comparar */
  comparacao: string | null;
  itens: readonly ItemDoResumo[];
};

/** Número grande do mês, a comparação com o mês anterior e os números de apoio embaixo. */
export default function DestaqueDoMes({ total, rotulo, comparacao, itens }: DestaqueDoMesProps) {
  const { colors } = useTheme();
  return (
    <Card radius="progress" style={styles.cartao}>
      <View style={styles.topo}>
        <View style={styles.principal} accessible accessibilityLabel={`${total} ${rotulo}`}>
          <Text variant="ring" style={styles.total}>
            {total}
          </Text>
          <Text variant="support" color="mute">
            {rotulo}
          </Text>
        </View>
        {comparacao ? (
          <View style={[styles.comparacao, { backgroundColor: colors.sunk }]}>
            <Text variant="caption" weight={600} numberOfLines={2} style={styles.textoComparacao}>
              {comparacao}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.itens, { borderTopColor: colors.hair }]}>
        {itens.map((item) => (
          <View
            key={item.rotulo}
            style={styles.item}
            accessible
            accessibilityLabel={`${item.valor} ${item.rotulo}`}
          >
            <Text variant="cardTitle">{item.valor}</Text>
            <Text variant="caption" color="mute">
              {item.rotulo}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: { padding: SPACING.xl, gap: SPACING.lg },
  topo: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  principal: { flexShrink: 0 },
  total: { fontSize: 64, lineHeight: 66, letterSpacing: -2 },
  comparacao: {
    flexShrink: 1,
    maxWidth: 170,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.field,
  },
  textoComparacao: { textAlign: "right" },
  itens: { flexDirection: "row", gap: SPACING.sm, paddingTop: SPACING.lg, borderTopWidth: 1 },
  item: { flex: 1, gap: 2 },
});

import { StyleSheet, View } from "react-native";
import { RADIUS, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";

/** Conquistas previstas na etapa 6 do roteiro. Ainda não existem: aparecem bloqueadas, "Em breve". */
const PREVISTAS = ["Primeira semana completa", "Dia perfeito", "30 dias seguidos"] as const;

export default function CartaoDeConquistas() {
  const { colors } = useTheme();
  return (
    <Card style={styles.cartao}>
      <View style={styles.topo}>
        <Text variant="section" accessibilityRole="header">
          Conquistas
        </Text>
        <View style={[styles.selo, { backgroundColor: colors.sunk }]}>
          <Text variant="caption" weight={600} color="mute">
            Em breve
          </Text>
        </View>
      </View>
      <View style={styles.grade}>
        {PREVISTAS.map((nome) => (
          <View key={nome} style={styles.item} accessible accessibilityLabel={`${nome}, em breve`}>
            <View
              style={[styles.medalha, { backgroundColor: colors.sunk, borderColor: colors.hair }]}
            >
              <Icon name="cadeado" color={colors.mute} size={22} />
            </View>
            <Text variant="caption" color="mute" style={styles.nome}>
              {nome}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: SPACING.md },
  topo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selo: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill },
  grade: { flexDirection: "row", gap: SPACING.sm },
  item: { flex: 1, alignItems: "center", gap: SPACING.sm },
  medalha: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  nome: { textAlign: "center" },
});

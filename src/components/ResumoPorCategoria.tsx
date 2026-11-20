import { StyleSheet, View } from "react-native";
import { nomeDaCategoria } from "../domain/categorias";
import type { ContagemDeCategoria } from "../domain/estatisticas";
import { plural } from "../domain/texto";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";

type ResumoPorCategoriaProps = {
  atual: readonly ContagemDeCategoria[];
  /** Contagem do mês anterior; null quando ele não tem nenhuma ação para comparar */
  anterior: readonly ContagemDeCategoria[] | null;
};

function comparacao(total: number, antes: number): string {
  const diferenca = total - antes;
  if (diferenca === 0) return "igual ao mês anterior";
  return diferenca > 0
    ? `${diferenca} a mais que no mês anterior`
    : `${-diferenca} a menos que no mês anterior`;
}

/** "Quantas vezes por categoria no mês": uma barra por categoria, proporcional à maior. */
export default function ResumoPorCategoria({ atual, anterior }: ResumoPorCategoriaProps) {
  const { colors } = useTheme();
  const maximo = Math.max(1, ...atual.map((item) => item.total));
  const antes = new Map((anterior ?? []).map((item) => [item.categoria, item.total]));

  return (
    <Card radius="category" style={styles.cartao}>
      {atual.map(({ categoria, total }) => {
        const nome = nomeDaCategoria(categoria);
        const texto = anterior === null ? null : comparacao(total, antes.get(categoria) ?? 0);
        return (
          <View
            key={categoria}
            style={styles.linha}
            accessible
            accessibilityLabel={`${nome}, ${plural(total, "vez", "vezes")}${texto ? `, ${texto}` : ""}`}
          >
            <View style={[styles.circulo, { backgroundColor: colors.sunk }]}>
              <Icon name={categoria} color={colors.ink} size={20} />
            </View>
            <View style={styles.corpo}>
              <View style={styles.topo}>
                <Text variant="body">{nome}</Text>
                <Text variant="body" weight={600}>
                  {total}
                </Text>
              </View>
              <View style={[styles.trilha, { backgroundColor: colors.sunk }]}>
                <View
                  style={[
                    styles.barra,
                    { backgroundColor: colors.accent, width: `${(total / maximo) * 100}%` },
                  ]}
                />
              </View>
              {texto ? (
                <Text variant="caption" color="mute">
                  {texto}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: SPACING.lg },
  linha: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  circulo: {
    width: SIZES.iconCircle,
    height: SIZES.iconCircle,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  corpo: { flex: 1, minWidth: 0, gap: 6 },
  topo: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  trilha: { height: 8, borderRadius: RADIUS.pill, overflow: "hidden" },
  barra: { height: 8, borderRadius: RADIUS.pill },
});

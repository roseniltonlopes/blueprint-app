import { StyleSheet, View } from "react-native";
import type { FaixaDoMes } from "../domain/estatisticas";
import { SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";

const ALTURA_MAXIMA = 110;

/**
 * "Por semana": uma barra por faixa de 7 dias do mês, com o total escrito acima. Todas as barras
 * têm a mesma cor; a semana atual se destaca só pelo texto em negrito.
 */
export default function GraficoDoMes({ faixas }: { faixas: readonly FaixaDoMes[] }) {
  const { colors } = useTheme();
  const maximo = Math.max(1, ...faixas.map((faixa) => faixa.total));
  const descricao = faixas
    .map((faixa) => `de ${faixa.inicio} a ${faixa.fim}, ${faixa.total}`)
    .join("; ");

  return (
    <Card style={styles.cartao}>
      <Text variant="section" accessibilityRole="header">
        Por semana
      </Text>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Ações por semana do mês: ${descricao}`}
        style={styles.barras}
      >
        {faixas.map((faixa) => {
          const altura =
            faixa.total === 0 ? 6 : Math.max(12, (faixa.total / maximo) * ALTURA_MAXIMA);
          return (
            <View key={faixa.inicio} style={styles.coluna}>
              <Text
                variant="caption"
                weight={faixa.atual ? 700 : 600}
                color={faixa.futura ? "mute" : "ink"}
              >
                {faixa.futura ? "–" : faixa.total}
              </Text>
              <View
                style={[
                  styles.barra,
                  {
                    height: faixa.futura ? 6 : altura,
                    backgroundColor:
                      faixa.futura || faixa.total === 0 ? colors.sunk : colors.ramp[0],
                  },
                ]}
              />
              <Text
                variant="caption"
                weight={faixa.atual ? 700 : 400}
                color={faixa.atual ? "ink" : "mute"}
              >
                {`${faixa.inicio}–${faixa.fim}`}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: SPACING.md },
  barras: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.md },
  coluna: { flex: 1, alignItems: "center", gap: 6 },
  barra: { width: "100%", borderRadius: 10, overflow: "hidden" },
});

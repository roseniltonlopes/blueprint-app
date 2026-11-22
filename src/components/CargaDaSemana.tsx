import { StyleSheet, View } from "react-native";
import { DIAS_DA_SEMANA } from "../domain/datas";
import { plural } from "../domain/texto";
import { SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "../ui/Card";
import { Gradiente } from "../ui/Gradiente";
import { Text } from "../ui/Text";

type CargaDaSemanaProps = {
  /** Compromissos por dia, de domingo (0) a sábado (6) */
  carga: readonly number[];
  /** Dia da semana de hoje, destacado; null quando o mês exibido não é o atual */
  diaDeHoje: number | null;
};

const INICIAIS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;
const ALTURA_MAXIMA = 52;
const ALTURA_MINIMA = 8;

/** "Sua semana": quantos compromissos caem em cada dia, para ver de relance os dias cheios. */
export default function CargaDaSemana({ carga, diaDeHoje }: CargaDaSemanaProps) {
  const { colors } = useTheme();
  const maximo = Math.max(1, ...carga);
  const total = carga.reduce((soma, n) => soma + n, 0);
  const descricao = carga.map((n, dia) => `${DIAS_DA_SEMANA[dia]} ${n}`).join(", ");

  return (
    <Card style={styles.cartao}>
      <View style={styles.topo}>
        <Text variant="support" weight={600}>
          Sua semana
        </Text>
        <Text variant="caption" color="mute">
          {`${plural(total, "compromisso", "compromissos")} na semana`}
        </Text>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Compromissos por dia: ${descricao}`}
        style={styles.barras}
      >
        {carga.map((quantidade, dia) => {
          const hoje = dia === diaDeHoje;
          const altura =
            quantidade === 0
              ? ALTURA_MINIMA
              : Math.max(ALTURA_MINIMA * 2, (quantidade / maximo) * ALTURA_MAXIMA);
          return (
            <View key={dia} style={styles.coluna}>
              <Text variant="caption" weight={hoje ? 700 : 400} color={hoje ? "ink" : "mute"}>
                {quantidade}
              </Text>
              <View
                style={[
                  styles.barra,
                  {
                    height: altura,
                    backgroundColor: quantidade === 0 ? colors.sunk : colors.ramp[0],
                  },
                  hoje && { borderWidth: 2, borderColor: colors.ink },
                ]}
              >
                {hoje && quantidade > 0 ? (
                  <Gradiente cores={[colors.gradient[1], colors.gradient[0]]} />
                ) : null}
              </View>
              <Text variant="caption" weight={hoje ? 700 : 400} color={hoje ? "ink" : "mute"}>
                {INICIAIS[dia]}
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
  topo: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  barras: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm },
  coluna: { flex: 1, alignItems: "center", gap: 6 },
  barra: { width: "100%", borderRadius: 8, overflow: "hidden" },
});

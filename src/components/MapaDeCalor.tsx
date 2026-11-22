import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { chaveDoDia, formatarDiaMes } from "../domain/datas";
import type { CelulaDoMapa } from "../domain/estatisticas";
import { plural } from "../domain/texto";
import { useTheme } from "../theme/ThemeProvider";
import { MOTION } from "../styles/theme";
import { entradaDeCelula } from "../ui/motion";
import LegendaDeIntensidade from "./LegendaDeIntensidade";

type MapaDeCalorProps = {
  colunas: readonly (readonly CelulaDoMapa[])[];
};

/** Mapa de calor de 12 semanas x 7 dias (docs/03 tela 8; docs/05 F17). */
export default function MapaDeCalor({ colunas }: MapaDeCalorProps) {
  const { colors } = useTheme();
  const corDoNivel = (nivel: number) => (nivel === 0 ? colors.hair : colors.ramp[nivel - 1]);
  const diasComRegistro = colunas.flat().filter((c) => c.total > 0).length;

  return (
    <View>
      <View
        style={styles.grade}
        accessible
        accessibilityLabel={`Mapa de calor: ${plural(diasComRegistro, "dia", "dias")} com registro nas últimas ${colunas.length} semanas`}
      >
        {colunas.map((coluna, i) => (
          <View key={chaveDoDia(coluna[0].data)} style={styles.coluna}>
            {coluna.map((celula) => (
              <Animated.View
                key={chaveDoDia(celula.data)}
                entering={entradaDeCelula(200 + i * MOTION.cells.staggerMin)}
                accessibilityLabel={`${formatarDiaMes(celula.data)}: ${celula.total}`}
                style={[
                  styles.celula,
                  {
                    backgroundColor: celula.futuro ? "transparent" : corDoNivel(celula.nivel),
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.legenda}>
        <LegendaDeIntensidade />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grade: { flexDirection: "row", gap: 4, marginTop: 12 },
  coluna: { flex: 1, gap: 4 },
  celula: { height: 18, borderRadius: 5 },
  legenda: { marginTop: 12 },
});

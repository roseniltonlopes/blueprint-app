import { Pressable, StyleSheet, View } from "react-native";
import Animated, { ReduceMotion, ZoomIn } from "react-native-reanimated";
import {
  DIAS_ABREVIADOS,
  chaveDoDia,
  formatarDiaMes,
  gradeDoMes,
  inicioDoDia,
} from "../domain/datas";
import { nivelDeIntensidade } from "../domain/estatisticas";
import { plural } from "../domain/texto";
import { useTheme } from "../theme/ThemeProvider";
import { MOTION } from "../styles/theme";
import { CURVA } from "../ui/motion";
import { Text } from "../ui/Text";

type CalendarioMensalProps = {
  ano: number;
  mes: number;
  porDia: ReadonlyMap<string, number>;
  hoje: Date;
  selecionado: Date;
  aoSelecionar: (dia: Date) => void;
};

function entradaCelula(coluna: number, linha: number) {
  const atraso = 100 + coluna * 35 + linha * 20;
  return ZoomIn.duration(MOTION.cells.duration)
    .delay(atraso)
    .easing(CURVA)
    .withInitialValues({ transform: [{ scale: MOTION.cells.fromScale }] })
    .reduceMotion(ReduceMotion.System);
}

/** Grade mensal com barra de intensidade por dia (docs/03 tela 6; docs/05 F11). */
export default function CalendarioMensal({
  ano,
  mes,
  porDia,
  hoje,
  selecionado,
  aoSelecionar,
}: CalendarioMensalProps) {
  const { colors, shadows } = useTheme();
  const chaveHoje = chaveDoDia(hoje);
  const chaveSelecionado = chaveDoDia(selecionado);
  const inicioHoje = inicioDoDia(hoje).getTime();
  const semanas = gradeDoMes(ano, mes);

  return (
    <View>
      <View style={styles.linha}>
        {DIAS_ABREVIADOS.map((dia) => (
          <Text key={dia} variant="caption" color="mute" style={styles.cabecalho}>
            {dia}
          </Text>
        ))}
      </View>

      <View style={styles.grade}>
        {semanas.map((semana, linha) => (
          <View key={chaveDoDia(semana[0].data)} style={styles.linha}>
            {semana.map(({ data, doMes }, coluna) => {
              const chave = chaveDoDia(data);
              const total = porDia.get(chave) ?? 0;
              const ehHoje = chave === chaveHoje;
              const ehSelecionado = chave === chaveSelecionado && !ehHoje;
              const futuro = data.getTime() > inicioHoje;
              const nivel = nivelDeIntensidade(total);
              const mostrarBarra = doMes && !futuro && nivel > 0;
              const corBarra = ehHoje ? colors.accent : colors.ramp[Math.max(0, nivel - 1)];

              return (
                <Animated.View
                  key={chave}
                  entering={entradaCelula(coluna, linha)}
                  style={styles.celula}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      total > 0
                        ? `${formatarDiaMes(data)}, ${plural(total, "ação", "ações")}`
                        : formatarDiaMes(data)
                    }
                    accessibilityState={{ selected: chave === chaveSelecionado }}
                    onPress={() => aoSelecionar(data)}
                    style={[
                      styles.dia,
                      ehHoje && { backgroundColor: colors.ink, boxShadow: shadows.glow },
                      ehSelecionado && { backgroundColor: colors.sunk },
                    ]}
                  >
                    <Text
                      variant="body"
                      weight={ehHoje ? 600 : 500}
                      color={ehHoje ? "onInk" : doMes ? "ink" : "mute"}
                      style={styles.numero}
                    >
                      {data.getDate()}
                    </Text>
                    <View
                      style={[
                        styles.barra,
                        { backgroundColor: mostrarBarra ? corBarra : "transparent" },
                      ]}
                    />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", gap: 4 },
  grade: { marginTop: 4, gap: 4 },
  cabecalho: { flex: 1, textAlign: "center", lineHeight: 20 },
  celula: { flex: 1 },
  dia: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  numero: { fontSize: 15, lineHeight: 20 },
  barra: { width: 20, height: 4, borderRadius: 2 },
});

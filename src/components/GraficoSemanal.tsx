import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { DIAS_ABREVIADOS } from "../domain/datas";
import type { DiaDoGrafico } from "../domain/estatisticas";
import { useTheme } from "../theme/ThemeProvider";
import { MOTION } from "../styles/theme";
import { CURVA } from "../ui/motion";
import { Text } from "../ui/Text";

const ALTURA_TRILHO = 96;
const LARGURA_BARRA = 32;

type BarraProps = {
  dia: DiaDoGrafico;
  maximo: number;
  indice: number;
};

function Barra({ dia, maximo, indice }: BarraProps) {
  const { colors } = useTheme();
  const altura = maximo > 0 ? (dia.total / maximo) * ALTURA_TRILHO : 0;
  const alturaAnimada = useSharedValue(0);
  const montado = useRef(false);

  useEffect(() => {
    const animacao = withTiming(altura, {
      duration: MOTION.bars.duration,
      easing: CURVA,
      reduceMotion: ReduceMotion.System,
    });
    // Na entrada as barras crescem em cascata; depois só ajustam a altura.
    alturaAnimada.value = montado.current
      ? animacao
      : withDelay(MOTION.ring.delay + indice * MOTION.bars.stagger, animacao);
    montado.current = true;
  }, [altura, indice, alturaAnimada]);

  const estilo = useAnimatedStyle(() => ({ height: alturaAnimada.value }));
  const nome = DIAS_ABREVIADOS[dia.data.getDay()];

  return (
    <View
      style={styles.coluna}
      accessible
      accessibilityLabel={`${nome}: ${
        dia.futuro ? "dia futuro" : `${dia.total} ${dia.total === 1 ? "ação" : "ações"}`
      }`}
    >
      <Text
        variant="caption"
        weight={dia.ehHoje ? 600 : 400}
        color={dia.ehHoje ? "accentText" : "mute"}
        style={styles.legenda}
      >
        {dia.futuro ? " " : dia.total}
      </Text>
      <View style={[styles.trilho, { backgroundColor: colors.sunk }]}>
        <Animated.View style={[styles.barra, { backgroundColor: colors.ink }, estilo]}>
          {dia.ehHoje ? (
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="barraHoje" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.gradient[0]} />
                  <Stop offset="1" stopColor={colors.gradient[1]} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#barraHoje)" />
            </Svg>
          ) : null}
        </Animated.View>
      </View>
      <Text
        variant="caption"
        weight={dia.ehHoje ? 600 : 400}
        color={dia.ehHoje ? "ink" : "mute"}
        style={styles.legenda}
      >
        {nome}
      </Text>
    </View>
  );
}

type GraficoSemanalProps = {
  dias: readonly DiaDoGrafico[];
};

/** Gráfico de 7 barras, de domingo a sábado (docs/03 tela 7). Altura relativa ao maior dia. */
export default function GraficoSemanal({ dias }: GraficoSemanalProps) {
  const maximo = Math.max(0, ...dias.map((dia) => dia.total));
  return (
    <View style={styles.grafico}>
      {dias.map((dia, i) => (
        <Barra key={dia.data.getTime()} dia={dia} maximo={maximo} indice={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grafico: { flexDirection: "row", marginTop: 4 },
  coluna: { flex: 1, alignItems: "center", gap: 6 },
  legenda: { lineHeight: 16 },
  trilho: {
    width: LARGURA_BARRA,
    height: ALTURA_TRILHO,
    borderRadius: 12,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barra: { width: "100%", borderRadius: 10, overflow: "hidden" },
});

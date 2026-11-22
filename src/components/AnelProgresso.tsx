import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { coresDosSegmentos } from "../styles/cores";
import { MOTION } from "../styles/theme";
import { CURVA, surgir } from "../ui/motion";
import { Text } from "../ui/Text";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Medidas = { tamanho: number; raio: number; traco: number; vao: number };

/** "grande" é o anel do canvas v2; "compacto" é o do cartão de progresso da Home nova. */
const MEDIDAS: Record<"grande" | "compacto", Medidas> = {
  grande: { tamanho: 124, raio: 52, traco: 12, vao: 9 },
  compacto: { tamanho: 76, raio: 32, traco: 8, vao: 6 },
};

type SegmentoProps = {
  medidas: Medidas;
  indice: number;
  comprimento: number;
  rotacao: number;
  cor: string;
  corVazia: string;
  preenchido: boolean;
};

function Segmento({
  medidas,
  indice,
  comprimento,
  rotacao,
  cor,
  corVazia,
  preenchido,
}: SegmentoProps) {
  const centro = medidas.tamanho / 2;
  const circunferencia = 2 * Math.PI * medidas.raio;
  const atrasoInicial = MOTION.ring.delay + indice * MOTION.ring.stagger;
  const base = useSharedValue(0);
  const cheio = useSharedValue(0);
  const montado = useRef(false);

  useEffect(() => {
    const config = {
      duration: MOTION.ring.duration,
      easing: CURVA,
      reduceMotion: ReduceMotion.System,
    };
    if (!montado.current) {
      montado.current = true;
      base.value = withDelay(atrasoInicial, withTiming(1, config));
      cheio.value = withDelay(atrasoInicial, withTiming(preenchido ? 1 : 0, config));
      return;
    }
    cheio.value = withTiming(preenchido ? 1 : 0, config);
  }, [preenchido, atrasoInicial, base, cheio]);

  const baseProps = useAnimatedProps(() => ({
    strokeDasharray: [comprimento * base.value, circunferencia],
  }));
  const cheioProps = useAnimatedProps(() => ({
    strokeDasharray: [comprimento * cheio.value, circunferencia],
  }));

  const comum = {
    cx: centro,
    cy: centro,
    r: medidas.raio,
    fill: "none",
    strokeWidth: medidas.traco,
    transform: `rotate(${rotacao} ${centro} ${centro})`,
  };

  return (
    <>
      <AnimatedCircle {...comum} stroke={corVazia} animatedProps={baseProps} />
      <AnimatedCircle {...comum} stroke={cor} animatedProps={cheioProps} />
    </>
  );
}

type AnelProgressoProps = {
  total: number;
  meta: number;
  tamanho?: "grande" | "compacto";
};

/**
 * Anel segmentado (docs/04 seções 2 e 6): um segmento por ação da meta, com o
 * gradiente distribuído. Acima da meta o anel fica cheio e o número continua subindo.
 */
export default function AnelProgresso({ total, meta, tamanho = "grande" }: AnelProgressoProps) {
  const { colors } = useTheme();
  const medidas = MEDIDAS[tamanho];
  const circunferencia = 2 * Math.PI * medidas.raio;
  const segmentos = Math.max(1, meta);
  const cores = coresDosSegmentos(colors.gradient, segmentos);
  const passo = 360 / segmentos;
  const comprimento = circunferencia / segmentos - medidas.vao;
  const inicio = -90 + (medidas.vao / circunferencia) * 180;
  const compacto = tamanho === "compacto";

  return (
    <View
      style={{ width: medidas.tamanho, height: medidas.tamanho }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${total} de ${meta} ações registradas hoje`}
      accessibilityValue={{ min: 0, max: meta, now: Math.min(total, meta) }}
    >
      <Svg
        width={medidas.tamanho}
        height={medidas.tamanho}
        viewBox={`0 0 ${medidas.tamanho} ${medidas.tamanho}`}
      >
        {cores.map((cor, i) => (
          <Segmento
            key={`${segmentos}-${i}`}
            medidas={medidas}
            indice={i}
            comprimento={comprimento}
            rotacao={inicio + i * passo}
            cor={cor}
            corVazia={colors.hair}
            preenchido={i < total}
          />
        ))}
      </Svg>
      <Animated.View
        entering={surgir(MOTION.ringNumber.delay, MOTION.ringNumber.duration)}
        style={styles.centro}
        pointerEvents="none"
      >
        <Text
          variant="ring"
          testID="progresso-total"
          style={compacto ? styles.numeroCompacto : undefined}
        >
          {total}
        </Text>
        {compacto ? null : (
          <Text variant="caption" color="mute">
            de {meta}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  numeroCompacto: { fontSize: 26, lineHeight: 30, letterSpacing: -0.8 },
  centro: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});

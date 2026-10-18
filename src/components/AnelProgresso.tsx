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

const TAMANHO = 124;
const RAIO = 52;
const TRACO = 12;
const CENTRO = TAMANHO / 2;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
/** Espaço entre segmentos, medido no traço (9 no canvas) */
const VAO = 9;

type SegmentoProps = {
  indice: number;
  comprimento: number;
  rotacao: number;
  cor: string;
  corVazia: string;
  preenchido: boolean;
};

function Segmento({ indice, comprimento, rotacao, cor, corVazia, preenchido }: SegmentoProps) {
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
    strokeDasharray: [comprimento * base.value, CIRCUNFERENCIA],
  }));
  const cheioProps = useAnimatedProps(() => ({
    strokeDasharray: [comprimento * cheio.value, CIRCUNFERENCIA],
  }));

  const comum = {
    cx: CENTRO,
    cy: CENTRO,
    r: RAIO,
    fill: "none",
    strokeWidth: TRACO,
    transform: `rotate(${rotacao} ${CENTRO} ${CENTRO})`,
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
};

/**
 * Anel segmentado (docs/04 seções 2 e 6): um segmento por ação da meta, com o
 * gradiente distribuído. Acima da meta o anel fica cheio e o número continua subindo.
 */
export default function AnelProgresso({ total, meta }: AnelProgressoProps) {
  const { colors } = useTheme();
  const segmentos = Math.max(1, meta);
  const cores = coresDosSegmentos(colors.gradient, segmentos);
  const passo = 360 / segmentos;
  const comprimento = CIRCUNFERENCIA / segmentos - VAO;
  const inicio = -90 + (VAO / CIRCUNFERENCIA) * 180;

  return (
    <View
      style={styles.caixa}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${total} de ${meta} ações registradas hoje`}
      accessibilityValue={{ min: 0, max: meta, now: Math.min(total, meta) }}
    >
      <Svg width={TAMANHO} height={TAMANHO} viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}>
        {cores.map((cor, i) => (
          <Segmento
            key={`${segmentos}-${i}`}
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
        <Text variant="ring" testID="progresso-total">
          {total}
        </Text>
        <Text variant="caption" color="mute">
          de {meta}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { width: TAMANHO, height: TAMANHO },
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

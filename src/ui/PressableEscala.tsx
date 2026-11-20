import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { MOTION } from "../styles/theme";
import { CURVA } from "./motion";

const PressableAnimado = Animated.createAnimatedComponent(Pressable);

type PressableEscalaProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** Escala durante o toque; o padrão vem de MOTION.press */
  escala?: number;
};

/**
 * Pressable que encolhe um pouco enquanto é tocado e volta ao soltar.
 * Dá retorno imediato ao toque (120 ms) e respeita "reduzir movimento".
 */
export function PressableEscala({
  style,
  escala = MOTION.press.scale,
  onPressIn,
  onPressOut,
  ...resto
}: PressableEscalaProps) {
  const valor = useSharedValue(1);
  const animado = useAnimatedStyle(() => ({ transform: [{ scale: valor.value }] }));

  function ir(para: number) {
    valor.set(
      withTiming(para, {
        duration: MOTION.press.duration,
        easing: CURVA,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }

  return (
    <PressableAnimado
      {...resto}
      onPressIn={(evento: GestureResponderEvent) => {
        ir(escala);
        onPressIn?.(evento);
      }}
      onPressOut={(evento: GestureResponderEvent) => {
        ir(1);
        onPressOut?.(evento);
      }}
      style={[style, animado]}
    />
  );
}

import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { tocarHaptica } from "../services/haptica";
import { useTheme } from "../theme/ThemeProvider";
import { MOTION, RADIUS, SIZES } from "../styles/theme";
import { CURVA } from "./motion";
import { Text } from "./Text";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

const RECUO = 3;

/**
 * Controle segmentado com a pílula da opção escolhida deslizando até ela.
 * Antes de medir a largura (primeiro quadro, testes), a opção escolhida pinta o próprio fundo.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const [largura, setLargura] = useState(0);
  const indice = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const larguraDoSegmento = largura > 0 ? (largura - RECUO * 2) / options.length : 0;
  const posicao = useSharedValue(0);

  const larguraAnterior = useRef(0);

  useEffect(() => {
    // Medida nova: posiciona sem animar. Só a troca de opção desliza a pílula.
    if (larguraAnterior.current !== larguraDoSegmento) {
      larguraAnterior.current = larguraDoSegmento;
      posicao.set(indice * larguraDoSegmento);
      return;
    }
    posicao.set(
      withTiming(indice * larguraDoSegmento, {
        duration: MOTION.sheet.duration,
        easing: CURVA,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [indice, larguraDoSegmento, posicao]);

  const pilula = useAnimatedStyle(() => ({ transform: [{ translateX: posicao.value }] }));

  function medir(evento: LayoutChangeEvent) {
    setLargura(evento.nativeEvent.layout.width);
  }

  function escolher(proximo: T) {
    if (proximo !== value) {
      tocarHaptica("selecao");
      onChange(proximo);
    }
  }

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={medir}
      style={[styles.track, { backgroundColor: colors.sunk }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pilula,
          {
            width: larguraDoSegmento,
            backgroundColor: larguraDoSegmento > 0 ? colors.ink : "transparent",
          },
          pilula,
        ]}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => escolher(option.value)}
            style={[
              styles.segment,
              selected && larguraDoSegmento === 0 && { backgroundColor: colors.ink },
            ]}
          >
            <Text
              variant="support"
              weight={selected ? 600 : 500}
              color={selected ? "onInk" : "ink"}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: RECUO,
    borderRadius: RADIUS.pill,
  },
  pilula: {
    position: "absolute",
    top: RECUO,
    bottom: RECUO,
    left: RECUO,
    borderRadius: RADIUS.pill,
  },
  segment: {
    flex: 1,
    minHeight: SIZES.touchMin,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
});

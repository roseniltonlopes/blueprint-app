import { useId } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

type GradienteProps = {
  cores: readonly [string, string];
  /** "vertical" é o 180deg da marca; "horizontal" vai da esquerda para a direita (barras) */
  direcao?: "vertical" | "horizontal";
  style?: StyleProp<ViewStyle>;
};

/** Preenche o pai com o gradiente da marca. Use dentro de um View com overflow hidden. */
export function Gradiente({ cores, direcao = "vertical", style }: GradienteProps) {
  const id = `grad-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient
            id={id}
            x1="0"
            y1="0"
            x2={direcao === "horizontal" ? "1" : "0"}
            y2={direcao === "horizontal" ? "0" : "1"}
          >
            <Stop offset="0" stopColor={cores[0]} />
            <Stop offset="1" stopColor={cores[1]} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { RADIUS, SPACING } from "../styles/theme";

type CardProps = {
  children: ReactNode;
  /** Raio do cartão, conforme docs/04 seção 4 */
  radius?: keyof typeof RADIUS;
  /** "card" é a sombra difusa padrão; "glow" é o brilho laranja do item selecionado */
  elevation?: "card" | "glow" | "none";
  /** Inverte as cores (fundo ink), usado no estado selecionado */
  inverted?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({
  children,
  radius = "card",
  elevation = "card",
  inverted = false,
  style,
}: CardProps) {
  const { colors, shadows } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: inverted ? colors.ink : colors.card,
          borderRadius: RADIUS[radius],
          padding: SPACING.lg,
          boxShadow: elevation === "none" ? "none" : shadows[elevation],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

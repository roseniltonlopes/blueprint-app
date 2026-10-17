import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import {
  FONT_FAMILY,
  TYPOGRAPHY,
  type FontWeight,
  type TextVariant,
  type ThemeColors,
} from "../styles/theme";

type TextColor = keyof Pick<ThemeColors, "ink" | "onInk" | "mute" | "accentText" | "placeholder">;

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: TextColor;
  /** Substitui o peso padrão da variante */
  weight?: FontWeight;
};

export function Text({ variant = "body", color = "ink", weight, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  const spec = TYPOGRAPHY[variant];

  return (
    <RNText
      {...rest}
      style={[
        {
          color: colors[color],
          fontFamily: FONT_FAMILY[weight ?? spec.weight],
          fontSize: spec.fontSize,
          lineHeight: spec.lineHeight,
          letterSpacing: spec.letterSpacingEm * spec.fontSize,
        },
        style,
      ]}
    />
  );
}

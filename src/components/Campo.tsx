import {
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import { FONT_FAMILY, RADIUS, SIZES, SPACING, TYPOGRAPHY } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../ui/Text";

type CampoProps = {
  rotulo: string;
  valor: string;
  aoMudar: (texto: string) => void;
  placeholder?: string;
  teclado?: KeyboardTypeOptions;
  maxLength?: number;
  /** Esconde o texto digitado (senha) */
  seguro?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  /** Mensagem de erro mostrada logo abaixo do campo */
  erro?: string | null;
};

/** Campo de texto com contorno de 1px e o rótulo visível acima (e como rótulo de acessibilidade). */
export default function Campo({
  rotulo,
  valor,
  aoMudar,
  placeholder,
  teclado,
  maxLength,
  seguro,
  autoCapitalize,
  autoComplete,
  textContentType,
  erro,
}: CampoProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.grupo}>
      <Text variant="caption" color="mute">
        {rotulo}
      </Text>
      <TextInput
        accessibilityLabel={rotulo}
        accessibilityHint={erro ?? undefined}
        value={valor}
        onChangeText={aoMudar}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardType={teclado}
        maxLength={maxLength}
        secureTextEntry={seguro}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={seguro || teclado === "email-address" ? false : undefined}
        textContentType={textContentType}
        style={[
          styles.campo,
          {
            borderColor: erro ? colors.accentText : colors.hair,
            color: colors.ink,
            fontFamily: FONT_FAMILY[500],
            fontSize: TYPOGRAPHY.body.fontSize,
          },
        ]}
      />
      {erro ? (
        <Text variant="caption" color="accentText" weight={600} accessibilityRole="alert">
          {erro}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: SPACING.xs },
  campo: {
    minHeight: SIZES.field,
    borderWidth: 1,
    borderRadius: RADIUS.field,
    paddingHorizontal: SPACING.lg,
  },
});

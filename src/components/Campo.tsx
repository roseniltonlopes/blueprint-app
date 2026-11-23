import { forwardRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import {
  ESCALA_MAXIMA_DA_FONTE,
  FONT_FAMILY,
  RADIUS,
  SIZES,
  SPACING,
  TYPOGRAPHY,
} from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";

type CampoProps = {
  rotulo: string;
  valor: string;
  aoMudar: (texto: string) => void;
  placeholder?: string;
  teclado?: KeyboardTypeOptions;
  maxLength?: number;
  /** Esconde o texto digitado (senha), com o botão de olho para mostrar */
  seguro?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  /** Tecla de ação do teclado ("next" leva ao próximo campo, "done" envia) */
  teclaDeAcao?: TextInputProps["returnKeyType"];
  aoConfirmar?: () => void;
  /** Mensagem de erro mostrada logo abaixo do campo */
  erro?: string | null;
  /** Texto de apoio abaixo do campo quando não há erro */
  ajuda?: string;
  testID?: string;
};

/** Campo de texto com contorno de 1px e o rótulo visível acima (e como rótulo de acessibilidade). */
const Campo = forwardRef<TextInput, CampoProps>(function Campo(
  {
    rotulo,
    valor,
    aoMudar,
    placeholder,
    teclado,
    maxLength,
    seguro = false,
    autoCapitalize,
    autoComplete,
    textContentType,
    teclaDeAcao,
    aoConfirmar,
    erro,
    ajuda,
    testID,
  },
  ref,
) {
  const { colors } = useTheme();
  const [visivel, setVisivel] = useState(false);
  const escondido = seguro && !visivel;

  return (
    <View style={styles.grupo}>
      <Text variant="caption" color="mute">
        {rotulo}
      </Text>
      <View
        style={[
          styles.moldura,
          { borderColor: erro ? colors.accentText : colors.hair, backgroundColor: colors.card },
        ]}
      >
        <TextInput
          ref={ref}
          testID={testID}
          accessibilityLabel={rotulo}
          accessibilityHint={erro ?? undefined}
          value={valor}
          onChangeText={aoMudar}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          keyboardType={teclado}
          maxLength={maxLength}
          secureTextEntry={escondido}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={seguro || teclado === "email-address" ? false : undefined}
          textContentType={textContentType}
          returnKeyType={teclaDeAcao}
          onSubmitEditing={aoConfirmar}
          submitBehavior={teclaDeAcao === "next" ? "submit" : undefined}
          maxFontSizeMultiplier={ESCALA_MAXIMA_DA_FONTE}
          style={[
            styles.campo,
            {
              color: colors.ink,
              fontFamily: FONT_FAMILY[500],
              fontSize: TYPOGRAPHY.body.fontSize,
            },
          ]}
        />
        {seguro ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visivel ? "Esconder a senha" : "Mostrar a senha"}
            accessibilityState={{ selected: visivel }}
            onPress={() => setVisivel((atual) => !atual)}
            hitSlop={4}
            style={styles.olho}
            testID={testID ? `${testID}-olho` : undefined}
          >
            <Icon name={visivel ? "olhoFechado" : "olho"} color={colors.mute} size={20} />
          </Pressable>
        ) : null}
      </View>
      {erro ? (
        <Text variant="caption" color="accentText" weight={600} accessibilityRole="alert">
          {erro}
        </Text>
      ) : ajuda ? (
        <Text variant="caption" color="mute">
          {ajuda}
        </Text>
      ) : null}
    </View>
  );
});

export default Campo;

const styles = StyleSheet.create({
  grupo: { gap: SPACING.xs },
  moldura: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: SIZES.field,
    borderWidth: 1,
    borderRadius: RADIUS.field,
  },
  campo: {
    flex: 1,
    alignSelf: "stretch",
    paddingHorizontal: SPACING.lg,
  },
  olho: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.xs,
  },
});

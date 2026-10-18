import { useId, useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { FONT_FAMILY, RADIUS, SIZES, SPACING } from "../styles/theme";
import { Icon } from "./Icon";
import { Text } from "./Text";

type CampoProps = Omit<TextInputProps, "style" | "secureTextEntry"> & {
  rotulo: string;
  erro?: string;
  /** Campo de senha com botão de mostrar/ocultar */
  senha?: boolean;
};

/** Campo de texto do cadastro (docs/03 tela 1): rótulo acima, contorno hairline, erro abaixo. */
export function Campo({ rotulo, erro, senha = false, ...props }: CampoProps) {
  const { colors } = useTheme();
  const [visivel, setVisivel] = useState(false);
  const idRotulo = `rotulo-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;

  return (
    <View style={styles.campo}>
      <Text variant="support" weight={600} nativeID={idRotulo}>
        {rotulo}
      </Text>
      <View>
        <TextInput
          {...props}
          accessibilityLabel={rotulo}
          accessibilityLabelledBy={idRotulo}
          accessibilityHint={erro}
          secureTextEntry={senha && !visivel}
          placeholderTextColor={colors.placeholder}
          style={[
            styles.input,
            senha && styles.inputComBotao,
            {
              borderColor: erro ? colors.accent : colors.hair,
              backgroundColor: colors.card,
              color: colors.ink,
            },
          ]}
        />
        {senha ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visivel ? "Ocultar senha" : "Mostrar senha"}
            onPress={() => setVisivel((v) => !v)}
            style={styles.olho}
          >
            <Icon name={visivel ? "olhoFechado" : "olho"} color={colors.mute} size={20} />
          </Pressable>
        ) : null}
      </View>
      {erro ? (
        <Text variant="caption" color="ink" accessibilityLiveRegion="polite">
          {erro}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: { gap: 6 },
  input: {
    height: SIZES.field,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderRadius: RADIUS.field,
    fontFamily: FONT_FAMILY[400],
    fontSize: 16,
  },
  inputComBotao: { paddingRight: 56 },
  olho: {
    position: "absolute",
    right: 4,
    top: 4,
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
});

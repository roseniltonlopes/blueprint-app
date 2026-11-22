import { Pressable, StyleSheet } from "react-native";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../ui/Text";

type BotaoTextoProps = {
  rotulo: string;
  /** Quando o texto visível não basta para distinguir botões iguais (ex.: um por agenda) */
  rotuloAcessivel?: string;
  aoPressionar: () => void;
  /** "primario" é o botão preto; "secundario" é o tom de superfície; "link" não tem fundo */
  variante?: "primario" | "secundario" | "link";
  /** Bloqueia o toque (por exemplo, enquanto um envio está em andamento) */
  desabilitado?: boolean;
  testID?: string;
};

export default function BotaoTexto({
  rotulo,
  rotuloAcessivel,
  aoPressionar,
  variante = "secundario",
  desabilitado = false,
  testID,
}: BotaoTextoProps) {
  const { colors } = useTheme();
  const fundo =
    variante === "primario" ? colors.ink : variante === "secundario" ? colors.sunk : "transparent";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel ?? rotulo}
      accessibilityState={desabilitado ? { disabled: true } : undefined}
      disabled={desabilitado}
      onPress={aoPressionar}
      testID={testID}
      style={[styles.botao, { backgroundColor: fundo, opacity: desabilitado ? 0.6 : 1 }]}
    >
      <Text
        variant="body"
        weight={600}
        color={variante === "primario" ? "onInk" : variante === "link" ? "accentText" : "ink"}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    minHeight: SIZES.touchMin,
    borderRadius: RADIUS.button,
    paddingHorizontal: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
  },
});

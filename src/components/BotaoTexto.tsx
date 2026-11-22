import { Pressable, StyleSheet } from "react-native";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "../ui/Text";

type BotaoTextoProps = {
  rotulo: string;
  /** Quando o texto visível não basta para distinguir botões iguais (ex.: um por agenda) */
  rotuloAcessivel?: string;
  aoPressionar: () => void;
  /**
   * "primario" é o botão preto; "secundario" é o tom de superfície; "link" não tem fundo;
   * "perigo" (ações que apagam dados) tem contorno laranja e texto ink: laranja como texto não
   * tem contraste no modo claro.
   */
  variante?: "primario" | "secundario" | "link" | "perigo";
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
  const contorno = variante === "perigo" ? { borderWidth: 1, borderColor: colors.accent } : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel ?? rotulo}
      accessibilityState={desabilitado ? { disabled: true } : undefined}
      disabled={desabilitado}
      onPress={aoPressionar}
      testID={testID}
      style={[styles.botao, contorno, { backgroundColor: fundo, opacity: desabilitado ? 0.6 : 1 }]}
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

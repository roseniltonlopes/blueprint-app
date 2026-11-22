import { StyleSheet } from "react-native";
import { BRAND, RADIUS } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Icon, type IconName } from "../ui/Icon";
import { PressableEscala } from "../ui/PressableEscala";

type BotaoFlutuanteProps = {
  rotulo: string;
  aoPressionar: () => void;
  icone?: IconName;
};

const TAMANHO = 60;

/** Botão de ação principal que flutua no canto da tela (laranja, com o brilho da marca). */
export default function BotaoFlutuante({
  rotulo,
  aoPressionar,
  icone = "mais",
}: BotaoFlutuanteProps) {
  const { colors, shadows } = useTheme();
  return (
    <PressableEscala
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={aoPressionar}
      haptica="selecao"
      escala={0.92}
      style={[styles.botao, { backgroundColor: colors.accent, boxShadow: shadows.glow }]}
    >
      <Icon name={icone} color={BRAND.black} size={26} strokeWidth={2.4} />
    </PressableEscala>
  );
}

const styles = StyleSheet.create({
  botao: {
    width: TAMANHO,
    height: TAMANHO,
    borderRadius: RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
  },
});

import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { BRAND, RADIUS, SIZES, SPACING } from "../styles/theme";
import { Icon, type IconName } from "../ui/Icon";
import { PressableEscala } from "../ui/PressableEscala";
import { Text } from "../ui/Text";

type BotaoOpcaoProps = {
  titulo: string;
  subtitulo: string;
  icone: IconName;
  selecionado: boolean;
  aoPressionar: () => void;
  /** "cartao" ocupa meia largura na grade; "linha" é a linha larga do "Outro" */
  formato?: "cartao" | "linha";
};

/**
 * Cartão de categoria da Home.
 * Selecionado: contorno laranja, ícone sobre laranja e selo de confirmação.
 */
export default function BotaoOpcao({
  titulo,
  subtitulo,
  icone,
  selecionado,
  aoPressionar,
  formato = "cartao",
}: BotaoOpcaoProps) {
  const { colors, shadows } = useTheme();
  const linha = formato === "linha";

  const circulo = (
    <View style={[styles.circulo, { backgroundColor: selecionado ? colors.accent : colors.sunk }]}>
      <Icon name={icone} color={selecionado ? BRAND.black : colors.ink} />
    </View>
  );

  const textos = (
    <View style={linha && styles.textosLinha}>
      <Text variant="body" numberOfLines={1}>
        {titulo}
      </Text>
      <Text variant="caption" color="mute" numberOfLines={1}>
        {subtitulo}
      </Text>
    </View>
  );

  const selo = selecionado ? (
    <View style={[styles.selo, { backgroundColor: colors.accent }]}>
      <Icon name="check" color={BRAND.black} size={15} strokeWidth={2.8} />
    </View>
  ) : null;

  return (
    <PressableEscala
      accessibilityRole="button"
      accessibilityLabel={`${titulo}, ${subtitulo}`}
      accessibilityState={{ selected: selecionado }}
      onPress={aoPressionar}
      style={[
        linha ? styles.linha : styles.cartao,
        {
          backgroundColor: colors.card,
          borderColor: selecionado ? colors.accent : colors.hair,
          borderWidth: selecionado ? 1.5 : 1,
          boxShadow: shadows.card,
        },
      ]}
    >
      {linha ? (
        <>
          {circulo}
          {textos}
          {selo}
        </>
      ) : (
        <>
          <View style={styles.topo}>
            {circulo}
            {selo}
          </View>
          {textos}
        </>
      )}
    </PressableEscala>
  );
}

const styles = StyleSheet.create({
  cartao: {
    height: SIZES.categoryCard,
    padding: 14,
    borderRadius: RADIUS.category,
    justifyContent: "space-between",
  },
  linha: {
    height: SIZES.categoryRow,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.category,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  topo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  textosLinha: { flex: 1, minWidth: 0 },
  circulo: {
    width: SIZES.iconCircle,
    height: SIZES.iconCircle,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  selo: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});

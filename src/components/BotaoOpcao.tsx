import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { BRAND, RADIUS, SIZES, SPACING } from "../styles/theme";
import { Icon, type IconName } from "../ui/Icon";
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
 * Cartão de categoria da Home (docs/03, telas 2 e 3).
 * Selecionado: cartão invertido, selo laranja e brilho.
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
    <View style={[styles.circulo, { backgroundColor: selecionado ? colors.onInk : colors.sunk }]}>
      <Icon name={icone} color={colors.ink} />
    </View>
  );

  const textos = (
    <View style={linha && styles.textosLinha}>
      <Text variant="body" color={selecionado ? "onInk" : "ink"} numberOfLines={1}>
        {titulo}
      </Text>
      <Text
        variant="caption"
        color={selecionado ? "onInk" : "mute"}
        style={selecionado && styles.subtituloSelecionado}
        numberOfLines={1}
      >
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titulo}, ${subtitulo}`}
      accessibilityState={{ selected: selecionado }}
      onPress={aoPressionar}
      style={({ pressed }) => [
        linha ? styles.linha : styles.cartao,
        {
          backgroundColor: selecionado ? colors.ink : colors.card,
          boxShadow: selecionado ? shadows.glow : shadows.card,
        },
        pressed && styles.pressionado,
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    flex: 1,
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
  subtituloSelecionado: { opacity: 0.76 },
  pressionado: { transform: [{ translateY: 2 }, { scale: 0.99 }] },
});

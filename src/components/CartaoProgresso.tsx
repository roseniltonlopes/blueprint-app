import { StyleSheet, View } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";
import { mensagemDeProgresso } from "../domain/acoes";
import { useTheme } from "../theme/ThemeProvider";
import { RADIUS, SPACING } from "../styles/theme";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";
import AnelProgresso from "./AnelProgresso";

type CartaoProgressoProps = {
  total: number;
  meta: number;
};

const CELULA = 16;

/** Quadriculado de 16px do cartão de progresso (canvas v2). */
function Quadriculado({ cor }: { cor: string }) {
  return (
    <View style={styles.quadriculado} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="quadriculado" width={CELULA} height={CELULA} patternUnits="userSpaceOnUse">
            <Path d={`M0 0.5H${CELULA}M0.5 0V${CELULA}`} stroke={cor} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#quadriculado)" />
      </Svg>
    </View>
  );
}

/** Cartão de progresso do dia (docs/03, telas 2, 3 e 5). */
export default function CartaoProgresso({ total, meta }: CartaoProgressoProps) {
  const { colors } = useTheme();

  return (
    <Card radius="progress" style={styles.cartao}>
      <Quadriculado cor={colors.grid} />
      <AnelProgresso total={total} meta={meta} />
      <View style={styles.textos}>
        <Text variant="body">ações registradas hoje</Text>
        <Text variant="support" color="mute">
          {mensagemDeProgresso(total, meta)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.lg,
    paddingHorizontal: 18,
  },
  quadriculado: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: RADIUS.progress,
    overflow: "hidden",
  },
  textos: { flex: 1, minWidth: 0, gap: 6 },
});

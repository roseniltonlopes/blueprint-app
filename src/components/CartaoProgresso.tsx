import { StyleSheet, View } from "react-native";
import { mensagemDeProgresso } from "../domain/acoes";
import { plural } from "../domain/texto";
import { RADIUS, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";
import AnelProgresso from "./AnelProgresso";

type CartaoProgressoProps = {
  total: number;
  meta: number;
  /** Dias seguidos com pelo menos 1 ação; o selo só aparece a partir de 1 */
  sequencia: number;
};

/** Progresso do dia: anel compacto, texto e o selo de sequência à direita. */
export default function CartaoProgresso({ total, meta, sequencia }: CartaoProgressoProps) {
  const { colors } = useTheme();
  return (
    <Card style={styles.cartao}>
      <AnelProgresso total={total} meta={meta} tamanho="compacto" />
      <View style={styles.textos}>
        <Text variant="body" weight={600}>
          {`${total} de ${meta} ações hoje`}
        </Text>
        <Text variant="support" color="mute">
          {mensagemDeProgresso(total, meta)}
        </Text>
      </View>
      {sequencia > 0 ? (
        <View
          accessible
          accessibilityLabel={`Sequência de ${plural(sequencia, "dia", "dias")}`}
          style={[styles.selo, { backgroundColor: colors.sunk }]}
        >
          <Icon name="chama" color={colors.ink} size={16} strokeWidth={2} />
          <Text variant="caption" weight={600}>
            {sequencia}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.lg,
  },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  selo: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});

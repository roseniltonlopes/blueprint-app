import { StyleSheet, View } from "react-native";
import { mensagemDeProgresso } from "../domain/acoes";
import { SPACING } from "../styles/theme";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";
import AnelProgresso from "./AnelProgresso";

type CartaoProgressoProps = {
  total: number;
  meta: number;
};

/** Cartão de progresso do dia: anel à esquerda, texto à direita. */
export default function CartaoProgresso({ total, meta }: CartaoProgressoProps) {
  return (
    <Card radius="progress" style={styles.cartao}>
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
  textos: { flex: 1, minWidth: 0, gap: 6 },
});

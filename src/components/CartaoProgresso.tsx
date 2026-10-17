import { StyleSheet, View } from "react-native";
import { mensagemDeProgresso } from "../domain/acoes";
import { SPACING } from "../styles/theme";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";

type CartaoProgressoProps = {
  total: number;
  meta: number;
};

/**
 * Cartão de progresso do dia. Nesta etapa o progresso é numérico;
 * o anel segmentado com gradiente substitui o bloco da esquerda na Etapa 3.
 */
export default function CartaoProgresso({ total, meta }: CartaoProgressoProps) {
  return (
    <Card radius="progress" style={styles.cartao}>
      <View
        style={styles.numero}
        accessible
        accessibilityLabel={`${total} de ${meta} ações registradas hoje`}
      >
        <Text variant="ring" testID="progresso-total">
          {total}
        </Text>
        <Text variant="caption" color="mute">
          de {meta}
        </Text>
      </View>
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
  numero: { width: 124, height: 124, alignItems: "center", justifyContent: "center" },
  textos: { flex: 1, minWidth: 0, gap: 6 },
});

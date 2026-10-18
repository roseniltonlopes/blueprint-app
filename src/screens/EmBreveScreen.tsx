import { StyleSheet } from "react-native";
import { SPACING } from "../styles/theme";
import { Card } from "../ui/Card";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";

type EmBreveScreenProps = {
  titulo: string;
  descricao: string;
};

/** Aba ainda não implementada (Calendário e Perfil chegam na Etapa 5). */
export default function EmBreveScreen({ titulo, descricao }: EmBreveScreenProps) {
  return (
    <Screen contentStyle={styles.conteudo}>
      <Text variant="h1" accessibilityRole="header">
        {titulo}
      </Text>
      <Card>
        <Text variant="support" color="mute">
          {descricao}
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: SPACING.lg },
});

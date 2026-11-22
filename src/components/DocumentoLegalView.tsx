import { StyleSheet, View } from "react-native";
import type { DocumentoLegal } from "../legal/textos";
import { SPACING } from "../styles/theme";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";

/** Termos ou política, renderizados do texto embutido no app (funciona sem internet). */
export default function DocumentoLegalView({ documento }: { documento: DocumentoLegal }) {
  return (
    <View style={styles.documento}>
      <Text variant="caption" color="mute">
        {`Versão ${documento.versao}, atualizada em ${documento.atualizadoEm}`}
      </Text>
      <Text variant="body">{documento.introducao}</Text>
      {documento.secoes.map((secao) => (
        <Card key={secao.titulo} radius="category" style={styles.secao}>
          <Text variant="section" accessibilityRole="header">
            {secao.titulo}
          </Text>
          {secao.paragrafos.map((paragrafo) => (
            <Text key={paragrafo} variant="support">
              {paragrafo}
            </Text>
          ))}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  documento: { gap: SPACING.gap },
  secao: { gap: SPACING.sm },
});

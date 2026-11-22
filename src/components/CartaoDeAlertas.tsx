import { Linking, Platform, Pressable, StyleSheet } from "react-native";
import { useAlertas } from "../hooks/useAlertas";
import type { EstadoDaPermissao } from "../services/alertas";
import { SIZES, SPACING } from "../styles/theme";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";

const TEXTOS: Record<EstadoDaPermissao | "carregando", string> = {
  carregando: "Verificando a permissão do aparelho.",
  concedida:
    'Ligados. Em cada compromisso, preencha "Avisar antes" para receber o alerta, inclusive com o app fechado.',
  perguntar: "Desligados. Permita para ser avisado dos compromissos da agenda.",
  negada: "Bloqueados nas configurações do aparelho. Libere as notificações do Blueprint por lá.",
};

function abrirConfiguracoes() {
  Linking.openSettings().catch((erro: unknown) => {
    console.warn("Não foi possível abrir as configurações do aparelho.", erro);
  });
}

function Acao({ titulo, aoPressionar }: { titulo: string; aoPressionar: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={aoPressionar} style={styles.acao}>
      <Text variant="support" color="accentText" weight={600}>
        {titulo}
      </Text>
    </Pressable>
  );
}

/** Estado da permissão de notificações e atalhos para resolver (etapa 3, alertas locais). */
export default function CartaoDeAlertas() {
  const { permissao, pedirPermissao } = useAlertas();
  const android = Platform.OS === "android";

  return (
    <Card radius="category" style={styles.cartao}>
      <Text variant="body">Alertas da agenda</Text>
      <Text variant="support" color="mute" testID="estado-dos-alertas">
        {TEXTOS[permissao ?? "carregando"]}
      </Text>
      {permissao === "perguntar" ? (
        <Acao titulo="Permitir alertas" aoPressionar={() => void pedirPermissao()} />
      ) : null}
      {permissao === "negada" ? (
        <Acao titulo="Abrir configurações" aoPressionar={abrirConfiguracoes} />
      ) : null}
      {permissao === "concedida" && android ? (
        <>
          <Text variant="caption" color="mute">
            Se um alerta atrasar ou não tocar, deixe o Blueprint sem restrição de bateria.
          </Text>
          <Acao titulo="Abrir configurações do app" aoPressionar={abrirConfiguracoes} />
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: SPACING.xs },
  acao: { minHeight: SIZES.touchMin, justifyContent: "center", alignSelf: "flex-start" },
});

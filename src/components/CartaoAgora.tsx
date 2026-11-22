import { StyleSheet, View } from "react-native";
import { rotuloDoHorario } from "../domain/agenda";
import { formatarDuracao, type DestaqueDoDia } from "../domain/hoje";
import { BRAND, RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Gradiente } from "../ui/Gradiente";
import { Icon } from "../ui/Icon";
import { PressableEscala } from "../ui/PressableEscala";
import { Text } from "../ui/Text";

type CartaoAgoraProps = {
  destaque: DestaqueDoDia;
  aoMarcarFeito: () => void;
  aoMarcarNaoFui: () => void;
};

const TAMANHO_DO_BOTAO = 64;

/**
 * Topo da Home: o compromisso de agora (ou o próximo) com um botão grande de concluir.
 * Fundo em tinta cheia para ser a primeira coisa que o olho encontra.
 */
export default function CartaoAgora({ destaque, aoMarcarFeito, aoMarcarNaoFui }: CartaoAgoraProps) {
  const { colors, shadows } = useTheme();
  const { ocorrencia } = destaque;
  const nome = ocorrencia.atividade.nome;
  const agora = destaque.tipo === "agora";
  const tempo = agora
    ? `termina em ${formatarDuracao(destaque.minutosRestantes)}`
    : `começa em ${formatarDuracao(destaque.minutosParaComecar)}`;
  const horario = rotuloDoHorario(ocorrencia);

  return (
    <View
      accessibilityRole="summary"
      style={[styles.cartao, { backgroundColor: colors.ink, boxShadow: shadows.card }]}
    >
      <View style={styles.linha}>
        <View style={styles.etiqueta}>
          <View style={[styles.ponto, { backgroundColor: colors.accent }]} />
          <Text variant="caption" weight={700} color="onInk" style={styles.rotulo}>
            {agora ? "AGORA" : "PRÓXIMO"}
          </Text>
        </View>
        <Text variant="caption" color="onInkMute">
          {tempo}
        </Text>
      </View>

      <View style={styles.corpo}>
        <View style={styles.textos}>
          <Text variant="sheetTitle" color="onInk" numberOfLines={1}>
            {nome}
          </Text>
          <Text variant="support" color="onInkMute" numberOfLines={1}>
            {ocorrencia.detalhe ? `${horario}  ·  ${ocorrencia.detalhe}` : horario}
          </Text>
        </View>
        <PressableEscala
          accessibilityRole="button"
          accessibilityLabel={`Marcar ${nome} como feito`}
          onPress={aoMarcarFeito}
          escala={0.92}
          style={[styles.concluir, { backgroundColor: colors.accent, boxShadow: shadows.glow }]}
        >
          <Icon name="check" color={BRAND.black} size={28} strokeWidth={2.6} />
        </PressableEscala>
      </View>

      {agora ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.trilha, { backgroundColor: colors.onInkTrack }]}
        >
          <View style={[styles.preenchido, { width: `${Math.round(destaque.progresso * 100)}%` }]}>
            <Gradiente cores={colors.gradient} direcao="horizontal" />
          </View>
        </View>
      ) : null}

      <View style={styles.linha}>
        <Text variant="caption" color="onInkMute" numberOfLines={1} style={styles.depois}>
          {destaque.depois
            ? `Depois: ${destaque.depois.atividade.nome} às ${destaque.depois.inicio}`
            : "Último compromisso de hoje"}
        </Text>
        <PressableEscala
          accessibilityRole="button"
          accessibilityLabel={`Marcar ${nome} como não fiz`}
          onPress={aoMarcarNaoFui}
          style={styles.naoFui}
        >
          <Text variant="caption" weight={600} color="onInk">
            Não fiz
          </Text>
        </PressableEscala>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    borderRadius: RADIUS.progress,
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
    gap: SPACING.lg,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  etiqueta: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  ponto: { width: 8, height: 8, borderRadius: RADIUS.pill },
  rotulo: { letterSpacing: 1 },
  corpo: { flexDirection: "row", alignItems: "center", gap: SPACING.lg },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  concluir: {
    width: TAMANHO_DO_BOTAO,
    height: TAMANHO_DO_BOTAO,
    borderRadius: TAMANHO_DO_BOTAO / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  trilha: { height: 6, borderRadius: RADIUS.pill, overflow: "hidden" },
  preenchido: { height: 6, borderRadius: RADIUS.pill, overflow: "hidden" },
  depois: { flex: 1 },
  naoFui: { minHeight: SIZES.touchMin, justifyContent: "center", paddingHorizontal: SPACING.xs },
});

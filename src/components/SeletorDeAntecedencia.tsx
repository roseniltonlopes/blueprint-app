import { StyleSheet, View } from "react-native";
import { ANTECEDENCIA_MAX } from "../domain/agenda";
import { formatarAntecedencia } from "../domain/alertas";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { PressableEscala } from "../ui/PressableEscala";
import { Text } from "../ui/Text";

type SeletorDeAntecedenciaProps = {
  /** Minutos antes do início; null é "sem aviso" */
  valor: number | null;
  aoMudar: (minutos: number | null) => void;
};

const PASSO = 5;
const ATALHOS: readonly { rotulo: string; minutos: number | null }[] = [
  { rotulo: "Sem aviso", minutos: null },
  { rotulo: "Na hora", minutos: 0 },
  { rotulo: "15 min", minutos: 15 },
  { rotulo: "30 min", minutos: 30 },
];

/**
 * Lembrete do compromisso: menos e mais de 5 em 5 minutos (0 a 120) e atalhos comuns.
 * Substitui o campo numérico, que deixava digitar valores fora do intervalo.
 */
export default function SeletorDeAntecedencia({ valor, aoMudar }: SeletorDeAntecedenciaProps) {
  const { colors } = useTheme();
  const texto = valor === null ? "Sem aviso" : valor === 0 ? "Na hora" : `${valor} min`;

  function mudar(delta: number) {
    const base = valor ?? 0;
    aoMudar(Math.min(ANTECEDENCIA_MAX, Math.max(0, base + delta)));
  }

  return (
    <View style={styles.bloco}>
      <Card style={styles.linha}>
        <Icon name="sino" color={colors.ink} size={20} />
        <Text variant="body" style={styles.rotulo}>
          Avisar antes
        </Text>
        <PressableEscala
          accessibilityRole="button"
          accessibilityLabel="Diminuir 5 minutos"
          accessibilityState={{ disabled: valor === null || valor === 0 }}
          disabled={valor === null || valor === 0}
          onPress={() => mudar(-PASSO)}
          haptica="selecao"
          style={[styles.passo, { backgroundColor: colors.sunk }]}
        >
          <Icon name="menos" color={colors.ink} size={18} strokeWidth={2.2} />
        </PressableEscala>
        <Text
          variant="body"
          weight={600}
          accessibilityLiveRegion="polite"
          accessibilityLabel={valor === null ? "Sem aviso" : formatarAntecedencia(valor)}
          testID="antecedencia"
          style={styles.valor}
        >
          {texto}
        </Text>
        <PressableEscala
          accessibilityRole="button"
          accessibilityLabel="Aumentar 5 minutos"
          accessibilityState={{ disabled: valor === ANTECEDENCIA_MAX }}
          disabled={valor === ANTECEDENCIA_MAX}
          onPress={() => mudar(PASSO)}
          haptica="selecao"
          style={[styles.passo, { backgroundColor: colors.sunk }]}
        >
          <Icon name="mais" color={colors.ink} size={18} strokeWidth={2.2} />
        </PressableEscala>
      </Card>
      <View style={styles.atalhos}>
        {ATALHOS.map((atalho) => {
          const ativo = atalho.minutos === valor;
          return (
            <PressableEscala
              key={atalho.rotulo}
              accessibilityRole="button"
              accessibilityLabel={`Avisar: ${atalho.rotulo}`}
              accessibilityState={{ selected: ativo }}
              onPress={() => aoMudar(atalho.minutos)}
              haptica="selecao"
              style={[
                styles.atalho,
                ativo
                  ? { backgroundColor: colors.ink }
                  : { backgroundColor: colors.card, borderColor: colors.hair, borderWidth: 1 },
              ]}
            >
              <Text variant="caption" weight={600} color={ativo ? "onInk" : "ink"}>
                {atalho.rotulo}
              </Text>
            </PressableEscala>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: SPACING.sm },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.sm,
  },
  rotulo: { flex: 1 },
  passo: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  valor: { minWidth: 76, textAlign: "center", fontVariant: ["tabular-nums"] },
  atalhos: { flexDirection: "row", gap: SPACING.sm },
  atalho: {
    flex: 1,
    minHeight: SIZES.touchMin,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});

import { StyleSheet, View } from "react-native";
import type { DiaDaSemana } from "../domain/agenda";
import { DIAS_ABREVIADOS, DIAS_DA_SEMANA } from "../domain/datas";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { PressableEscala } from "../ui/PressableEscala";
import { Text } from "../ui/Text";

type SeletorDeDiasProps = {
  valor: readonly DiaDaSemana[];
  aoMudar: (dias: DiaDaSemana[]) => void;
  /** Mostra os atalhos "Seg a sex", "Fim de semana" e "Todos os dias" acima dos sete dias. */
  atalhos?: boolean;
};

const TODOS_OS_DIAS: readonly DiaDaSemana[] = [0, 1, 2, 3, 4, 5, 6];

const ATALHOS: readonly { rotulo: string; dias: readonly DiaDaSemana[] }[] = [
  { rotulo: "Seg a sex", dias: [1, 2, 3, 4, 5] },
  { rotulo: "Fim de semana", dias: [0, 6] },
  { rotulo: "Todos os dias", dias: TODOS_OS_DIAS },
];

function mesmosDias(a: readonly DiaDaSemana[], b: readonly DiaDaSemana[]): boolean {
  return a.length === b.length && a.every((dia) => b.includes(dia));
}

/**
 * Sete botões, de domingo a sábado, para escolher em quais dias o compromisso repete.
 * Com `atalhos`, os grupos mais comuns ficam a um toque.
 */
export default function SeletorDeDias({ valor, aoMudar, atalhos = false }: SeletorDeDiasProps) {
  const { colors } = useTheme();

  function alternar(dia: DiaDaSemana) {
    aoMudar(
      valor.includes(dia) ? valor.filter((d) => d !== dia) : [...valor, dia].sort((a, b) => a - b),
    );
  }

  return (
    <View style={styles.bloco}>
      {atalhos ? (
        <View style={styles.atalhos}>
          {ATALHOS.map((atalho) => {
            const ativo = mesmosDias(valor, atalho.dias);
            return (
              <PressableEscala
                key={atalho.rotulo}
                accessibilityRole="button"
                accessibilityLabel={atalho.rotulo}
                accessibilityState={{ selected: ativo }}
                onPress={() => aoMudar([...atalho.dias])}
                style={[styles.atalho, { backgroundColor: ativo ? colors.ink : colors.sunk }]}
              >
                <Text variant="caption" weight={600} color={ativo ? "onInk" : "ink"}>
                  {atalho.rotulo}
                </Text>
              </PressableEscala>
            );
          })}
        </View>
      ) : null}
      <View style={styles.linha}>
        {TODOS_OS_DIAS.map((dia) => {
          const marcado = valor.includes(dia);
          return (
            <PressableEscala
              key={dia}
              accessibilityRole="checkbox"
              accessibilityLabel={DIAS_DA_SEMANA[dia]}
              accessibilityState={{ checked: marcado }}
              onPress={() => alternar(dia)}
              escala={0.94}
              style={[styles.botao, { backgroundColor: marcado ? colors.ink : colors.sunk }]}
            >
              <Text variant="caption" weight={600} color={marcado ? "onInk" : "ink"}>
                {DIAS_ABREVIADOS[dia]}
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
  atalhos: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  atalho: {
    minHeight: SIZES.touchMin,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  linha: { flexDirection: "row", gap: 6 },
  botao: {
    flex: 1,
    minWidth: 0,
    minHeight: SIZES.touchMin,
    borderRadius: RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
  },
});

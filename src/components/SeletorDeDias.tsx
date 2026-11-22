import { StyleSheet, View } from "react-native";
import type { DiaDaSemana } from "../domain/agenda";
import { DIAS_DA_SEMANA } from "../domain/datas";
import { BRAND, RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { PressableEscala } from "../ui/PressableEscala";
import { Text } from "../ui/Text";

type SeletorDeDiasProps = {
  valor: readonly DiaDaSemana[];
  aoMudar: (dias: DiaDaSemana[]) => void;
  /** Mostra os atalhos "Seg a sex", "Fim de semana" e "Todos os dias" acima dos sete dias. */
  atalhos?: boolean;
  /** Bolinhas de 32 dentro de alvos de 44, para caber na linha de cada compromisso da Agenda */
  compacto?: boolean;
};

const TODOS_OS_DIAS: readonly DiaDaSemana[] = [0, 1, 2, 3, 4, 5, 6];

/** Inicial de cada dia, de domingo a sábado. O nome completo vai no rótulo de acessibilidade. */
const INICIAIS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

const ATALHOS: readonly { rotulo: string; dias: readonly DiaDaSemana[] }[] = [
  { rotulo: "Seg a sex", dias: [1, 2, 3, 4, 5] },
  { rotulo: "Fim de semana", dias: [0, 6] },
  { rotulo: "Todos os dias", dias: TODOS_OS_DIAS },
];

function mesmosDias(a: readonly DiaDaSemana[], b: readonly DiaDaSemana[]): boolean {
  return a.length === b.length && a.every((dia) => b.includes(dia));
}

/**
 * Sete bolinhas, de domingo a sábado, para escolher em quais dias o compromisso repete.
 * Dia ligado fica laranja; desligado fica só com o contorno. Com `atalhos`, os grupos mais comuns
 * ficam a um toque numa trilha segmentada.
 */
export default function SeletorDeDias({
  valor,
  aoMudar,
  atalhos = false,
  compacto = false,
}: SeletorDeDiasProps) {
  const { colors } = useTheme();
  const tamanho = compacto ? 32 : SIZES.touchMin;

  function alternar(dia: DiaDaSemana) {
    aoMudar(
      valor.includes(dia) ? valor.filter((d) => d !== dia) : [...valor, dia].sort((a, b) => a - b),
    );
  }

  return (
    <View style={styles.bloco}>
      {atalhos ? (
        <View style={[styles.trilha, { backgroundColor: colors.sunk }]}>
          {ATALHOS.map((atalho) => {
            const ativo = mesmosDias(valor, atalho.dias);
            return (
              <PressableEscala
                key={atalho.rotulo}
                accessibilityRole="button"
                accessibilityLabel={atalho.rotulo}
                accessibilityState={{ selected: ativo }}
                onPress={() => aoMudar([...atalho.dias])}
                haptica="selecao"
                style={[styles.atalho, ativo && { backgroundColor: colors.ink }]}
              >
                <Text
                  variant="caption"
                  weight={600}
                  color={ativo ? "onInk" : "mute"}
                  numberOfLines={1}
                >
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
              haptica="selecao"
              escala={0.9}
              style={styles.alvo}
            >
              <View
                style={[
                  styles.bolinha,
                  { width: tamanho, height: tamanho, borderRadius: tamanho / 2 },
                  marcado
                    ? { backgroundColor: colors.accent }
                    : { borderWidth: 1.5, borderColor: colors.hair },
                ]}
              >
                <Text
                  variant="caption"
                  weight={marcado ? 700 : 600}
                  color="mute"
                  style={marcado ? { color: BRAND.black } : undefined}
                >
                  {INICIAIS[dia]}
                </Text>
              </View>
            </PressableEscala>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: SPACING.md },
  trilha: { flexDirection: "row", padding: 3, borderRadius: RADIUS.pill },
  atalho: {
    flex: 1,
    minWidth: 0,
    minHeight: SIZES.touchMin,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  linha: { flexDirection: "row", justifyContent: "space-between" },
  alvo: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    alignItems: "center",
    justifyContent: "center",
  },
  bolinha: { alignItems: "center", justifyContent: "center" },
});

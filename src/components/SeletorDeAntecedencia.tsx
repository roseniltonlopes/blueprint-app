import { StyleSheet, View } from "react-native";
import { opcoesDeAntecedencia, rotuloDaAntecedencia } from "../domain/alertas";
import { RADIUS, SIZES, SPACING } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { PressableEscala } from "../ui/PressableEscala";
import { Text } from "../ui/Text";

type SeletorDeAntecedenciaProps = {
  /** Minutos antes do início; undefined é "Sem aviso" */
  valor: number | undefined;
  aoMudar: (minutos: number | undefined) => void;
};

function rotuloAcessivel(minutos: number | undefined): string {
  if (minutos === undefined) return "Sem aviso";
  if (minutos === 0) return "Avisar na hora";
  return `Avisar ${rotuloDaAntecedencia(minutos)} antes`;
}

/** "Avisar antes" com um toque: Sem aviso, Na hora, 5, 10, 15, 30 min e 1 h. */
export default function SeletorDeAntecedencia({ valor, aoMudar }: SeletorDeAntecedenciaProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.bloco}>
      <Text variant="section">Avisar antes</Text>
      <View style={styles.opcoes} accessibilityRole="radiogroup" accessibilityLabel="Avisar antes">
        {opcoesDeAntecedencia(valor).map((minutos) => {
          const marcado = minutos === valor;
          return (
            <PressableEscala
              key={minutos ?? "sem"}
              accessibilityRole="radio"
              accessibilityLabel={rotuloAcessivel(minutos)}
              accessibilityState={{ selected: marcado }}
              onPress={() => aoMudar(minutos)}
              haptica={marcado ? undefined : "selecao"}
              style={[
                styles.opcao,
                marcado
                  ? { backgroundColor: colors.ink }
                  : { backgroundColor: colors.card, borderColor: colors.hair, borderWidth: 1 },
              ]}
            >
              <Text variant="caption" weight={600} color={marcado ? "onInk" : "ink"}>
                {rotuloDaAntecedencia(minutos)}
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
  opcoes: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  opcao: {
    minHeight: SIZES.touchMin,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});

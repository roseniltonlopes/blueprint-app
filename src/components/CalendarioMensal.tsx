import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { nivelDoCumprimento, type NivelDoCumprimento, type PlanoDoDia } from "../domain/calendario";
import { DIAS_ABREVIADOS, chaveDoDia, formatarDiaMes, gradeDoMes } from "../domain/datas";
import { plural } from "../domain/texto";
import { interpolarCor, textoSobre } from "../styles/cores";
import { BRAND, RADIUS, type ThemeColors } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { entradaDeCelula } from "../ui/motion";
import { Text } from "../ui/Text";

/** Quanto da cor do plano entra em cada nível (0 é o cartão sem cor). */
const MISTURA_POR_NIVEL: Record<NivelDoCumprimento, number> = {
  0: 0,
  1: 0.3,
  2: 0.55,
  3: 0.8,
  4: 1,
};

/** Fundo do dia: do cartão até o roxo da marca, uma cor só em intensidades diferentes. */
export function corDoNivel(colors: ThemeColors, nivel: NivelDoCumprimento): string {
  return interpolarCor(colors.card, colors.ramp[0], MISTURA_POR_NIVEL[nivel]);
}

function descricaoDoDia(data: Date, plano: PlanoDoDia | undefined, futuro: boolean): string {
  const dia = formatarDiaMes(data);
  if (plano === undefined) return `${dia}, sem compromissos`;
  if (futuro)
    return `${dia}, ${plural(plano.planejados, "compromisso planejado", "compromissos planejados")}`;
  return `${dia}, ${plano.feitos} de ${plano.planejados} feitos, ${plano.percentual ?? 0}%`;
}

type CalendarioMensalProps = {
  ano: number;
  mes: number;
  /** Plano de cada dia do mês (src/domain/calendario.ts) */
  planoPorDia: ReadonlyMap<string, PlanoDoDia>;
  hoje: Date;
  selecionado: Date;
  aoSelecionar: (dia: Date) => void;
};

/**
 * Grade mensal ligada à Agenda (docs/05 F11). Todos os dias do mês usam o mesmo cartão. Nos dias
 * que já chegaram, a cor mostra quanto do plano foi cumprido. Um ponto marca o dia com
 * compromissos e nada feito ainda (dia futuro ou 0%). Hoje tem contorno laranja; o dia escolhido, contorno escuro.
 */
export default function CalendarioMensal({
  ano,
  mes,
  planoPorDia,
  hoje,
  selecionado,
  aoSelecionar,
}: CalendarioMensalProps) {
  const { colors } = useTheme();
  const chaveHoje = chaveDoDia(hoje);
  const chaveSelecionado = chaveDoDia(selecionado);
  const semanas = gradeDoMes(ano, mes);

  return (
    <View>
      <View style={styles.linha}>
        {DIAS_ABREVIADOS.map((dia) => (
          <Text key={dia} variant="caption" color="mute" style={styles.cabecalho}>
            {dia}
          </Text>
        ))}
      </View>

      <View style={styles.grade}>
        {semanas.map((semana, linha) => (
          <View key={chaveDoDia(semana[0].data)} style={styles.linha}>
            {semana.map(({ data, doMes }, coluna) => {
              const chave = chaveDoDia(data);
              if (!doMes) return <View key={chave} style={styles.celula} />;

              const plano = planoPorDia.get(chave);
              const ehHoje = chave === chaveHoje;
              const ehSelecionado = chave === chaveSelecionado;
              const futuro = chave > chaveHoje;
              const nivel = futuro ? 0 : nivelDoCumprimento(plano?.percentual ?? null);
              const fundo = corDoNivel(colors, nivel);
              const corDoNumero =
                nivel === 0 ? colors.ink : textoSobre(fundo, BRAND.white, BRAND.black);
              const contorno = ehSelecionado ? colors.ink : ehHoje ? colors.accent : colors.hair;

              return (
                <Animated.View
                  key={chave}
                  entering={entradaDeCelula(100 + coluna * 35 + linha * 20)}
                  style={styles.celula}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${ehHoje ? "Hoje, " : ""}${descricaoDoDia(data, plano, futuro)}`}
                    accessibilityState={{ selected: ehSelecionado }}
                    onPress={() => aoSelecionar(data)}
                    testID={`dia-${chave}`}
                    style={[
                      styles.dia,
                      {
                        backgroundColor: fundo,
                        borderColor: contorno,
                        borderWidth: ehSelecionado || ehHoje ? 2 : 1,
                      },
                    ]}
                  >
                    <Text
                      variant="body"
                      weight={ehHoje || ehSelecionado ? 700 : 500}
                      style={[styles.numero, { color: corDoNumero }]}
                    >
                      {data.getDate()}
                    </Text>
                    {plano !== undefined && nivel === 0 ? (
                      <View style={[styles.ponto, { backgroundColor: colors.ramp[0] }]} />
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

/** "0% ▢▢▢▢▢ 100%" com a mesma cor dos dias e o ponto dos dias planejados. */
export function LegendaDoCumprimento() {
  const { colors } = useTheme();
  const niveis: NivelDoCumprimento[] = [0, 1, 2, 3, 4];
  return (
    <View
      style={styles.legenda}
      accessible
      accessibilityLabel="Legenda: a cor do dia vai de 0% a 100% do planejado cumprido; o ponto marca dia com compromissos e nada feito ainda"
    >
      <View style={styles.legendaGrupo}>
        <View style={[styles.ponto, styles.pontoDaLegenda, { backgroundColor: colors.ramp[0] }]} />
        <Text variant="caption" color="mute">
          planejado
        </Text>
      </View>
      <View style={styles.legendaGrupo}>
        <Text variant="caption" color="mute">
          0%
        </Text>
        <View style={styles.amostras}>
          {niveis.map((nivel) => (
            <View
              key={nivel}
              style={[
                styles.amostra,
                { backgroundColor: corDoNivel(colors, nivel), borderColor: colors.hair },
              ]}
            />
          ))}
        </View>
        <Text variant="caption" color="mute">
          100%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", gap: 4 },
  grade: { marginTop: 4, gap: 4 },
  cabecalho: { flex: 1, textAlign: "center", lineHeight: 20 },
  celula: { flex: 1 },
  dia: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  numero: { fontSize: 14, lineHeight: 18 },
  ponto: {
    position: "absolute",
    bottom: 5,
    width: 5,
    height: 5,
    borderRadius: RADIUS.pill,
  },
  pontoDaLegenda: { position: "relative", bottom: 0 },
  legenda: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  legendaGrupo: { flexDirection: "row", alignItems: "center", gap: 5 },
  amostras: { flexDirection: "row", gap: 4, marginHorizontal: 2 },
  amostra: { width: 14, height: 14, borderRadius: 4, borderWidth: 1 },
});

import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import {
  DIAS_ABREVIADOS,
  chaveDoDia,
  formatarDiaMes,
  gradeDoMes,
  inicioDoDia,
} from "../domain/datas";
import { nivelDeIntensidade } from "../domain/estatisticas";
import { plural } from "../domain/texto";
import { textoSobre } from "../styles/cores";
import { BRAND, RADIUS } from "../styles/theme";
import { useTheme } from "../theme/ThemeProvider";
import { entradaDeCelula } from "../ui/motion";
import { Text } from "../ui/Text";

type CalendarioMensalProps = {
  ano: number;
  mes: number;
  porDia: ReadonlyMap<string, number>;
  hoje: Date;
  selecionado: Date;
  aoSelecionar: (dia: Date) => void;
};

/**
 * Grade mensal (docs/03 tela 6; docs/05 F11). Cada dia com registro é pintado com a rampa do
 * gradiente pela intensidade; o número troca de cor para manter 4,5:1 sobre o fundo.
 * Hoje leva um ponto embaixo do número; o dia escolhido ganha um anel.
 */
export default function CalendarioMensal({
  ano,
  mes,
  porDia,
  hoje,
  selecionado,
  aoSelecionar,
}: CalendarioMensalProps) {
  const { colors } = useTheme();
  const chaveHoje = chaveDoDia(hoje);
  const chaveSelecionado = chaveDoDia(selecionado);
  const inicioHoje = inicioDoDia(hoje).getTime();
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
              const total = porDia.get(chave) ?? 0;
              const ehHoje = chave === chaveHoje;
              const ehSelecionado = chave === chaveSelecionado;
              const futuro = data.getTime() > inicioHoje;
              const nivel = nivelDeIntensidade(total);
              const pintado = doMes && !futuro && nivel > 0;
              const fundo = pintado ? colors.ramp[nivel - 1] : null;
              const corDoNumero = fundo ? textoSobre(fundo, BRAND.white, BRAND.black) : null;

              return (
                <Animated.View
                  key={chave}
                  entering={entradaDeCelula(100 + coluna * 35 + linha * 20)}
                  style={styles.celula}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${ehHoje ? "Hoje, " : ""}${
                      total > 0
                        ? `${formatarDiaMes(data)}, ${plural(total, "ação", "ações")}`
                        : formatarDiaMes(data)
                    }`}
                    accessibilityState={{ selected: ehSelecionado }}
                    onPress={() => aoSelecionar(data)}
                    style={[
                      styles.dia,
                      fundo
                        ? { backgroundColor: fundo }
                        : doMes && !futuro && { backgroundColor: colors.card },
                      ehSelecionado && {
                        borderWidth: 2,
                        borderColor: colors.ink,
                      },
                    ]}
                  >
                    <Text
                      variant="body"
                      weight={ehHoje || ehSelecionado ? 700 : pintado ? 600 : 500}
                      color={doMes ? "ink" : "placeholder"}
                      style={[styles.numero, corDoNumero ? { color: corDoNumero } : null]}
                    >
                      {data.getDate()}
                    </Text>
                    {ehHoje ? (
                      <View
                        style={[styles.ponto, { backgroundColor: corDoNumero ?? colors.accent }]}
                      />
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

const styles = StyleSheet.create({
  linha: { flexDirection: "row", gap: 4 },
  grade: { marginTop: 4, gap: 4 },
  cabecalho: { flex: 1, textAlign: "center", lineHeight: 20 },
  celula: { flex: 1 },
  dia: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  numero: { fontSize: 15, lineHeight: 20 },
  ponto: {
    position: "absolute",
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: RADIUS.pill,
  },
});
